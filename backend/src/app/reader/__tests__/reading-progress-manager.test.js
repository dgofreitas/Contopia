// Contopia — ReadingProgress Manager Tests (STORY-033: finished field)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock pino to silence logging ─────────────────────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// ── Mock DAO module before import ───────────────────────────────────────────
vi.mock('../../book/book-dao.js', () => ({
  createBook: vi.fn(),
  findBookById: vi.fn(),
  findBooksByAuthor: vi.fn(),
  findBooksByAuthorWithWordCount: vi.fn(),
  findBookWithChapters: vi.fn(),
  updateBookById: vi.fn(),
  softDeleteBook: vi.fn(),
  countBooksByAuthor: vi.fn(),
  findChaptersByBook: vi.fn(),
  softDeleteChaptersByBook: vi.fn(),
  softDeleteAssetsByBook: vi.fn(),
  softDeleteReadingProgressByBook: vi.fn(),
  findReadingProgress: vi.fn(),
  upsertReadingProgress: vi.fn(),
  findReadingProgressByUser: vi.fn(),
  createActivityLog: vi.fn(),
  createAsset: vi.fn(),
  sumAssetBytesByAuthor: vi.fn(),
  findAssetsByBook: vi.fn(),
}));

// ── Mock storage-dao ────────────────────────────────────────────────────────
vi.mock('../../storage/storage-dao.js', () => ({
  findAssetRecordById: vi.fn(),
}));

vi.mock('../../storage/storage-service.js', () => ({
  getSignedUrl: vi.fn(),
}));

import * as bookManager from '../../book/book-manager.js';
import * as bookDao from '../../book/book-dao.js';

describe('updateReadingProgressManager — STORY-033', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userId = '507f1f77bcf86cd799439011';
  const bookId = '507f1f77bcf86cd799439012';
  const chapterId = '507f1f77bcf86cd799439013';

  describe('finished auto-set logic', () => {
    it('should set finished=true when percentage >= 99', async () => {
      const mockProgress = { userId, bookId, percentage: 99, finished: true, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { percentage: 99 });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        percentage: 99,
        finished: true,
      });
      expect(result.finished).toBe(true);
    });

    it('should set finished=true when percentage = 100', async () => {
      const mockProgress = { userId, bookId, percentage: 100, finished: true, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { percentage: 100 });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        percentage: 100,
        finished: true,
      });
      expect(result.finished).toBe(true);
    });

    it('should set finished=false when percentage < 99', async () => {
      const mockProgress = { userId, bookId, percentage: 50, finished: false, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { percentage: 50 });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        percentage: 50,
        finished: false,
      });
      expect(result.finished).toBe(false);
    });

    it('should set finished=false when percentage = 0 (restart)', async () => {
      const mockProgress = { userId, bookId, percentage: 0, finished: false, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { percentage: 0 });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        percentage: 0,
        finished: false,
      });
      expect(result.finished).toBe(false);
    });

    it('should set finished=false when percentage = 98 (almost done)', async () => {
      const mockProgress = { userId, bookId, percentage: 98, finished: false, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { percentage: 98 });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        percentage: 98,
        finished: false,
      });
    });

    it('should use explicit finished value when percentage is not provided', async () => {
      const mockProgress = { userId, bookId, finished: true, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { finished: true });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        finished: true,
      });
      expect(result.finished).toBe(true);
    });

    it('should use explicit finished=false when percentage is not provided', async () => {
      const mockProgress = { userId, bookId, finished: false, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { finished: false });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        finished: false,
      });
      expect(result.finished).toBe(false);
    });

    it('should auto-set finished from percentage even when explicit finished is provided (percentage takes precedence)', async () => {
      const mockProgress = { userId, bookId, percentage: 99, finished: true, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      // When percentage is provided, finished is auto-set from percentage, ignoring explicit finished
      const result = await bookManager.updateReadingProgressManager(userId, bookId, { percentage: 99, finished: false });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        percentage: 99,
        finished: true, // auto-set from percentage >= 99
      });
    });

    it('should transition from finished=true to finished=false when percentage drops below 99', async () => {
      const mockProgress = { userId, bookId, percentage: 50, finished: false, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { percentage: 50 });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        percentage: 50,
        finished: false,
      });
    });
  });

  describe('progress update without finished/percentage', () => {
    it('should update lastChapterId without affecting finished', async () => {
      const mockProgress = { userId, bookId, lastChapterId: chapterId, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { lastChapterId: chapterId });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        lastChapterId: chapterId,
      });
    });

    it('should update lastPosition without affecting finished', async () => {
      const mockProgress = { userId, bookId, lastPosition: 42, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, { lastPosition: 42 });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        lastPosition: 42,
      });
    });

    it('should update multiple fields including percentage auto-finish', async () => {
      const mockProgress = { userId, bookId, lastChapterId: chapterId, lastPosition: 200, percentage: 99, finished: true, updatedAt: new Date() };
      bookDao.upsertReadingProgress.mockResolvedValue(mockProgress);

      const result = await bookManager.updateReadingProgressManager(userId, bookId, {
        lastChapterId: chapterId,
        lastPosition: 200,
        percentage: 99,
      });

      expect(bookDao.upsertReadingProgress).toHaveBeenCalledWith(userId, bookId, {
        lastChapterId: chapterId,
        lastPosition: 200,
        percentage: 99,
        finished: true,
      });
    });
  });
});