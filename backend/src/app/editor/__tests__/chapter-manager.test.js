// Contopia — Chapter Manager Unit Tests (STORY-017 + STORY-018)
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Book, Chapter } from '../../book/book-model.js';
import {
  createChapterManager,
  deleteChapterManager,
  reorderChaptersManager,
  updateChapterManager,
} from '../chapter-manager.js';

// ── Mocks (must be before all imports that use pino) ─────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// ── Imports ──────────────────────────────────────────────────────────────────
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const CHILD_ID = new mongoose.Types.ObjectId();
const OTHER_CHILD_ID = new mongoose.Types.ObjectId();

async function createTestBook(authorId = CHILD_ID, overrides = {}) {
  return Book.create({
    authorId,
    title: 'Test Book',
    language: 'en',
    chapterIds: [],
    ...overrides,
  });
}

async function createTestChapter(bookId, order, title = `Chapter ${order}`) {
  const chapter = await Chapter.create({
    bookId,
    order,
    title,
    content: '',
  });
  return chapter;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('createChapterManager', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterAll(async () => { await disconnectTestDb(); });
  beforeEach(async () => { await clearCollections(); });

  it('creates first chapter with default title and order 0', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createChapterManager(CHILD_ID.toString(), book._id.toString(), {});

    expect(chapter.title).toBe('Chapter 1');
    expect(chapter.order).toBe(0);
    expect(chapter.bookId.toString()).toBe(book._id.toString());
    expect(chapter.content).toBe('');

    // Verify chapter was added to book.chapterIds
    const updatedBook = await Book.findById(book._id).lean();
    expect(updatedBook.chapterIds.map((id) => id.toString())).toContain(chapter._id.toString());
  });

  it('creates chapter with Portuguese default title when book language starts with pt', async () => {
    const book = await createTestBook(CHILD_ID, { language: 'pt-BR' });
    const chapter = await createChapterManager(CHILD_ID.toString(), book._id.toString(), {});

    expect(chapter.title).toBe('Capítulo 1');
  });

  it('creates subsequent chapters with incremented order', async () => {
    const book = await createTestBook(CHILD_ID);
    await createChapterManager(CHILD_ID.toString(), book._id.toString(), {});
    const chapter2 = await createChapterManager(CHILD_ID.toString(), book._id.toString(), {});

    expect(chapter2.order).toBe(100);
    expect(chapter2.title).toBe('Chapter 2');
  });

  it('creates chapter with custom title when provided', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createChapterManager(CHILD_ID.toString(), book._id.toString(), {
      title: 'My Custom Title',
    });

    expect(chapter.title).toBe('My Custom Title');
  });

  it('returns 403 when author is not the book owner', async () => {
    const book = await createTestBook(CHILD_ID);
    await expect(
      createChapterManager(OTHER_CHILD_ID.toString(), book._id.toString(), {}),
    ).rejects.toThrow("That doesn't belong to you");

    try {
      await createChapterManager(OTHER_CHILD_ID.toString(), book._id.toString(), {});
    } catch (err) {
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    }
  });

  it('returns 404 when book does not exist', async () => {
    const fakeBookId = new mongoose.Types.ObjectId().toString();
    await expect(
      createChapterManager(CHILD_ID.toString(), fakeBookId, {}),
    ).rejects.toThrow("We couldn't find that book");

    try {
      await createChapterManager(CHILD_ID.toString(), fakeBookId, {});
    } catch (err) {
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    }
  });

  it('returns 409 when 50 chapters already exist', async () => {
    const book = await createTestBook(CHILD_ID);
    // Create 50 chapters
    for (let i = 0; i < 50; i++) {
      const ch = await Chapter.create({ bookId: book._id, order: i * 100, title: `Ch ${i + 1}` });
      book.chapterIds.push(ch._id);
    }
    await book.save();

    await expect(
      createChapterManager(CHILD_ID.toString(), book._id.toString(), {}),
    ).rejects.toThrow("You've reached the maximum number of chapters for this book");

    try {
      await createChapterManager(CHILD_ID.toString(), book._id.toString(), {});
    } catch (err) {
      expect(err.status).toBe(409);
      expect(err.code).toBe('CHAPTER_LIMIT_REACHED');
    }
  });
});

