// Contopia — Import Manager Unit Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ── Mock DAO module before import ──────────────────────────────────────
vi.mock('../../book/book-dao.js', () => ({
  createBook: vi.fn(),
  createChapter: vi.fn(),
  pushChapterIdToBook: vi.fn(),
  createActivityLog: vi.fn().mockReturnValue(Promise.resolve()),
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { importTxtBookManager } from '../import-manager.js';
import * as bookDao from '../../book/book-dao.js';

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