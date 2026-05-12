// Contopia — ReadingProgress DAO Tests
// STORY-004: Core Data Model & Database Migrations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { ReadingProgress } from '../../book/book-model.js';
import * as bookDao from '../../book/book-dao.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('ReadingProgress DAO', () => {
  let userId;
  let bookId;
  let bookId2;
  let chapterId;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    userId = new mongoose.Types.ObjectId();
    bookId = new mongoose.Types.ObjectId();
    bookId2 = new mongoose.Types.ObjectId();
    chapterId = new mongoose.Types.ObjectId();
  });

  describe('createReadingProgress', () => {
    it('should create and return a reading progress document', async () => {
      const rp = await bookDao.createReadingProgress({
        userId,
        bookId,
        lastPosition: 10,
        percentage: 5,
      });

      expect(rp).toBeDefined();
      expect(rp._id).toBeDefined();
      expect(rp.userId.toString()).toBe(userId.toString());
      expect(rp.bookId.toString()).toBe(bookId.toString());
      expect(rp.lastPosition).toBe(10);
      expect(rp.percentage).toBe(5);

      // Verify persisted
      const found = await ReadingProgress.findById(rp._id);
      expect(found).toBeDefined();
    });

    it('should not create duplicate for same userId + bookId', async () => {
      // Ensure unique index is created before testing duplicate constraint
      await ReadingProgress.createIndexes();
      await bookDao.createReadingProgress({ userId, bookId });
      await expect(
        bookDao.createReadingProgress({ userId, bookId })
      ).rejects.toThrow();
    });
  });

  describe('findReadingProgress', () => {
    it('should find reading progress by userId and bookId', async () => {
      await bookDao.createReadingProgress({ userId, bookId, percentage: 50 });
      const found = await bookDao.findReadingProgress(userId, bookId);
      expect(found).toBeDefined();
      expect(found.percentage).toBe(50);
    });

    it('should return null for non-existent combination', async () => {
      const found = await bookDao.findReadingProgress(userId, bookId);
      expect(found).toBeNull();
    });

    it('should not return soft-deleted progress', async () => {
      const rp = await bookDao.createReadingProgress({ userId, bookId });
      await bookDao.softDeleteReadingProgress(rp._id);
      const found = await bookDao.findReadingProgress(userId, bookId);
      expect(found).toBeNull();
    });
  });

  describe('upsertReadingProgress', () => {
    it('should create a new progress document if none exists', async () => {
      const result = await bookDao.upsertReadingProgress(userId, bookId, {
        lastPosition: 10,
        percentage: 5,
      });

      expect(result).toBeDefined();
      expect(result.userId.toString()).toBe(userId.toString());
      expect(result.bookId.toString()).toBe(bookId.toString());
      expect(result.lastPosition).toBe(10);
      expect(result.percentage).toBe(5);
    });

    it('should update existing progress document', async () => {
      const created = await bookDao.createReadingProgress({ userId, bookId, lastPosition: 0, percentage: 0 });

      const updated = await bookDao.upsertReadingProgress(userId, bookId, {
        lastPosition: 100,
        percentage: 75,
        lastChapterId: chapterId,
      });

      expect(updated).toBeDefined();
      expect(updated.lastPosition).toBe(100);
      expect(updated.percentage).toBe(75);
      expect(updated.lastChapterId.toString()).toBe(chapterId.toString());
      expect(updated._id.toString()).toBe(created._id.toString());
    });

    it('should set defaults on insert', async () => {
      const result = await bookDao.upsertReadingProgress(userId, bookId, {});
      expect(result.lastPosition).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.deletedAt).toBeNull();
    });

    it('should update updatedAt timestamp', async () => {
      await bookDao.createReadingProgress({ userId, bookId });

      await new Promise((r) => setTimeout(r, 50));
      const updated = await bookDao.upsertReadingProgress(userId, bookId, { lastPosition: 50 });
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('should not create duplicates — always returns single document for same userId+bookId', async () => {
      await bookDao.upsertReadingProgress(userId, bookId, { percentage: 10 });
      await bookDao.upsertReadingProgress(userId, bookId, { percentage: 90 });

      const count = await ReadingProgress.countDocuments({ userId, bookId });
      expect(count).toBe(1);

      const found = await bookDao.findReadingProgress(userId, bookId);
      expect(found.percentage).toBe(90);
    });
  });

  describe('findReadingProgressByUser', () => {
    it('should return progress entries sorted by updatedAt descending', async () => {
      const b1 = bookId;
      const b2 = bookId2;

      await bookDao.createReadingProgress({ userId, bookId: b1, percentage: 10 });
      await new Promise((r) => setTimeout(r, 50));
      await bookDao.createReadingProgress({ userId, bookId: b2, percentage: 20 });

      const results = await bookDao.findReadingProgressByUser(userId);
      expect(results).toHaveLength(2);
      // Most recently updated first
      expect(results[0].bookId.toString()).toBe(b2.toString());
      expect(results[1].bookId.toString()).toBe(b1.toString());
    });

    it('should return empty array for user with no progress', async () => {
      const results = await bookDao.findReadingProgressByUser(new mongoose.Types.ObjectId());
      expect(results).toEqual([]);
    });

    it('should not return soft-deleted progress', async () => {
      await bookDao.createReadingProgress({ userId, bookId, percentage: 10 });
      const allProgress = await bookDao.findReadingProgressByUser(userId);
      expect(allProgress).toHaveLength(1);

      await bookDao.softDeleteReadingProgress(allProgress[0]._id);

      const results = await bookDao.findReadingProgressByUser(userId);
      expect(results).toEqual([]);
    });

    it('should respect limit and skip pagination', async () => {
      const bIds = [bookId, bookId2, new mongoose.Types.ObjectId()];
      for (const bId of bIds) {
        await bookDao.createReadingProgress({ userId, bookId: bId, percentage: 10 });
        await new Promise((r) => setTimeout(r, 20));
      }

      const firstTwo = await bookDao.findReadingProgressByUser(userId, { limit: 2, skip: 0 });
      expect(firstTwo).toHaveLength(2);

      const nextOne = await bookDao.findReadingProgressByUser(userId, { limit: 2, skip: 2 });
      expect(nextOne).toHaveLength(1);
    });

    it('should return only the requesting user progress', async () => {
      const otherUser = new mongoose.Types.ObjectId();
      await bookDao.createReadingProgress({ userId, bookId, percentage: 10 });
      await bookDao.createReadingProgress({ userId: otherUser, bookId: bookId2, percentage: 50 });

      const results = await bookDao.findReadingProgressByUser(userId);
      expect(results).toHaveLength(1);
      expect(results[0].percentage).toBe(10);
    });
  });

  describe('softDeleteReadingProgress', () => {
    it('should set deletedAt on the progress entry', async () => {
      const rp = await bookDao.createReadingProgress({ userId, bookId });
      const deleted = await bookDao.softDeleteReadingProgress(rp._id);
      expect(deleted.deletedAt).toBeInstanceOf(Date);
    });

    it('should make entry unfindable by findReadingProgress', async () => {
      const rp = await bookDao.createReadingProgress({ userId, bookId });
      await bookDao.softDeleteReadingProgress(rp._id);
      const found = await bookDao.findReadingProgress(userId, bookId);
      expect(found).toBeNull();
    });
  });

  describe('softDeleteReadingProgressByBook', () => {
    it('should soft delete all progress for a book', async () => {
      await bookDao.createReadingProgress({ userId, bookId });
      await bookDao.createReadingProgress({ userId: new mongoose.Types.ObjectId(), bookId });

      const result = await bookDao.softDeleteReadingProgressByBook(bookId);
      expect(result.modifiedCount).toBe(2);

      const allProgress = await ReadingProgress.find({ bookId });
      allProgress.forEach((p) => {
        expect(p.deletedAt).toBeInstanceOf(Date);
      });
    });

    it('should not affect progress for other books', async () => {
      await bookDao.createReadingProgress({ userId, bookId });
      await bookDao.createReadingProgress({ userId: new mongoose.Types.ObjectId(), bookId: bookId2 });

      await bookDao.softDeleteReadingProgressByBook(bookId);

      const remaining = await ReadingProgress.find({ deletedAt: null });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].bookId.toString()).toBe(bookId2.toString());
    });
  });
});
