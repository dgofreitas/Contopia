// Contopia — Reader Manager Unit Tests
// STORY-034: Chapter Navigation
import { describe, it, expect, vi } from 'vitest';
import * as readerManager from '../reader-manager.js';

vi.mock('../../book/book-dao.js', () => ({
  findBookById: vi.fn(),
  findChaptersByBook: vi.fn(),
}));

// Dynamic import to get mocked module
const { findBookById, findChaptersByBook } = await import('../../book/book-dao.js');

describe('reader-manager — getChaptersForReading', () => {
  const bookId = '507f1f77bcf86cd799439011';
  const authorId = '507f1f77bcf86cd799439012';
  const otherChildId = '507f1f77bcf86cd799439013';
  const chapterId = '507f1f77bcf86cd799439014';

  const mockChapters = [
    { _id: chapterId, bookId, order: 1, title: 'Chapter 1', content: '...' },
    { _id: '507f1f77bcf86cd799439015', bookId, order: 2, title: 'Chapter 2', content: '...' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns chapters for a published book regardless of user', async () => {
    findBookById.mockResolvedValue({
      _id: bookId,
      authorId: authorId,
      status: 'published',
    });
    findChaptersByBook.mockResolvedValue(mockChapters);

    const result = await readerManager.getChaptersForReading(bookId, otherChildId);

    expect(result).toEqual(mockChapters);
    expect(findChaptersByBook).toHaveBeenCalledWith(bookId);
  });

  it('returns chapters for a published book with no authenticated user (childId null)', async () => {
    findBookById.mockResolvedValue({
      _id: bookId,
      authorId: authorId,
      status: 'published',
    });
    findChaptersByBook.mockResolvedValue(mockChapters);

    const result = await readerManager.getChaptersForReading(bookId, null);

    expect(result).toEqual(mockChapters);
    expect(findChaptersByBook).toHaveBeenCalledWith(bookId);
  });

  it('returns chapters for a draft book when the author requests it', async () => {
    findBookById.mockResolvedValue({
      _id: bookId,
      authorId: authorId,
      status: 'draft',
    });
    findChaptersByBook.mockResolvedValue(mockChapters);

    const result = await readerManager.getChaptersForReading(bookId, authorId);

    expect(result).toEqual(mockChapters);
    expect(findChaptersByBook).toHaveBeenCalledWith(bookId);
  });

  it('throws NOT_FOUND when book does not exist', async () => {
    findBookById.mockResolvedValue(null);

    await expect(readerManager.getChaptersForReading(bookId, otherChildId))
      .rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });

    expect(findChaptersByBook).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN when book is draft and user is not the author', async () => {
    findBookById.mockResolvedValue({
      _id: bookId,
      authorId: authorId,
      status: 'draft',
    });

    await expect(readerManager.getChaptersForReading(bookId, otherChildId))
      .rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });

    expect(findChaptersByBook).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN when book is draft and no user is authenticated', async () => {
    findBookById.mockResolvedValue({
      _id: bookId,
      authorId: authorId,
      status: 'draft',
    });

    await expect(readerManager.getChaptersForReading(bookId, null))
      .rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });

    expect(findChaptersByBook).not.toHaveBeenCalled();
  });

  it('returns chapters for an archived book when author requests it', async () => {
    findBookById.mockResolvedValue({
      _id: bookId,
      authorId: authorId,
      status: 'archived',
    });
    findChaptersByBook.mockResolvedValue(mockChapters);

    const result = await readerManager.getChaptersForReading(bookId, authorId);

    expect(result).toEqual(mockChapters);
    expect(findChaptersByBook).toHaveBeenCalledWith(bookId);
  });

  it('throws FORBIDDEN when book is archived and user is not the author', async () => {
    findBookById.mockResolvedValue({
      _id: bookId,
      authorId: authorId,
      status: 'archived',
    });

    await expect(readerManager.getChaptersForReading(bookId, otherChildId))
      .rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });

    expect(findChaptersByBook).not.toHaveBeenCalled();
  });
});