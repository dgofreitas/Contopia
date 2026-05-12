// Contopia — ReadingProgress Model Tests
// STORY-004: Core Data Model & Database Migrations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { ReadingProgress } from '../../book/book-model.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('ReadingProgress Model', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  describe('Schema Validation', () => {
    it('should create a reading progress with required fields', async () => {
      const userId = new mongoose.Types.ObjectId();
      const bookId = new mongoose.Types.ObjectId();
      const progress = await ReadingProgress.create({ userId, bookId });

      expect(progress).toBeDefined();
      expect(progress._id).toBeDefined();
      expect(progress.userId.toString()).toBe(userId.toString());
      expect(progress.bookId.toString()).toBe(bookId.toString());
      expect(progress.lastChapterId).toBeNull();
      expect(progress.lastPosition).toBe(0);
      expect(progress.percentage).toBe(0);
      expect(progress.deletedAt).toBeNull();
      // Only updatedAt, NOT createdAt
      expect(progress.updatedAt).toBeInstanceOf(Date);
      expect(progress.createdAt).toBeUndefined();
    });

    it('should enforce required userId', async () => {
      await expect(
        ReadingProgress.create({ bookId: new mongoose.Types.ObjectId() })
      ).rejects.toThrow();
    });

    it('should enforce required bookId', async () => {
      await expect(
        ReadingProgress.create({ userId: new mongoose.Types.ObjectId() })
      ).rejects.toThrow();
    });

    it('should default lastPosition to 0', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
      });
      expect(progress.lastPosition).toBe(0);
    });

    it('should default percentage to 0', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
      });
      expect(progress.percentage).toBe(0);
    });

    it('should accept custom lastPosition', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
        lastPosition: 42,
      });
      expect(progress.lastPosition).toBe(42);
    });

    it('should accept custom percentage', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
        percentage: 75,
      });
      expect(progress.percentage).toBe(75);
    });

    it('should accept custom lastChapterId', async () => {
      const chapterId = new mongoose.Types.ObjectId();
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
        lastChapterId: chapterId,
      });
      expect(progress.lastChapterId.toString()).toBe(chapterId.toString());
    });

    it('should reject percentage below 0', async () => {
      await expect(
        ReadingProgress.create({
          userId: new mongoose.Types.ObjectId(),
          bookId: new mongoose.Types.ObjectId(),
          percentage: -1,
        })
      ).rejects.toThrow();
    });

    it('should reject percentage above 100', async () => {
      await expect(
        ReadingProgress.create({
          userId: new mongoose.Types.ObjectId(),
          bookId: new mongoose.Types.ObjectId(),
          percentage: 101,
        })
      ).rejects.toThrow();
    });

    it('should accept percentage of exactly 0', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
        percentage: 0,
      });
      expect(progress.percentage).toBe(0);
    });

    it('should accept percentage of exactly 100', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
        percentage: 100,
      });
      expect(progress.percentage).toBe(100);
    });

    it('should reject negative lastPosition', async () => {
      await expect(
        ReadingProgress.create({
          userId: new mongoose.Types.ObjectId(),
          bookId: new mongoose.Types.ObjectId(),
          lastPosition: -5,
        })
      ).rejects.toThrow();
    });
  });

  describe('Unique Index', () => {
    it('should enforce unique userId + bookId combination', async () => {
      const userId = new mongoose.Types.ObjectId();
      const bookId = new mongoose.Types.ObjectId();

      await ReadingProgress.create({ userId, bookId });

      await expect(
        ReadingProgress.create({ userId, bookId })
      ).rejects.toThrow();
    });

    it('should allow same userId with different bookId', async () => {
      const userId = new mongoose.Types.ObjectId();
      await ReadingProgress.create({ userId, bookId: new mongoose.Types.ObjectId() });
      await ReadingProgress.create({ userId, bookId: new mongoose.Types.ObjectId() });
      const count = await ReadingProgress.countDocuments({ userId });
      expect(count).toBe(2);
    });
  });

  describe('Timestamps option', () => {
    it('should not have createdAt field', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
      });
      expect(progress.createdAt).toBeUndefined();
    });

    it('should update updatedAt on modification', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
      });
      const originalUpdatedAt = progress.updatedAt;

      // Wait a bit and update
      await new Promise((r) => setTimeout(r, 50));
      progress.percentage = 50;
      await progress.save();

      expect(progress.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Soft Delete', () => {
    it('should default deletedAt to null', async () => {
      const progress = await ReadingProgress.create({
        userId: new mongoose.Types.ObjectId(),
        bookId: new mongoose.Types.ObjectId(),
      });
      expect(progress.deletedAt).toBeNull();
    });
  });

  describe('Collection name', () => {
    it('should use reading_progress collection', () => {
      expect(ReadingProgress.collection.collectionName).toBe('reading_progress');
    });
  });
});
