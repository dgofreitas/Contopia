// Contopia — Chapter Model Tests
// STORY-004: Core Data Model & Database Migrations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Chapter } from '../../book/book-model.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('Chapter Model', () => {
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
    it('should create a chapter with minimum required fields', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({
        bookId,
        order: 100,
        title: 'Capítulo 1: O Início',
      });

      expect(chapter).toBeDefined();
      expect(chapter._id).toBeDefined();
      expect(chapter.bookId.toString()).toBe(bookId.toString());
      expect(chapter.order).toBe(100);
      expect(chapter.title).toBe('Capítulo 1: O Início');
      expect(chapter.content).toBe('');
      expect(chapter.wordCount).toBe(0);
      expect(chapter.deletedAt).toBeNull();
      expect(chapter.createdAt).toBeInstanceOf(Date);
      expect(chapter.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce required bookId', async () => {
      await expect(
        Chapter.create({ order: 100, title: 'No Book' })
      ).rejects.toThrow();
    });

    it('should enforce required order', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await expect(
        Chapter.create({ bookId, title: 'No Order' })
      ).rejects.toThrow();
    });

    it('should enforce required title', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await expect(
        Chapter.create({ bookId, order: 100 })
      ).rejects.toThrow();
    });

    it('should reject order below min (0)', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await expect(
        Chapter.create({ bookId, order: -1, title: 'Negative' })
      ).rejects.toThrow();
    });

    it('should accept order of exactly 0', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({ bookId, order: 0, title: 'Zero Chapter' });
      expect(chapter.order).toBe(0);
    });

    it('should trim title', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({ bookId, order: 100, title: '  Trimmed Title  ' });
      expect(chapter.title).toBe('Trimmed Title');
    });

    it('should reject title exceeding 200 characters', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await expect(
        Chapter.create({ bookId, order: 100, title: 'A'.repeat(201) })
      ).rejects.toThrow();
    });

    it('should accept title of exactly 200 characters', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({ bookId, order: 100, title: 'A'.repeat(200) });
      expect(chapter.title).toHaveLength(200);
    });

    it('should default content to empty string', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({ bookId, order: 100, title: 'Default Content' });
      expect(chapter.content).toBe('');
    });

    it('should default wordCount to 0', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({ bookId, order: 100, title: 'Default Word Count' });
      expect(chapter.wordCount).toBe(0);
    });

    it('should reject negative wordCount', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await expect(
        Chapter.create({ bookId, order: 100, title: 'Bad Count', wordCount: -5 })
      ).rejects.toThrow();
    });

    it('should accept custom content and wordCount', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({
        bookId,
        order: 100,
        title: 'Custom',
        content: '<p>Hello world</p>',
        wordCount: 42,
      });
      expect(chapter.content).toBe('<p>Hello world</p>');
      expect(chapter.wordCount).toBe(42);
    });
  });

  describe('Soft Delete', () => {
    it('should default deletedAt to null', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({ bookId, order: 100, title: 'Active' });
      expect(chapter.deletedAt).toBeNull();
    });

    it('should allow setting deletedAt for soft delete', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const chapter = await Chapter.create({ bookId, order: 100, title: 'To Delete' });
      const now = new Date();
      chapter.deletedAt = now;
      await chapter.save();

      const notFound = await Chapter.findOne({ _id: chapter._id, deletedAt: null });
      expect(notFound).toBeNull();

      const found = await Chapter.findById(chapter._id);
      expect(found.deletedAt).toEqual(now);
    });
  });

  describe('Compound Index', () => {
    it('should enforce unique bookId + order for non-deleted chapters', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await Chapter.create({ bookId, order: 100, title: 'First' });
      // Second with same bookId + order should fail
      await expect(
        Chapter.create({ bookId, order: 100, title: 'Duplicate' })
      ).rejects.toThrow();
    });

    it('should allow same bookId + order after soft-deleting the first', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const first = await Chapter.create({ bookId, order: 100, title: 'Original' });
      // Soft delete the first
      first.deletedAt = new Date();
      await first.save();

      // Now insert with same bookId + order — should succeed
      const replacement = await Chapter.create({ bookId, order: 100, title: 'Replacement' });
      expect(replacement).toBeDefined();
      expect(replacement.title).toBe('Replacement');
    });

    it('should allow different bookIds with same order', async () => {
      const bookA = new mongoose.Types.ObjectId();
      const bookB = new mongoose.Types.ObjectId();
      const a1 = await Chapter.create({ bookId: bookA, order: 100, title: 'Book A Ch1' });
      const b1 = await Chapter.create({ bookId: bookB, order: 100, title: 'Book B Ch1' });
      expect(a1).toBeDefined();
      expect(b1).toBeDefined();
    });
  });

  describe('Collection name', () => {
    it('should use chapters collection', () => {
      expect(Chapter.collection.collectionName).toBe('chapters');
    });
  });
});
