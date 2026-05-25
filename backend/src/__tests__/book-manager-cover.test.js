// Contopia — Book Manager Tests for Cover Image (STORY-027)
// Tests: coverAssetId allowedFields, getBookForEditManager cover image population
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('../app/book/book-dao.js', () => ({
  findBookById: vi.fn(),
  findBookWithChapters: vi.fn(),
  updateBookById: vi.fn(),
  countBooksByAuthor: vi.fn(),
  findChaptersByBook: vi.fn(),
  createBook: vi.fn(),
  findBooksByAuthor: vi.fn(),
  findBooksByAuthorWithWordCount: vi.fn(),
  softDeleteBook: vi.fn(),
  softDeleteChaptersByBook: vi.fn(),
  softDeleteAssetsByBook: vi.fn(),
  softDeleteReadingProgressByBook: vi.fn(),
  findReadingProgress: vi.fn(),
  upsertReadingProgress: vi.fn(),
  findReadingProgressByUser: vi.fn(),
  createActivityLog: vi.fn(() => ({ catch: vi.fn() })),
  createAsset: vi.fn(),
  sumAssetBytesByAuthor: vi.fn(),
  findAssetsByBook: vi.fn(),
}));

vi.mock('../app/storage/storage-dao.js', () => ({
  findAssetRecordById: vi.fn(),
}));

vi.mock('../app/storage/storage-service.js', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://s3.example.com/signed-url')),
}));

import { updateBookManager, getBookForEditManager } from '../app/book/book-manager.js';
import * as bookDao from '../app/book/book-dao.js';
import * as storageDao from '../app/storage/storage-dao.js';
import * as storageService from '../app/storage/storage-service.js';

const mockBook = {
  _id: 'book123',
  authorId: { toString: () => 'author123' },
  title: 'My Book',
  coverAssetId: null,
  updatedAt: new Date(),
};

describe('book-manager — coverAssetId integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookDao.findBookById.mockResolvedValue({ ...mockBook });
    bookDao.updateBookById.mockImplementation((_id, updates) => Promise.resolve({ ...mockBook, ...updates }));
    bookDao.findBookWithChapters.mockResolvedValue({
      book: { ...mockBook },
      chapters: [],
      totalWordCount: 0,
    });
  });

  describe('updateBookManager — coverAssetId in allowedFields', () => {
    it('should allow coverAssetId in book update', async () => {
      const coverAssetId = '507f1f77bcf86cd799439015';
      await updateBookManager('book123', 'author123', { coverAssetId });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(
        'book123',
        expect.objectContaining({ coverAssetId })
      );
    });

    it('should allow setting coverAssetId to null (removing cover)', async () => {
      await updateBookManager('book123', 'author123', { coverAssetId: null });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(
        'book123',
        expect.objectContaining({ coverAssetId: null })
      );
    });

    it('should not include coverAssetId when not in updates', async () => {
      await updateBookManager('book123', 'author123', { title: 'New Title' });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(
        'book123',
        expect.not.objectContaining({ coverAssetId: expect.anything() })
      );
    });

    it('should preserve ownership check for update with coverAssetId', async () => {
      bookDao.findBookById.mockResolvedValue({
        ...mockBook,
        authorId: { toString: () => 'other-author' },
      });

      await expect(
        updateBookManager('book123', 'author123', { coverAssetId: 'abc123' })
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });
  });

  describe('getBookForEditManager — cover image population', () => {
    it('should include coverImageUrl when book has coverAssetId', async () => {
      const coverAssetId = '507f1f77bcf86cd799439015';
      const thumbnailAssetId = '507f1f77bcf86cd799439016';

      bookDao.findBookWithChapters.mockResolvedValue({
        book: { ...mockBook, coverAssetId },
        chapters: [],
        totalWordCount: 0,
      });

      storageDao.findAssetRecordById.mockResolvedValue({
        _id: coverAssetId,
        url: 'users/123/books/456/covers/cover.jpg',
        dominantColor: '#4a9b6e',
      });

      bookDao.findAssetsByBook.mockResolvedValue([
        { url: 'users/123/books/456/covers/thumb.jpg' },
      ]);

      const result = await getBookForEditManager('book123', 'author123');

      expect(result.coverImageUrl).toBe('https://s3.example.com/signed-url');
      expect(result.coverThumbnailUrl).toBe('https://s3.example.com/signed-url');
      expect(result.dominantColor).toBe('#4a9b6e');
    });

    it('should not include cover fields when book has no coverAssetId', async () => {
      const result = await getBookForEditManager('book123', 'author123');

      expect(result.coverImageUrl).toBeUndefined();
      expect(result.coverThumbnailUrl).toBeUndefined();
      expect(result.dominantColor).toBeUndefined();
    });

    it('should continue without cover when asset lookup fails gracefully', async () => {
      const coverAssetId = '507f1f77bcf86cd799439015';

      bookDao.findBookWithChapters.mockResolvedValue({
        book: { ...mockBook, coverAssetId },
        chapters: [],
        totalWordCount: 0,
      });

      storageDao.findAssetRecordById.mockRejectedValue(new Error('DB error'));

      // Should not throw — it logs a warning and continues
      const result = await getBookForEditManager('book123', 'author123');

      expect(result.coverImageUrl).toBeUndefined();
      expect(result.coverThumbnailUrl).toBeUndefined();
      expect(result.dominantColor).toBeUndefined();
    });

    it('should handle missing dominantColor on cover asset', async () => {
      const coverAssetId = '507f1f77bcf86cd799439015';

      bookDao.findBookWithChapters.mockResolvedValue({
        book: { ...mockBook, coverAssetId },
        chapters: [],
        totalWordCount: 0,
      });

      storageDao.findAssetRecordById.mockResolvedValue({
        _id: coverAssetId,
        url: 'users/123/books/456/covers/cover.jpg',
        // dominantColor: undefined (simulate missing field)
      });

      bookDao.findAssetsByBook.mockResolvedValue([]);

      const result = await getBookForEditManager('book123', 'author123');

      expect(result.coverImageUrl).toBe('https://s3.example.com/signed-url');
      expect(result.dominantColor).toBeUndefined();
    });

    it('should handle missing thumbnail assets gracefully', async () => {
      const coverAssetId = '507f1f77bcf86cd799439015';

      bookDao.findBookWithChapters.mockResolvedValue({
        book: { ...mockBook, coverAssetId },
        chapters: [],
        totalWordCount: 0,
      });

      storageDao.findAssetRecordById.mockResolvedValue({
        _id: coverAssetId,
        url: 'users/123/books/456/covers/cover.jpg',
        dominantColor: '#4a9b6e',
      });

      bookDao.findAssetsByBook.mockResolvedValue([]);

      const result = await getBookForEditManager('book123', 'author123');

      expect(result.coverImageUrl).toBe('https://s3.example.com/signed-url');
      expect(result.coverThumbnailUrl).toBeUndefined();
      expect(result.dominantColor).toBe('#4a9b6e');
    });
  });
});
