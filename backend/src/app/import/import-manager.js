// Contopia — Import Manager (orchestrates TXT + PDF import pipelines)
import mongoose from 'mongoose';
import pino from 'pino';
import sharp from 'sharp';
import { validateImportFile, sanitizeTxtContent } from './import-validator.js';
import { parseTxtBuffer } from './txt-parser.js';
import { extractPdfContent, renderPdfThumbnail } from './pdf-parser.js';
import { createBook, createChapter, pushChapterIdToBook, createActivityLog, updateBookById, findBookById } from '../book/book-dao.js';
import * as storageService from '../storage/storage-service.js';
import * as storageDao from '../storage/storage-dao.js';

const logger = pino({ name: 'import-manager', level: process.env.LOG_LEVEL || 'info' });

const COVER_WIDTH = 200;
const COVER_HEIGHT = 280;

/**
 * Import a TXT file as a new Book.
 * Pipeline: validate → sanitize → parse → createBook → createChapter → pushChapterId → auditLog
 * @param {{ authorId: string, file: object }} params
 * @returns {Promise<{ book: object, chapter: object }>}
 */
export async function importTxtBookManager({ authorId, file }) {
  // 1. Validate file
  const validation = validateImportFile(file, 'txt');
  if (!validation.valid) {
    const err = new Error(validation.error.message);
    err.code = validation.error.code;
    err.status = validation.error.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
    throw err;
  }

  // 2. Sanitize content
  const sanitizedText = sanitizeTxtContent(file.buffer);

  // 3. Parse content
  const { title, paragraphs } = parseTxtBuffer(Buffer.from(sanitizedText, 'utf-8'), file.originalname);

  if (paragraphs.length === 0) {
    const err = new Error('The file appears to be empty');
    err.code = 'INVALID_FILE_TYPE';
    err.status = 400;
    throw err;
  }

  // 4. Create Book entity
  const book = await createBook({
    authorId,
    title,
    source: 'imported',
    importFormat: 'txt',
    isEditable: false,
  });

  // 5. Create single Chapter with imported content
  const content = paragraphs.join('\n\n');
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const chapter = await createChapter({
    bookId: book._id,
    title: 'Imported Content',
    content,
    wordCount,
    order: 0,
  });

  // 6. Link chapter to book
  await pushChapterIdToBook(book._id, chapter._id);

  // 7. Audit log (fire-and-forget)
  createActivityLog({
    actorId: authorId,
    actorType: 'child',
    action: 'book.import_txt',
    targetId: book._id,
    targetType: 'book',
    metadata: { importFormat: 'txt', originalFilename: file.originalname },
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action book.import_txt');
  });

  logger.info({ bookId: book._id, authorId, importFormat: 'txt' }, 'TXT book imported');
  return { book, chapter };
}

/**
 * Import a PDF file as a new Book.
 * Pipeline: validate → extract text/metadata → detect scanned → sanitize → createBook
 *           → createChapter → render thumbnail → upload cover → auditLog
 * @param {{ authorId: string, file: object }} params
 * @returns {Promise<{ book: object, chapter: object }>}
 */
export async function importPdfBookManager({ authorId, file }) {
  // 1. Validate file
  const validation = validateImportFile(file, 'pdf');
  if (!validation.valid) {
    const err = new Error(validation.error.message);
    err.code = validation.error.code;
    err.status = validation.error.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
    throw err;
  }

  // 2. Extract text and metadata from PDF
  const pdfContent = await extractPdfContent(file.buffer);

  // 3. If scanned PDF, throw friendly error
  if (pdfContent.isScanned) {
    const err = new Error('This PDF has no text to read. It might be a scanned image. Try a text-based PDF!');
    err.code = 'SCANNED_PDF';
    err.status = 422;
    throw err;
  }

  // 4. Sanitize extracted text
  const sanitizedText = sanitizeTxtContent(Buffer.from(pdfContent.text, 'utf-8'));

  // 5. Determine title: PDF metadata → filename (strip .pdf)
  const title = pdfContent.title?.trim() || extractPdfTitle(file.originalname);

  // 6. Split text into paragraphs by double newline
  const paragraphs = sanitizedText
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    const err = new Error('The file appears to be empty');
    err.code = 'INVALID_FILE_TYPE';
    err.status = 400;
    throw err;
  }

  // 7. Create Book entity
  const book = await createBook({
    authorId,
    title,
    source: 'imported',
    importFormat: 'pdf',
    isEditable: false,
  });

  // 8. Create single Chapter with extracted text
  const content = paragraphs.join('\n\n');
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const chapter = await createChapter({
    bookId: book._id,
    title: 'Imported Content',
    content,
    wordCount,
    order: 0,
  });

  // 9. Link chapter to book
  await pushChapterIdToBook(book._id, chapter._id);

  // 10. Render first page as thumbnail and upload as cover
  try {
    const thumbnailResult = await renderPdfThumbnail(file.buffer);

    // Resize to exact cover dimensions via sharp
    const coverBuffer = await sharp(thumbnailResult.buffer)
      .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    // Upload to S3
    const tempAssetId = new mongoose.Types.ObjectId();
    const storagePath = `users/${authorId}/books/${book._id}/covers/${tempAssetId}.png`;

    await storageService.putObject(storagePath, coverBuffer, 'image/png');

    // Create Asset record
    const assetRecord = await storageDao.createAssetRecord({
      bookId: book._id,
      authorId,
      url: storagePath,
      type: 'cover',
      mimeType: 'image/png',
      sizeBytes: coverBuffer.length,
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
    });

    // Link cover asset to book
    await updateBookById(book._id, { coverAssetId: assetRecord._id });

    logger.info({ bookId: book._id, assetId: assetRecord._id }, 'PDF cover thumbnail uploaded');
  } catch (err) {
    // Cover generation is best-effort — log and continue without cover
    logger.warn({ err, bookId: book._id }, 'Failed to generate PDF cover thumbnail — continuing without cover');
  }

  // 11. Audit log (fire-and-forget)
  createActivityLog({
    actorId: authorId,
    actorType: 'child',
    action: 'book.import_pdf',
    targetId: book._id,
    targetType: 'book',
    metadata: { importFormat: 'pdf', originalFilename: file.originalname, numPages: pdfContent.numPages },
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action book.import_pdf');
  });

  logger.info({ bookId: book._id, authorId, importFormat: 'pdf' }, 'PDF book imported');

  // Return fresh book data (may include coverAssetId from update)
  const freshBook = await findBookById(book._id);
  return { book: freshBook || book, chapter };
}

/**
 * Extract a clean title from a PDF filename.
 * @param {string} filename
 * @returns {string}
 */
function extractPdfTitle(filename) {
  if (!filename) return 'Untitled';
  const name = filename.replace(/\.pdf$/i, '').trim();
  const sanitized = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  return sanitized || 'Untitled';
}