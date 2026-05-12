// Contopia — Chapter DAO Tests
// STORY-004: Core Data Model & Database Migrations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Book, Chapter } from '../../book/book-model.js';
import * as bookDao from '../../book/book-dao.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('Chapter DAO', () => {
  let bookId;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    // Explicit language='en' avoids text index bug with pt-BR on MongoDB 7+
    const book = await Book.create({ authorId: new mongoose.Types.ObjectId(), title: 'Test Book', language: 'en' });
    bookId = book._id;
  });

  describe('createChapter', () => {
    it('should create and return a chapter document', async () => {
      const chapter = await bookDao.createChapter({
        bookId,
        order: 100,
        title: 'Chapter 1',
        content: '<p>Content</p>',
      });

      expect(chapter).toBeDefined();
      expect(chapter._id).toBeDefined();
      expect(chapter.title).toBe('Chapter 1');
      expect(chapter.bookId.toString()).toBe(bookId.toString());
      expect(chapter.order).toBe(100);

      // Verify persisted
      const found = await Chapter.findById(chapter._id);
      expect(found).toBeDefined();
    });
  });

  describe('findChapterById', () => {
    it('should find an active chapter by ID', async () => {
      const created = await bookDao.createChapter({ bookId, order: 100, title: 'Find Me' });
      const found = await bookDao.findChapterById(created._id);
      expect(found).toBeDefined();
      expect(found.title).toBe('Find Me');
    });

    it('should return null for non-existent ID', async () => {
      const found = await bookDao.findChapterById(new mongoose.Types.ObjectId());
      expect(found).toBeNull();
    });

    it('should not return soft-deleted chapters', async () => {
      const created = await bookDao.createChapter({ bookId, order: 100, title: 'Delete Me' });
      await bookDao.softDeleteChapter(created._id);
      const found = await bookDao.findChapterById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('findChaptersByBook', () => {
    it('should return chapters sorted by order ascending', async () => {
      await bookDao.createChapter({ bookId, order: 300, title: 'Third' });
      await bookDao.createChapter({ bookId, order: 100, title: 'First' });
      await bookDao.createChapter({ bookId, order: 200, title: 'Second' });

      const chapters = await bookDao.findChaptersByBook(bookId);
      expect(chapters).toHaveLength(3);
      expect(chapters[0].title).toBe('First');
      expect(chapters[0].order).toBe(100);
      expect(chapters[1].title).toBe('Second');
      expect(chapters[1].order).toBe(200);
      expect(chapters[2].title).toBe('Third');
      expect(chapters[2].order).toBe(300);
    });

    it('should return empty array for book with no chapters', async () => {
      const chapters = await bookDao.findChaptersByBook(bookId);
      expect(chapters).toEqual([]);
    });

    it('should not return soft-deleted chapters', async () => {
      await bookDao.createChapter({ bookId, order: 100, title: 'Keep' });
      const toDelete = await bookDao.createChapter({ bookId, order: 200, title: 'Remove' });
      await bookDao.softDeleteChapter(toDelete._id);

      const chapters = await bookDao.findChaptersByBook(bookId);
      expect(chapters).toHaveLength(1);
      expect(chapters[0].title).toBe('Keep');
    });

    it('should respect limit and skip pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await bookDao.createChapter({ bookId, order: i * 100, title: `Ch ${i}` });
      }

      const firstTwo = await bookDao.findChaptersByBook(bookId, { limit: 2, skip: 0 });
      expect(firstTwo).toHaveLength(2);

      const nextTwo = await bookDao.findChaptersByBook(bookId, { limit: 2, skip: 2 });
      expect(nextTwo).toHaveLength(2);
      expect(nextTwo[0].order).toBe(200);
      expect(nextTwo[1].order).toBe(300);
    });

    it('should not return chapters from a different book', async () => {
      const otherBook = await Book.create({
        authorId: new mongoose.Types.ObjectId(),
        title: 'Other Book',
        language: 'en',
      });
      await bookDao.createChapter({ bookId: otherBook._id, order: 100, title: 'Other Ch' });
      await bookDao.createChapter({ bookId, order: 100, title: 'Our Ch' });

      const chapters = await bookDao.findChaptersByBook(bookId);
      expect(chapters).toHaveLength(1);
      expect(chapters[0].title).toBe('Our Ch');
    });
  });

  describe('updateChapterById', () => {
    it('should update a chapter and return the updated document', async () => {
      const chapter = await bookDao.createChapter({ bookId, order: 100, title: 'Original' });
      const updated = await bookDao.updateChapterById(chapter._id, { title: 'Updated', order: 150 });
      expect(updated.title).toBe('Updated');
      expect(updated.order).toBe(150);
    });

    it('should not update soft-deleted chapters', async () => {
      const chapter = await bookDao.createChapter({ bookId, order: 100, title: 'Gone' });
      await bookDao.softDeleteChapter(chapter._id);
      const updated = await bookDao.updateChapterById(chapter._id, { title: 'Try Update' });
      expect(updated).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const updated = await bookDao.updateChapterById(new mongoose.Types.ObjectId(), { title: 'Nope' });
      expect(updated).toBeNull();
    });
  });

  describe('softDeleteChapter', () => {
    it('should set deletedAt on the chapter', async () => {
      const chapter = await bookDao.createChapter({ bookId, order: 100, title: 'To Delete' });
      const deleted = await bookDao.softDeleteChapter(chapter._id);
      expect(deleted.deletedAt).toBeInstanceOf(Date);
    });

    it('should make chapter unfindable by findChapterById', async () => {
      const chapter = await bookDao.createChapter({ bookId, order: 100, title: 'Hide Me' });
      await bookDao.softDeleteChapter(chapter._id);
      const found = await bookDao.findChapterById(chapter._id);
      expect(found).toBeNull();
    });
  });

  describe('softDeleteChaptersByBook', () => {
    it('should soft delete all chapters for a book', async () => {
      await bookDao.createChapter({ bookId, order: 100, title: 'Ch 1' });
      await bookDao.createChapter({ bookId, order: 200, title: 'Ch 2' });
      await bookDao.createChapter({ bookId, order: 300, title: 'Ch 3' });

      const result = await bookDao.softDeleteChaptersByBook(bookId);
      expect(result.modifiedCount).toBe(3);

      const chapters = await bookDao.findChaptersByBook(bookId);
      expect(chapters).toHaveLength(0);
    });

    it('should not affect chapters from other books', async () => {
      const otherBook = await Book.create({
        authorId: new mongoose.Types.ObjectId(),
        title: 'Other Book',
        language: 'en',
      });
      await bookDao.createChapter({ bookId, order: 100, title: 'Delete This' });
      await bookDao.createChapter({ bookId: otherBook._id, order: 100, title: 'Keep This' });

      await bookDao.softDeleteChaptersByBook(bookId);

      const ourChapters = await bookDao.findChaptersByBook(bookId);
      expect(ourChapters).toHaveLength(0);

      const otherChapters = await bookDao.findChaptersByBook(otherBook._id);
      expect(otherChapters).toHaveLength(1);
      expect(otherChapters[0].title).toBe('Keep This');
    });
  });

  describe('hardDeleteChapter', () => {
    it('should permanently remove a chapter', async () => {
      const chapter = await bookDao.createChapter({ bookId, order: 100, title: 'Delete Forever' });
      await bookDao.hardDeleteChapter(chapter._id);
      const found = await Chapter.findById(chapter._id);
      expect(found).toBeNull();
    });
  });
});
