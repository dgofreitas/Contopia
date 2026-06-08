// Contopia — Parent Manager Tests (STORY-052, STORY-053)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../app/parent/parent-dao.js', () => ({
  findParentByIdWithChild: vi.fn(),
  getChildBookCount: vi.fn(),
  getWeeklyBookCount: vi.fn(),
  getWeeklyBooksReadCount: vi.fn(),
  getWeeklyReadingTimeForChild: vi.fn(),
  getChildBookTitlesWithCovers: vi.fn(),
  countChildBooks: vi.fn(),
}));

vi.mock('../app/storage/storage-dao.js', () => ({
  findAssetRecordById: vi.fn(),
}));

vi.mock('../app/storage/storage-service.js', () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock('../app/book/book-dao.js', () => ({
  findAssetsByBook: vi.fn(),
  getWeeklyReadingTime: vi.fn(),
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import * as parentManager from '../app/parent/parent-manager.js';
import * as parentDao from '../app/parent/parent-dao.js';

describe('Parent Manager — getChildActivitySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Happy Path ────────────────────────────────────────────────────────────

  it('should return weekly activity summary with books written, books read, reading time', async () => {
    const parentId = 'parent123';
    const childId = 'child456';
    parentDao.findParentByIdWithChild.mockResolvedValue({
      parent: { _id: parentId, email: 'parent@test.com' },
      child: { _id: childId, firstName: 'João', parentId },
    });
    parentDao.getWeeklyBookCount.mockResolvedValue(5);
    parentDao.getWeeklyBooksReadCount.mockResolvedValue(3);
    parentDao.getWeeklyReadingTimeForChild.mockResolvedValue(2700000); // 45 min in ms

    const result = await parentManager.getChildActivitySummary(parentId);

    expect(result).toEqual({
      booksWritten: 5,
      booksRead: 3,
      readingTimeMinutes: 45,
      childFirstName: 'João',
      childId: childId,
      hasActivity: true,
    });
    expect(parentDao.findParentByIdWithChild).toHaveBeenCalledWith(parentId);
    expect(parentDao.getWeeklyBookCount).toHaveBeenCalledWith(childId);
    expect(parentDao.getWeeklyBooksReadCount).toHaveBeenCalledWith(childId);
    expect(parentDao.getWeeklyReadingTimeForChild).toHaveBeenCalledWith(childId);
  });

  it('should return zero counts when child has no weekly activity', async () => {
    const parentId = 'parent123';
    parentDao.findParentByIdWithChild.mockResolvedValue({
      parent: { _id: parentId },
      child: { _id: 'child456', firstName: 'Maria', parentId },
    });
    parentDao.getWeeklyBookCount.mockResolvedValue(0);
    parentDao.getWeeklyBooksReadCount.mockResolvedValue(0);
    parentDao.getWeeklyReadingTimeForChild.mockResolvedValue(0);

    const result = await parentManager.getChildActivitySummary(parentId);

    expect(result.booksWritten).toBe(0);
    expect(result.booksRead).toBe(0);
    expect(result.readingTimeMinutes).toBe(0);
    expect(result.hasActivity).toBe(false);
    expect(result.childFirstName).toBe('Maria');
  });

  it('should return empty state when no child exists', async () => {
    const parentId = 'parent123';
    parentDao.findParentByIdWithChild.mockResolvedValue({
      parent: { _id: parentId, email: 'parent@test.com' },
      child: null,
    });

    const result = await parentManager.getChildActivitySummary(parentId);

    expect(result).toEqual({
      booksWritten: 0,
      booksRead: 0,
      readingTimeMinutes: 0,
      childFirstName: null,
      childId: null,
      hasActivity: false,
    });
    expect(parentDao.getWeeklyBookCount).not.toHaveBeenCalled();
  });

  it('should return empty state when parent not found', async () => {
    const parentId = 'nonexistent';
    parentDao.findParentByIdWithChild.mockResolvedValue(null);

    const result = await parentManager.getChildActivitySummary(parentId);

    expect(result).toEqual({
      booksWritten: 0,
      booksRead: 0,
      readingTimeMinutes: 0,
      childFirstName: null,
      childId: null,
      hasActivity: false,
    });
  });

  // ── Reading Time Calculation ──────────────────────────────────────────────

  it('should round readingTimeMinutes to nearest minute', async () => {
    const parentId = 'parent123';
    parentDao.findParentByIdWithChild.mockResolvedValue({
      parent: { _id: parentId },
      child: { _id: 'child456', firstName: 'Ana', parentId },
    });
    parentDao.getWeeklyBookCount.mockResolvedValue(0);
    parentDao.getWeeklyBooksReadCount.mockResolvedValue(0);
    // 1.5 minutes => 90000ms, should round to 2
    parentDao.getWeeklyReadingTimeForChild.mockResolvedValue(90000);

    const result = await parentManager.getChildActivitySummary(parentId);

    expect(result.readingTimeMinutes).toBe(2);
  });

  it('should compute hasActivity correctly with only reading time', async () => {
    const parentId = 'parent123';
    parentDao.findParentByIdWithChild.mockResolvedValue({
      parent: { _id: parentId },
      child: { _id: 'child456', firstName: 'Pedro', parentId },
    });
    parentDao.getWeeklyBookCount.mockResolvedValue(0);
    parentDao.getWeeklyBooksReadCount.mockResolvedValue(0);
    parentDao.getWeeklyReadingTimeForChild.mockResolvedValue(60000); // 1 min

    const result = await parentManager.getChildActivitySummary(parentId);

    expect(result.hasActivity).toBe(true);
  });

  // ── Error Propagation ─────────────────────────────────────────────────────

  it('should propagate DAO errors from findParentByIdWithChild', async () => {
    const parentId = 'parent123';
    parentDao.findParentByIdWithChild.mockRejectedValue(
      new Error('Database connection failed')
    );

    await expect(
      parentManager.getChildActivitySummary(parentId)
    ).rejects.toThrow('Database connection failed');
  });

  it('should propagate DAO errors from getWeeklyBookCount', async () => {
    const parentId = 'parent123';
    parentDao.findParentByIdWithChild.mockResolvedValue({
      parent: { _id: parentId },
      child: { _id: 'child456', firstName: 'João', parentId },
    });
    parentDao.getWeeklyBookCount.mockRejectedValue(
      new Error('Book query failed')
    );

    await expect(
      parentManager.getChildActivitySummary(parentId)
    ).rejects.toThrow('Book query failed');
  });
});

describe('Parent Manager — getChildBookList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated book list with cover thumbnails', async () => {
    const parentId = 'parent123';
    const childId = 'child456';
    const { default: mongoose } = await import('mongoose');
    const bookId = new mongoose.Types.ObjectId();

    parentDao.findParentByIdWithChild.mockResolvedValue({
      parent: { _id: parentId },
      child: { _id: childId, firstName: 'João', parentId },
    });
    parentDao.getChildBookTitlesWithCovers.mockResolvedValue([
      { _id: bookId, title: 'A Aventura', coverAssetId: null, status: 'published', updatedAt: new Date() },
    ]);
    parentDao.countChildBooks.mockResolvedValue(1);

    const { findAssetsByBook } = await import('../app/book/book-dao.js');
    findAssetsByBook.mockResolvedValue([]);

    const result = await parentManager.getChildBookList(parentId, { limit: 20, skip: 0 });

    expect(result.books).toHaveLength(1);
    expect(result.books[0].title).toBe('A Aventura');
    expect(result.books[0].bookId).toBe(bookId.toString());
    expect(result.total).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('should return empty list when no child exists', async () => {
    const parentId = 'parent123';
    parentDao.findParentByIdWithChild.mockResolvedValue({
      parent: { _id: parentId },
      child: null,
    });

    const result = await parentManager.getChildBookList(parentId);

    expect(result).toEqual({ books: [], total: 0, limit: 20, offset: 0 });
  });

  it('should return empty list when parent not found', async () => {
    parentDao.findParentByIdWithChild.mockResolvedValue(null);

    const result = await parentManager.getChildBookList('nonexistent');

    expect(result).toEqual({ books: [], total: 0, limit: 20, offset: 0 });
  });
});