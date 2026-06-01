// Contopia — Import Manager Unit Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ── Mock DAO module before import ──────────────────────────────────────
vi.mock('../../book/book-dao.js', () => ({
  createBook: vi.fn(),
  createChapter: vi.fn(),
  pushChapterIdToBook: vi.fn(),
  createActivityLog: vi.fn().mockReturnValue(Promise.resolve()),
  updateBookById: vi.fn(),
  findBookById: vi.fn(),
}));

vi.mock('../../storage/storage-service.js', () => ({
  putObject: vi.fn().mockResolvedValue(undefined),
  getSignedUrl: vi.fn().mockResolvedValue('https://fake-s3.url/cover.png'),
}));

vi.mock('../../storage/storage-dao.js', () => ({
  createAssetRecord: vi.fn().mockResolvedValue({ _id: 'asset-mock-id' }),
}));

vi.mock('../pdf-parser.js', () => ({
  extractPdfContent: vi.fn(),
  renderPdfThumbnail: vi.fn(),
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn(() => ({ png: vi.fn(() => ({ toBuffer: vi.fn(() => Promise.resolve(Buffer.from('resized-png'))) })) })),
  })),
}));

import { importTxtBookManager, importPdfBookManager } from '../import-manager.js';
import * as bookDao from '../../book/book-dao.js';
import * as storageService from '../../storage/storage-service.js';
import * as storageDao from '../../storage/storage-dao.js';
import { extractPdfContent, renderPdfThumbnail } from '../pdf-parser.js';

const AUTHOR_ID = new mongoose.Types.ObjectId().toString();

// Helper: create a valid TXT multer file object
function makeTxtFile(content, filename = 'test-story.txt') {
  const buffer = Buffer.from(content);
  return {
    mimetype: 'text/plain',
    size: buffer.length,
    buffer,
    originalname: filename,
  };
}

// Helper: create a valid PDF multer file object
function makePdfFile(content = '%PDF-1.4 fake pdf', filename = 'test-book.pdf') {
  const buffer = Buffer.from(content);
  return {
    mimetype: 'application/pdf',
    size: buffer.length,
    buffer,
    originalname: filename,
  };
}