describe('updateChapterManager (STORY-018)', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterAll(async () => { await disconnectTestDb(); });
  beforeEach(async () => { await clearCollections(); });

  it('computes wordCount=2 from HTML content "<p>Hello world</p>"', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(chapter._id);
    await book.save();

    const updated = await updateChapterManager(
      CHILD_ID.toString(), chapter._id.toString(), { content: '<p>Hello world</p>' },
    );
    expect(updated.wordCount).toBe(2);
    expect(updated.content).toBe('<p>Hello world</p>');
  });

  it('computes wordCount correctly from multi-paragraph HTML', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(chapter._id);
    await book.save();

    const html = '<p>Hello world</p><p>Second paragraph here</p>';
    const updated = await updateChapterManager(
      CHILD_ID.toString(), chapter._id.toString(), { content: html },
    );
    // "Hello world Second paragraph here" = 5 words
    expect(updated.wordCount).toBe(5);
  });

  it('strips script tags before persisting and computes wordCount from clean content', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(chapter._id);
    await book.save();

    const malicious = '<script>alert(1)</script><p>Hello</p>';
    const updated = await updateChapterManager(
      CHILD_ID.toString(), chapter._id.toString(), { content: malicious },
    );
    expect(updated.content).toBe('<p>Hello</p>');
    expect(updated.wordCount).toBe(1);
  });

  it('strips img with onerror and returns empty content with wordCount=0', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(chapter._id);
    await book.save();

    const malicious = '<img src=x onerror=alert(1)>';
    const updated = await updateChapterManager(
      CHILD_ID.toString(), chapter._id.toString(), { content: malicious },
    );
    expect(updated.content).toBe('');
    expect(updated.wordCount).toBe(0);
  });

  it('sanitizes content with disallowed tags but preserves text', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(chapter._id);
    await book.save();

    const input = '<div><p>Safe content</p></div><script>evil()</script>';
    const updated = await updateChapterManager(
      CHILD_ID.toString(), chapter._id.toString(), { content: input },
    );
    expect(updated.content).toBe('<p>Safe content</p>');
    expect(updated.wordCount).toBe(2);
  });

  it('returns wordCount=0 for empty content', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(chapter._id);
    await book.save();

    const updated = await updateChapterManager(
      CHILD_ID.toString(), chapter._id.toString(), { content: '' },
    );
    expect(updated.wordCount).toBe(0);
    expect(updated.content).toBe('');
  });

  it('does not alter content when updates object has no content field', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(chapter._id);
    await book.save();

    const updated = await updateChapterManager(
      CHILD_ID.toString(), chapter._id.toString(), { title: 'New Title' },
    );
    expect(updated.title).toBe('New Title');
    expect(updated.content).toBe('');
    expect(updated.wordCount).toBe(0);
  });

  it('returns 403 when author is not the book owner', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(chapter._id);
    await book.save();

    await expect(
      updateChapterManager(OTHER_CHILD_ID.toString(), chapter._id.toString(), { content: '<p>Hi</p>' }),
    ).rejects.toThrow("That doesn't belong to you");

    try {
      await updateChapterManager(OTHER_CHILD_ID.toString(), chapter._id.toString(), { content: '<p>Hi</p>' });
    } catch (err) {
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    }
  });

  it('returns 404 when chapter does not exist', async () => {
    const book = await createTestBook(CHILD_ID);
    const fakeChapterId = new mongoose.Types.ObjectId().toString();

    await expect(
      updateChapterManager(CHILD_ID.toString(), fakeChapterId, { content: '<p>Hi</p>' }),
    ).rejects.toThrow("We couldn't find that chapter");

    try {
      await updateChapterManager(CHILD_ID.toString(), fakeChapterId, { content: '<p>Hi</p>' });
    } catch (err) {
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    }
  });
});

