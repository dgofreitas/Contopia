// Contopia — Book Manager Tests (STORY-021: Edit Existing Book)
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ── Mock pino to silence logging ─────────────────────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// ── Mock DAO module before import ───────────────────────────────────────────
vi.mock('../book-dao.js', async () => {
  const actual = await vi.importActual('../book-dao.js');
  return {
    ...actual,
    findBookWithChapters: vi.fn(),
    findBooksByAuthorWithWordCount: vi.fn(),
    findBooksByAuthor: vi.fn(),
    countBooksByAuthor: vi.fn(),
    findBookById: vi.fn(),
    updateBookById: vi.fn(),
    createActivityLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
  };
});

import * as bookManager from '../book-manager.js';
import * as bookDao from '../book-dao.js';

const AUTHOR_ID = new mongoose.Types.ObjectId().toString();
const OTHER_AUTHOR_ID = new mongoose.Types.ObjectId().toString();

describe('Book Manager — STORY-021', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBookForEditManager', () => {
    const bookId = new mongoose.Types.ObjectId().toString();

    it('should return book, chapters, totalWordCount and lastEditedAt on success', async () => {
      // Arrange
      const mockResult = {
        book: { _id: bookId, authorId: AUTHOR_ID, title: 'Edit Me', status: 'draft', updatedAt: new Date('2025-01-15') },
        chapters: [{ _id: 'c1', title: 'Ch 1', order: 1, wordCount: 100 }],
        totalWordCount: 100,
      };
      bookDao.findBookWithChapters.mockResolvedValue(mockResult);

      // Act
      const result = await bookManager.getBookForEditManager(bookId, AUTHOR_ID);

      // Assert
      expect(result.book._id).toBe(bookId);
      expect(result.book.title).toBe('Edit Me');
      expect(result.chapters).toHaveLength(1);
      expect(result.totalWordCount).toBe(100);
      expect(result.lastEditedAt).toEqual(mockResult.book.updatedAt);
      expect(bookDao.findBookWithChapters).toHaveBeenCalledWith(bookId);
    });

    it('should throw 404 when book not found', async () => {
      // Arrange
      bookDao.findBookWithChapters.mockResolvedValue(null);

      // Act & Assert
      await expect(bookManager.getBookForEditManager(bookId, AUTHOR_ID)).rejects.toMatchObject({
        message: "We couldn't find that book",
        code: 'NOT_FOUND',
        status: 404,
      });
    });

    it('should throw 403 when user is not the owner', async () => {
      // Arrange
      const mockResult = {
        book: { _id: bookId, authorId: OTHER_AUTHOR_ID, title: 'Not Mine' },
        chapters: [],
        totalWordCount: 0,
      };
      bookDao.findBookWithChapters.mockResolvedValue(mockResult);

      // Act & Assert
      await expect(bookManager.getBookForEditManager(bookId, AUTHOR_ID)).rejects.toMatchObject({
        message: "That doesn't belong to you",
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('should handle book with no chapters', async () => {
      // Arrange
      const mockResult = {
        book: { _id: bookId, authorId: AUTHOR_ID, title: 'Empty', updatedAt: new Date() },
        chapters: [],
        totalWordCount: 0,
      };
      bookDao.findBookWithChapters.mockResolvedValue(mockResult);

      // Act
      const result = await bookManager.getBookForEditManager(bookId, AUTHOR_ID);

      // Assert
      expect(result.chapters).toEqual([]);
      expect(result.totalWordCount).toBe(0);
      expect(result.lastEditedAt).toBeDefined();
    });
  });

  describe('getBooksByAuthorManager — draft status', () => {
    it('should use findBooksByAuthorWithWordCount for draft status', async () => {
      // Arrange
      const draftBooks = [
        { _id: new mongoose.Types.ObjectId(), title: 'Draft 1', totalWordCount: 50 },
        { _id: new mongoose.Types.ObjectId(), title: 'Draft 2', totalWordCount: 120 },
      ];
      bookDao.findBooksByAuthorWithWordCount.mockResolvedValue(draftBooks);
      bookDao.countBooksByAuthor.mockResolvedValue(2);

      // Act
      const result = await bookManager.getBooksByAuthorManager(AUTHOR_ID, { status: 'draft' });

      // Assert
      expect(bookDao.findBooksByAuthorWithWordCount).toHaveBeenCalledWith(AUTHOR_ID, {
        status: 'draft',
        limit: 20,
        skip: 0,
      });
      expect(result.books).toEqual(draftBooks);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should call countBooksByAuthor with draft filter', async () => {
      // Arrange
      bookDao.findBooksByAuthorWithWordCount.mockResolvedValue([]);
      bookDao.countBooksByAuthor.mockResolvedValue(0);

      // Act
      await bookManager.getBooksByAuthorManager(AUTHOR_ID, { status: 'draft' });

      // Assert
      expect(bookDao.countBooksByAuthor).toHaveBeenCalledWith(AUTHOR_ID, { status: 'draft' });
    });

    it('should not call findBooksByAuthorWithWordCount for non-draft status', async () => {
      // Arrange
      bookDao.findBooksByAuthor.mockResolvedValue([]);
      bookDao.countBooksByAuthor.mockResolvedValue(0);

      // Act
      await bookManager.getBooksByAuthorManager(AUTHOR_ID, { status: 'published' });

      // Assert
      expect(bookDao.findBooksByAuthorWithWordCount).not.toHaveBeenCalled();
      expect(bookDao.findBooksByAuthor).toHaveBeenCalled();
    });
  });

  describe('updateBookManager', () => {
    const bookId = new mongoose.Types.ObjectId().toString();

    const createMockBook = (overrides = {}) => ({
      _id: bookId,
      authorId: AUTHOR_ID,
      title: 'Original Title',
      description: '',
      language: 'pt-BR',
      templateId: null,
      ...overrides,
    });

    it('should update templateId when provided', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, templateId: 'galaxy' });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { templateId: 'galaxy' });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { templateId: 'galaxy' });
      expect(result.templateId).toBe('galaxy');
    });

    it('should set templateId to null when explicitly provided as null', async () => {
      const mockBook = createMockBook({ templateId: 'galaxy' });
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, templateId: null });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { templateId: null });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { templateId: null });
      expect(result.templateId).toBeNull();
    });

    it('should not include templateId in update when undefined', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue(mockBook);

      await bookManager.updateBookManager(bookId, AUTHOR_ID, { title: 'New Title' });

      const updateCall = bookDao.updateBookById.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('templateId');
      expect(updateCall.title).toBe('New Title');
    });

    it('should update templateId alongside other fields', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({
        ...mockBook,
        title: 'Updated',
        templateId: 'ocean',
      });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, {
        title: 'Updated',
        templateId: 'ocean',
      });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, {
        title: 'Updated',
        templateId: 'ocean',
      });
      expect(result.title).toBe('Updated');
      expect(result.templateId).toBe('ocean');
    });

    it('should throw 404 when book not found', async () => {
      bookDao.findBookById.mockResolvedValue(null);

      await expect(
        bookManager.updateBookManager(bookId, AUTHOR_ID, { templateId: 'galaxy' })
      ).rejects.toMatchObject({
        message: "We couldn't find that book",
        code: 'NOT_FOUND',
        status: 404,
      });
    });

    it('should throw 403 when user is not the owner', async () => {
      const mockBook = createMockBook({ authorId: OTHER_AUTHOR_ID });
      bookDao.findBookById.mockResolvedValue(mockBook);

      await expect(
        bookManager.updateBookManager(bookId, AUTHOR_ID, { templateId: 'galaxy' })
      ).rejects.toMatchObject({
        message: "That doesn't belong to you",
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    // ── STORY-024: coverTitle & stickers ──────────────────────────────────────
    it('should update coverTitle when provided', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, coverTitle: 'My Custom Title' });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { coverTitle: 'My Custom Title' });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { coverTitle: 'My Custom Title' });
      expect(result.coverTitle).toBe('My Custom Title');
    });

    it('should set coverTitle to null when explicitly provided as null', async () => {
      const mockBook = createMockBook({ coverTitle: 'Old Title' });
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, coverTitle: null });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { coverTitle: null });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { coverTitle: null });
      expect(result.coverTitle).toBeNull();
    });

    it('should update stickers when provided', async () => {
      const stickers = [
        { svgId: 'star', x: 50, y: 50, scale: 1 },
        { svgId: 'heart', x: 25, y: 75, scale: 1.5 },
      ];
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, stickers });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { stickers });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { stickers });
      expect(result.stickers).toHaveLength(2);
      expect(result.stickers[0].svgId).toBe('star');
    });

    it('should not include coverTitle in update when undefined', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue(mockBook);

      await bookManager.updateBookManager(bookId, AUTHOR_ID, { title: 'New Title' });

      const updateCall = bookDao.updateBookById.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('coverTitle');
    });

    it('should not include stickers in update when undefined', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue(mockBook);

      await bookManager.updateBookManager(bookId, AUTHOR_ID, { title: 'New Title' });

      const updateCall = bookDao.updateBookById.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('stickers');
    });

    it('should update coverTitle and stickers alongside other fields', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({
        ...mockBook,
        title: 'Updated',
        coverTitle: 'Custom',
        stickers: [{ svgId: 'star', x: 50, y: 50, scale: 1 }],
      });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, {
        title: 'Updated',
        coverTitle: 'Custom',
        stickers: [{ svgId: 'star', x: 50, y: 50, scale: 1 }],
      });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, {
        title: 'Updated',
        coverTitle: 'Custom',
        stickers: [{ svgId: 'star', x: 50, y: 50, scale: 1 }],
      });
      expect(result.title).toBe('Updated');
      expect(result.coverTitle).toBe('Custom');
      expect(result.stickers).toHaveLength(1);
    });

    // ── STORY-025: spineColor & spineCustomized ──────────────────────────────
    it('should update spineColor when provided', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, spineColor: '#4ECDC4' });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { spineColor: '#4ECDC4' });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { spineColor: '#4ECDC4' });
      expect(result.spineColor).toBe('#4ECDC4');
    });

    it('should update spineCustomized when provided', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, spineCustomized: true });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { spineCustomized: true });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { spineCustomized: true });
      expect(result.spineCustomized).toBe(true);
    });

    it('should set spineColor to null when explicitly provided as null', async () => {
      const mockBook = createMockBook({ spineColor: '#FF6B6B' });
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, spineColor: null });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { spineColor: null });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { spineColor: null });
      expect(result.spineColor).toBeNull();
    });

    it('should set spineCustomized to false when explicitly provided', async () => {
      const mockBook = createMockBook({ spineCustomized: true });
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, spineCustomized: false });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { spineCustomized: false });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { spineCustomized: false });
      expect(result.spineCustomized).toBe(false);
    });

    it('should not include spineColor in update when undefined', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue(mockBook);

      await bookManager.updateBookManager(bookId, AUTHOR_ID, { title: 'New Title' });

      const updateCall = bookDao.updateBookById.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('spineColor');
      expect(updateCall).not.toHaveProperty('spineCustomized');
    });

    // ── STORY-036: isFavorited ──────────────────────────────────────────────
    it('should update isFavorited to true when provided', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, isFavorited: true });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { isFavorited: true });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { isFavorited: true });
      expect(result.isFavorited).toBe(true);
    });

    it('should update isFavorited to false when provided', async () => {
      const mockBook = createMockBook({ isFavorited: true });
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({ ...mockBook, isFavorited: false });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, { isFavorited: false });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, { isFavorited: false });
      expect(result.isFavorited).toBe(false);
    });

    it('should not include isFavorited in update when undefined', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue(mockBook);

      await bookManager.updateBookManager(bookId, AUTHOR_ID, { title: 'New Title' });

      const updateCall = bookDao.updateBookById.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('isFavorited');
    });

    it('should update isFavorited alongside other fields', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({
        ...mockBook,
        title: 'Updated',
        isFavorited: true,
        spineColor: '#45B7D1',
      });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, {
        title: 'Updated',
        isFavorited: true,
        spineColor: '#45B7D1',
      });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, {
        title: 'Updated',
        isFavorited: true,
        spineColor: '#45B7D1',
      });
      expect(result.title).toBe('Updated');
      expect(result.isFavorited).toBe(true);
      expect(result.spineColor).toBe('#45B7D1');
    });

    it('should update spineColor and spineCustomized alongside other fields', async () => {
      const mockBook = createMockBook();
      bookDao.findBookById.mockResolvedValue(mockBook);
      bookDao.updateBookById.mockResolvedValue({
        ...mockBook,
        title: 'Updated',
        spineColor: '#45B7D1',
        spineCustomized: true,
        coverColor: '#96CEB4',
      });

      const result = await bookManager.updateBookManager(bookId, AUTHOR_ID, {
        title: 'Updated',
        spineColor: '#45B7D1',
        spineCustomized: true,
        coverColor: '#96CEB4',
      });

      expect(bookDao.updateBookById).toHaveBeenCalledWith(bookId, {
        title: 'Updated',
        spineColor: '#45B7D1',
        spineCustomized: true,
        coverColor: '#96CEB4',
      });
      expect(result.title).toBe('Updated');
      expect(result.spineColor).toBe('#45B7D1');
      expect(result.spineCustomized).toBe(true);
      expect(result.coverColor).toBe('#96CEB4');
    });
  });

  describe('getBooksByAuthorManager — draft status', () => {
    it('should support page/pageSize pagination', async () => {
      // Arrange
      bookDao.findBooksByAuthorWithWordCount.mockResolvedValue([]);
      bookDao.countBooksByAuthor.mockResolvedValue(25);

      // Act
      const result = await bookManager.getBooksByAuthorManager(AUTHOR_ID, {
        status: 'draft',
        page: 2,
        pageSize: 10,
      });

      // Assert
      expect(bookDao.findBooksByAuthorWithWordCount).toHaveBeenCalledWith(AUTHOR_ID, {
        status: 'draft',
        limit: 10,
        skip: 10,
      });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
    });
  });
});