describe('Import Manager — importTxtBookManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Valid TXT import → book created with source='imported', isEditable=false
  it('should create book with source=imported and isEditable=false', async () => {
    const file = makeTxtFile('Hello world\n\nSecond paragraph');
    const mockBook = { _id: 'book1', title: 'test-story', source: 'imported', importFormat: 'txt', isEditable: false };
    const mockChapter = { _id: 'ch1', bookId: 'book1', title: 'Imported Content', order: 0 };

    bookDao.createBook.mockResolvedValue(mockBook);
    bookDao.createChapter.mockResolvedValue(mockChapter);
    bookDao.pushChapterIdToBook.mockResolvedValue({ ...mockBook, chapterIds: ['ch1'] });

    const result = await importTxtBookManager({ authorId: AUTHOR_ID, file });

    expect(bookDao.createBook).toHaveBeenCalledWith({
      authorId: AUTHOR_ID,
      title: 'test-story',
      source: 'imported',
      importFormat: 'txt',
      isEditable: false,
    });
    expect(result.book).toEqual(mockBook);
    expect(result.chapter).toEqual(mockChapter);
  });

  // ── 2. Book title derived from filename (stripped .txt)
  it('should derive title from filename', async () => {
    const file = makeTxtFile('Content here', 'my-dragon-story.txt');
    bookDao.createBook.mockResolvedValue({ _id: 'book1', title: 'my-dragon-story' });
    bookDao.createChapter.mockResolvedValue({ _id: 'ch1' });
    bookDao.pushChapterIdToBook.mockResolvedValue({});

    await importTxtBookManager({ authorId: AUTHOR_ID, file });

    expect(bookDao.createBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'my-dragon-story' }),
    );
  });

  // ── 3. Chapter created with paragraphs joined by \n\n
  it('should create chapter with paragraphs joined by double newline', async () => {
    const file = makeTxtFile('Para 1\n\nPara 2\n\nPara 3');
    bookDao.createBook.mockResolvedValue({ _id: 'book1', title: 'test' });
    bookDao.createChapter.mockResolvedValue({ _id: 'ch1' });
    bookDao.pushChapterIdToBook.mockResolvedValue({});

    await importTxtBookManager({ authorId: AUTHOR_ID, file });

    expect(bookDao.createChapter).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Para 1\n\nPara 2\n\nPara 3',
        wordCount: 6,
      }),
    );
  });

  // ── 4. Invalid file type → throws error with INVALID_FILE_TYPE code
  it('should throw INVALID_FILE_TYPE for wrong MIME type', async () => {
    const buffer = Buffer.from('PDF content');
    const file = { mimetype: 'application/pdf', size: buffer.length, buffer, originalname: 'test.pdf' };

    await expect(importTxtBookManager({ authorId: AUTHOR_ID, file })).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
      status: 400,
    });
  });

  // ── 5. File too large → throws error with PAYLOAD_TOO_LARGE code
  it('should throw PAYLOAD_TOO_LARGE for oversized file', async () => {
    const buffer = Buffer.from('x');
    const file = { mimetype: 'text/plain', size: 26 * 1024 * 1024, buffer, originalname: 'big.txt' };

    await expect(importTxtBookManager({ authorId: AUTHOR_ID, file })).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      status: 413,
    });
  });

  // ── 6. Audit log created on successful import
  it('should create activity log on successful import', async () => {
    const file = makeTxtFile('Hello world');
    bookDao.createBook.mockResolvedValue({ _id: 'book1', title: 'test' });
    bookDao.createChapter.mockResolvedValue({ _id: 'ch1' });
    bookDao.pushChapterIdToBook.mockResolvedValue({});
    bookDao.createActivityLog.mockReturnValue({ catch: vi.fn() });

    await importTxtBookManager({ authorId: AUTHOR_ID, file });

    expect(bookDao.createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: AUTHOR_ID,
        actorType: 'child',
        action: 'book.import_txt',
        targetType: 'book',
      }),
    );
  });

  // ── Additional: No file provided → NO_FILE error
  it('should throw NO_FILE error when no file provided', async () => {
    await expect(importTxtBookManager({ authorId: AUTHOR_ID, file: null })).rejects.toMatchObject({
      code: 'NO_FILE',
      status: 400,
    });
  });
});