describe('deleteChapterManager', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterAll(async () => { await disconnectTestDb(); });
  beforeEach(async () => { await clearCollections(); });

  it('soft-deletes a chapter and re-orders remaining chapters', async () => {
    const book = await createTestBook(CHILD_ID);
    const ch1 = await createTestChapter(book._id, 0, 'Chapter 1');
    const ch2 = await createTestChapter(book._id, 100, 'Chapter 2');
    const ch3 = await createTestChapter(book._id, 200, 'Chapter 3');
    book.chapterIds.push(ch1._id, ch2._id, ch3._id);
    await book.save();

    const result = await deleteChapterManager(CHILD_ID.toString(), book._id.toString(), ch2._id.toString());

    expect(result).toEqual({ deleted: true });

    // Verify chapter is soft-deleted
    const deletedChapter = await Chapter.findById(ch2._id).lean();
    expect(deletedChapter.deletedAt).not.toBeNull();

    // Verify remaining chapters are re-ordered with gap
    const remaining = await Chapter.find({ bookId: book._id, deletedAt: null }).sort({ order: 1 }).lean();
    expect(remaining).toHaveLength(2);
    expect(remaining[0].order).toBe(0);
    expect(remaining[1].order).toBe(100);

    // Verify book.chapterIds no longer contains deleted chapter
    const updatedBook = await Book.findById(book._id).lean();
    expect(updatedBook.chapterIds.map((id) => id.toString())).not.toContain(ch2._id.toString());
  });

  it('returns 403 when author is not the book owner', async () => {
    const book = await createTestBook(CHILD_ID);
    const ch = await createTestChapter(book._id, 0, 'Chapter 1');
    book.chapterIds.push(ch._id);
    await book.save();

    await expect(
      deleteChapterManager(OTHER_CHILD_ID.toString(), book._id.toString(), ch._id.toString()),
    ).rejects.toThrow("That doesn't belong to you");

    try {
      await deleteChapterManager(OTHER_CHILD_ID.toString(), book._id.toString(), ch._id.toString());
    } catch (err) {
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    }
  });

  it('returns 404 when book does not exist', async () => {
    const fakeBookId = new mongoose.Types.ObjectId().toString();
    const fakeChapterId = new mongoose.Types.ObjectId().toString();

    await expect(
      deleteChapterManager(CHILD_ID.toString(), fakeBookId, fakeChapterId),
    ).rejects.toThrow("We couldn't find that book");

    try {
      await deleteChapterManager(CHILD_ID.toString(), fakeBookId, fakeChapterId);
    } catch (err) {
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    }
  });

  it('returns 404 when chapter does not exist', async () => {
    const book = await createTestBook(CHILD_ID);
    const fakeChapterId = new mongoose.Types.ObjectId().toString();

    await expect(
      deleteChapterManager(CHILD_ID.toString(), book._id.toString(), fakeChapterId),
    ).rejects.toThrow("We couldn't find that chapter");

    try {
      await deleteChapterManager(CHILD_ID.toString(), book._id.toString(), fakeChapterId);
    } catch (err) {
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    }
  });

  it('returns 400 when chapter does not belong to the book', async () => {
    const book1 = await createTestBook(CHILD_ID);
    const book2 = await createTestBook(CHILD_ID);
    const ch = await createTestChapter(book2._id, 0, 'Other Chapter');
    book2.chapterIds.push(ch._id);
    await book2.save();

    await expect(
      deleteChapterManager(CHILD_ID.toString(), book1._id.toString(), ch._id.toString()),
    ).rejects.toThrow("That chapter doesn't belong to this book");

    try {
      await deleteChapterManager(CHILD_ID.toString(), book1._id.toString(), ch._id.toString());
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
    }
  });

  it('handles deleting the only chapter', async () => {
    const book = await createTestBook(CHILD_ID);
    const ch = await createTestChapter(book._id, 0, 'Only Chapter');
    book.chapterIds.push(ch._id);
    await book.save();

    const result = await deleteChapterManager(CHILD_ID.toString(), book._id.toString(), ch._id.toString());
    expect(result).toEqual({ deleted: true });

    // Verify no active chapters remain
    const remaining = await Chapter.find({ bookId: book._id, deletedAt: null }).lean();
    expect(remaining).toHaveLength(0);

    // Verify book.chapterIds is empty
    const updatedBook = await Book.findById(book._id).lean();
    expect(updatedBook.chapterIds).toHaveLength(0);
  });
});

