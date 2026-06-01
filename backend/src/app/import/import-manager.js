// Contopia — Import Manager (orchestrates TXT import pipeline)
import pino from 'pino';
import { validateImportFile, sanitizeTxtContent } from './import-validator.js';
import { parseTxtBuffer } from './txt-parser.js';
import { createBook, createChapter, pushChapterIdToBook, createActivityLog } from '../book/book-dao.js';

const logger = pino({ name: 'import-manager', level: process.env.LOG_LEVEL || 'info' });

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