describe('Import Manager — importPdfBookManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Valid PDF import → book created with source='imported', importFormat='pdf', isEditable=false
  it('should create book with source=imported, importFormat=pdf, isEditable=false', async () => {
    const file = makePdfFile();
    const mockBook = { _id: 'book1', title: 'test-book', source: 'imported', importFormat: 'pdf', isEditable: false };
    const mockChapter = { _id: 'ch1', bookId: 'book1', title: 'Imported Content', order: 0 };

    extractPdfContent.mockResolvedValue({
      text: 'Page one content\n\nPage two content',
      title: null,
      author: null,
      numPages: 2,
      isScanned: false,
    });

    renderPdfThumbnail.mockResolvedValue({
      buffer: Buffer.from('fake-png'),
      width: 200,
      height: 280,
    });

    bookDao.createBook.mockResolvedValue(mockBook);
    bookDao.createChapter.mockResolvedValue(mockChapter);
    bookDao.pushChapterIdToBook.mockResolvedValue({ ...mockBook, chapterIds: ['ch1'] });
    bookDao.updateBookById.mockResolvedValue({ ...mockBook, coverAssetId: 'asset-mock-id' });
    bookDao.findBookById.mockResolvedValue({ ...mockBook, coverAssetId: 'asset-mock-id' });
    storageService.putObject.mockResolvedValue(undefined);
    storageDao.createAssetRecord.mockResolvedValue({ _id: 'asset-mock-id' });

    const result = await importPdfBookManager({ authorId: AUTHOR_ID, file });

    expect(bookDao.createBook).toHaveBeenCalledWith({
      authorId: AUTHOR_ID,
      title: 'test-book',
      source: 'imported',
      importFormat: 'pdf',
      isEditable: false,
    });
    expect(result.book).toBeDefined();
    expect(result.chapter).toBeDefined();
  });

  // ── 2. PDF with metadata → title extracted from PDF metadata
  it('should use PDF metadata title when available', async () => {
    const file = makePdfFile('%PDF-1.4 content', 'filename.pdf');
    bookDao.createBook.mockResolvedValue({ _id: 'book1', title: 'PDF Title' });
    bookDao.createChapter.mockResolvedValue({ _id: 'ch1' });
    bookDao.pushChapterIdToBook.mockResolvedValue({});
    bookDao.updateBookById.mockResolvedValue({});
    bookDao.findBookById.mockResolvedValue({ _id: 'book1', title: 'PDF Title' });
    renderPdfThumbnail.mockResolvedValue({ buffer: Buffer.from('png'), width: 200, height: 280 });
    storageService.putObject.mockResolvedValue(undefined);
    storageDao.createAssetRecord.mockResolvedValue({ _id: 'asset-id' });

    extractPdfContent.mockResolvedValue({
      text: 'Some text content from the pdf document',
      title: 'PDF Title',
      author: 'Author Name',
      numPages: 5,
      isScanned: false,
    });

    await importPdfBookManager({ authorId: AUTHOR_ID, file });

    expect(bookDao.createBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'PDF Title' }),
    );
  });

  // ── 3. PDF without metadata → title from filename
  it('should fall back to filename when PDF has no metadata title', async () => {
    const file = makePdfFile('%PDF-1.4', 'my-awesome-book.pdf');
    bookDao.createBook.mockResolvedValue({ _id: 'book1', title: 'my-awesome-book' });
    bookDao.createChapter.mockResolvedValue({ _id: 'ch1' });
    bookDao.pushChapterIdToBook.mockResolvedValue({});
    bookDao.updateBookById.mockResolvedValue({});
    bookDao.findBookById.mockResolvedValue({ _id: 'book1', title: 'my-awesome-book' });
    renderPdfThumbnail.mockResolvedValue({ buffer: Buffer.from('png'), width: 200, height: 280 });
    storageService.putObject.mockResolvedValue(undefined);
    storageDao.createAssetRecord.mockResolvedValue({ _id: 'asset-id' });

    extractPdfContent.mockResolvedValue({
      text: 'Some text content from the pdf document',
      title: null,
      author: null,
      numPages: 5,
      isScanned: false,
    });

    await importPdfBookManager({ authorId: AUTHOR_ID, file });

    expect(bookDao.createBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'my-awesome-book' }),
    );
  });

  // ── 4. Scanned PDF → throws SCANNED_PDF error with 422 status
  it('should throw SCANNED_PDF error for scanned PDF', async () => {
    const file = makePdfFile();

    extractPdfContent.mockResolvedValue({
      text: '',
      title: null,
      author: null,
      numPages: 1,
      isScanned: true,
    });

    await expect(importPdfBookManager({ authorId: AUTHOR_ID, file })).rejects.toMatchObject({
      code: 'SCANNED_PDF',
      status: 422,
    });
  });

  // ── 5. Invalid file type (non-PDF MIME) → INVALID_FILE_TYPE
  it('should throw INVALID_FILE_TYPE for wrong MIME type', async () => {
    const buffer = Buffer.from('not a pdf');
    const file = { mimetype: 'text/plain', size: buffer.length, buffer, originalname: 'test.txt' };

    await expect(importPdfBookManager({ authorId: AUTHOR_ID, file })).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
      status: 400,
    });
  });

  // ── 6. PDF file too large → PAYLOAD_TOO_LARGE
  it('should throw PAYLOAD_TOO_LARGE for oversized PDF', async () => {
    const buffer = Buffer.from('%PDF-1.4');
    const file = { mimetype: 'application/pdf', size: 26 * 1024 * 1024, buffer, originalname: 'big.pdf' };

    await expect(importPdfBookManager({ authorId: AUTHOR_ID, file })).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      status: 413,
    });
  });

  // ── 7. Spoofed MIME (non-PDF content with application/pdf) → INVALID_FILE_TYPE
  it('should reject spoofed MIME (non-PDF content with application/pdf MIME)', async () => {
    const buffer = Buffer.from('not a real pdf file');
    const file = { mimetype: 'application/pdf', size: buffer.length, buffer, originalname: 'fake.pdf' };

    await expect(importPdfBookManager({ authorId: AUTHOR_ID, file })).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
      status: 400,
    });
  });

  // ── 8. Cover thumbnail uploaded and book coverAssetId updated
  it('should upload cover thumbnail and update book coverAssetId', async () => {
    const file = makePdfFile();
    const mockBook = { _id: 'book1', title: 'test-book', source: 'imported', importFormat: 'pdf', isEditable: false };

    extractPdfContent.mockResolvedValue({
      text: 'Valid PDF text content for extraction here',
      title: null,
      author: null,
      numPages: 1,
      isScanned: false,
    });

    renderPdfThumbnail.mockResolvedValue({
      buffer: Buffer.from('fake-png-data'),
      width: 200,
      height: 280,
    });

    bookDao.createBook.mockResolvedValue(mockBook);
    bookDao.createChapter.mockResolvedValue({ _id: 'ch1', bookId: 'book1' });
    bookDao.pushChapterIdToBook.mockResolvedValue({ ...mockBook, chapterIds: ['ch1'] });
    bookDao.updateBookById.mockResolvedValue({ ...mockBook, coverAssetId: 'asset-mock-id' });
    bookDao.findBookById.mockResolvedValue({ ...mockBook, coverAssetId: 'asset-mock-id' });
    storageService.putObject.mockResolvedValue(undefined);
    storageDao.createAssetRecord.mockResolvedValue({ _id: 'asset-mock-id' });

    const result = await importPdfBookManager({ authorId: AUTHOR_ID, file });

    // Should upload thumbnail to S3
    expect(storageService.putObject).toHaveBeenCalledWith(
      expect.stringContaining('covers/'),
      expect.any(Buffer),
      'image/png',
    );

    // Should create asset record
    expect(storageDao.createAssetRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cover',
        mimeType: 'image/png',
      }),
    );

    // Should update book with cover asset ID
    expect(bookDao.updateBookById).toHaveBeenCalledWith('book1', { coverAssetId: 'asset-mock-id' });
  });

  // ── 9. Cover generation failure → continues without cover (best-effort)
  it('should continue without cover if thumbnail generation fails', async () => {
    const file = makePdfFile();
    const mockBook = { _id: 'book1', title: 'test-book' };

    extractPdfContent.mockResolvedValue({
      text: 'Valid PDF text content for extraction here',
      title: null,
      author: null,
      numPages: 1,
      isScanned: false,
    });

    renderPdfThumbnail.mockRejectedValue(new Error('Canvas rendering failed'));

    bookDao.createBook.mockResolvedValue(mockBook);
    bookDao.createChapter.mockResolvedValue({ _id: 'ch1', bookId: 'book1' });
    bookDao.pushChapterIdToBook.mockResolvedValue({ ...mockBook, chapterIds: ['ch1'] });
    bookDao.findBookById.mockResolvedValue(mockBook);

    const result = await importPdfBookManager({ authorId: AUTHOR_ID, file });

    // Book should still be created even without cover
    expect(result.book).toBeDefined();
    expect(result.chapter).toBeDefined();
  });

  // ── 10. Audit log created for PDF import
  it('should create activity log for book.import_pdf', async () => {
    const file = makePdfFile();
    const mockBook = { _id: 'book1', title: 'test-book' };

    extractPdfContent.mockResolvedValue({
      text: 'Valid PDF text content for extraction here',
      title: null,
      author: null,
      numPages: 3,
      isScanned: false,
    });

    renderPdfThumbnail.mockResolvedValue({ buffer: Buffer.from('png'), width: 200, height: 280 });
    bookDao.createBook.mockResolvedValue(mockBook);
    bookDao.createChapter.mockResolvedValue({ _id: 'ch1' });
    bookDao.pushChapterIdToBook.mockResolvedValue({});
    bookDao.updateBookById.mockResolvedValue({});
    bookDao.findBookById.mockResolvedValue(mockBook);
    storageService.putObject.mockResolvedValue(undefined);
    storageDao.createAssetRecord.mockResolvedValue({ _id: 'asset-id' });

    await importPdfBookManager({ authorId: AUTHOR_ID, file });

    expect(bookDao.createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'book.import_pdf',
        targetType: 'book',
        actorType: 'child',
      }),
    );
  });
});