describe('reorderChaptersManager', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterAll(async () => { await disconnectTestDb(); });
  beforeEach(async () => { await clearCollections(); });

  it('reorders chapters with new order values', async () => {
    const book = await createTestBook(CHILD_ID);
    const ch1 = await createTestChapter(book._id, 0, 'Chapter 1');
    const ch2 = await createTestChapter(book._id, 100, 'Chapter 2');
    const ch3 = await createTestChapter(book._id, 200, 'Chapter 3');
    book.chapterIds.push(ch1._id, ch2._id, ch3._id);
    await book.save();

    const result = await reorderChaptersManager(CHILD_ID.toString(), book._id.toString(), [
      { id: ch3._id.toString(), order: 0 },
      { id: ch1._id.toString(), order: 100 },
      { id: ch2._id.toString(), order: 200 },
    ]);

    // Result should be sorted by order
    expect(result).toHaveLength(3);
    expect(result[0]._id.toString()).toBe(ch3._id.toString());
    expect(result[0].order).toBe(0);
    expect(result[1]._id.toString()).toBe(ch1._id.toString());
    expect(result[1].order).toBe(100);

    // Verify book.chapterIds is updated to new order
    const updatedBook = await Book.findById(book._id).lean();
    expect(updatedBook.chapterIds[0].toString()).toBe(ch3._id.toString());
  });

  it('returns 403 when author is not the book owner', async () => {
    const book = await createTestBook(CHILD_ID);
    await createTestChapter(book._id, 0, 'Chapter 1');

    await expect(
      reorderChaptersManager(OTHER_CHILD_ID.toString(), book._id.toString(), []),
    ).rejects.toThrow("That doesn't belong to you");

    try {
      await reorderChaptersManager(OTHER_CHILD_ID.toString(), book._id.toString(), []);
    } catch (err) {
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    }
  });

  it('returns 404 when book does not exist', async () => {
    const fakeBookId = new mongoose.Types.ObjectId().toString();

    await expect(
      reorderChaptersManager(CHILD_ID.toString(), fakeBookId, []),
    ).rejects.toThrow("We couldn't find that book");

    try {
      await reorderChaptersManager(CHILD_ID.toString(), fakeBookId, []);
    } catch (err) {
      expect(err.status).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    }
  });

  it('returns 400 when request count does not match active chapters count', async () => {
    const book = await createTestBook(CHILD_ID);
    const ch1 = await createTestChapter(book._id, 0, 'Chapter 1');
    await createTestChapter(book._id, 100, 'Chapter 2');

    // Only send 1 chapter but book has 2
    await expect(
      reorderChaptersManager(CHILD_ID.toString(), book._id.toString(), [
        { id: ch1._id.toString(), order: 0 },
      ]),
    ).rejects.toThrow('Chapter count mismatch');

    try {
      await reorderChaptersManager(CHILD_ID.toString(), book._id.toString(), [
        { id: ch1._id.toString(), order: 0 },
      ]);
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
    }
  });

  it('returns 409 REORDER_MISMATCH when chapter IDs do not belong to book', async () => {
    const book = await createTestBook(CHILD_ID);
    const ch1 = await createTestChapter(book._id, 0, 'Chapter 1');
    await createTestChapter(book._id, 100, 'Chapter 2');
    const fakeChapterId = new mongoose.Types.ObjectId().toString();

    // Send 2 items (same count as active chapters) but one is a fake ID
    await expect(
      reorderChaptersManager(CHILD_ID.toString(), book._id.toString(), [
        { id: ch1._id.toString(), order: 0 },
        { id: fakeChapterId, order: 100 },
      ]),
    ).rejects.toThrow("Chapter IDs don't match this book's chapters");

    try {
      await reorderChaptersManager(CHILD_ID.toString(), book._id.toString(), [
        { id: ch1._id.toString(), order: 0 },
        { id: fakeChapterId, order: 100 },
      ]);
    } catch (err) {
      expect(err.status).toBe(409);
      expect(err.code).toBe('REORDER_MISMATCH');
    }
  });
});