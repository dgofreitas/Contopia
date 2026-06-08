// Contopia — Parent DAO Tests (STORY-053: Weekly Aggregation, STORY-054: DeletionRequest)
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Book, ReadingProgress, ReadingSession } from '../../book/book-model.js';
import { Chapter } from '../../book/book-model.js';
import * as parentDao from '../parent-dao.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('Parent DAO — STORY-053', () => {
  let childId;
  let weekAgo;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    childId = new mongoose.Types.ObjectId();
    weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  });

  describe('getWeeklyBookCount', () => {
    it('should count books created in the last 7 days', async () => {
      await Book.create({ authorId: childId, title: 'Recent Book', createdAt: new Date() });
      const count = await parentDao.getWeeklyBookCount(childId);
      expect(count).toBe(1);
    });

    it('should exclude books created before the 7-day window', async () => {
      await Book.create({ authorId: childId, title: 'Old Book', createdAt: new Date('2025-01-01') });
      const count = await parentDao.getWeeklyBookCount(childId);
      expect(count).toBe(0);
    });

    it('should exclude soft-deleted books', async () => {
      await Book.create({ authorId: childId, title: 'Deleted', deletedAt: new Date() });
      const count = await parentDao.getWeeklyBookCount(childId);
      expect(count).toBe(0);
    });

    it('should return 0 when no books exist', async () => {
      const count = await parentDao.getWeeklyBookCount(childId);
      expect(count).toBe(0);
    });

    it('should only count books for the specified child', async () => {
      const otherChild = new mongoose.Types.ObjectId();
      await Book.create({ authorId: otherChild, title: 'Not Mine', createdAt: new Date() });
      const count = await parentDao.getWeeklyBookCount(childId);
      expect(count).toBe(0);
    });
  });

  describe('getWeeklyBooksReadCount', () => {
    it('should count distinct books with reading progress > 0% in last 7 days', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await ReadingProgress.create({
        userId: childId, bookId, percentage: 50, updatedAt: new Date(),
      });
      const count = await parentDao.getWeeklyBooksReadCount(childId);
      expect(count).toBe(1);
    });

    it('should exclude books with 0% progress', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await ReadingProgress.create({
        userId: childId, bookId, percentage: 0, updatedAt: new Date(),
      });
      const count = await parentDao.getWeeklyBooksReadCount(childId);
      expect(count).toBe(0);
    });

    it('should exclude soft-deleted reading progress', async () => {
      const bookId = new mongoose.Types.ObjectId();
      await ReadingProgress.create({
        userId: childId, bookId, percentage: 80, updatedAt: new Date(),
        deletedAt: new Date(),
      });
      const count = await parentDao.getWeeklyBooksReadCount(childId);
      expect(count).toBe(0);
    });

    it('should exclude progress updated before the 7-day window', async () => {
      const bookId = new mongoose.Types.ObjectId();
      // Use raw insert to bypass Mongoose timestamps override
      await ReadingProgress.collection.insertOne({
        userId: childId,
        bookId,
        percentage: 80,
        updatedAt: new Date('2025-01-01'),
        createdAt: new Date(),
      });
      const count = await parentDao.getWeeklyBooksReadCount(childId);
      expect(count).toBe(0);
    });

    it('should return 0 when no reading progress exists', async () => {
      const count = await parentDao.getWeeklyBooksReadCount(childId);
      expect(count).toBe(0);
    });
  });

  describe('getWeeklyReadingTimeForChild', () => {
    it('should sum reading time for sessions in the last 7 days', async () => {
      await ReadingSession.create({
        childId, bookId: new mongoose.Types.ObjectId(), durationMs: 60000,
        createdAt: new Date(),
      });
      const totalMs = await parentDao.getWeeklyReadingTimeForChild(childId);
      expect(totalMs).toBe(60000);
    });

    it('should exclude sessions before the 7-day window', async () => {
      await ReadingSession.create({
        childId, bookId: new mongoose.Types.ObjectId(), durationMs: 60000,
        createdAt: new Date('2025-01-01'),
      });
      const totalMs = await parentDao.getWeeklyReadingTimeForChild(childId);
      expect(totalMs).toBe(0);
    });

    it('should return 0 when no sessions exist', async () => {
      const totalMs = await parentDao.getWeeklyReadingTimeForChild(childId);
      expect(totalMs).toBe(0);
    });
  });

  describe('getChildBookTitlesWithCovers', () => {
    it('should return books with only title/coverAssetId/status/updatedAt', async () => {
      const book = await Book.create({
        authorId: childId, title: 'Safe Book', description: 'secret content',
        chapterIds: [new mongoose.Types.ObjectId()],
      });
      const books = await parentDao.getChildBookTitlesWithCovers(childId);
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Safe Book');
      expect(books[0].status).toBe('draft');
      expect(books[0].updatedAt).toBeDefined();
      // Privacy: MUST NOT include content fields
      expect(books[0].description).toBeUndefined();
      expect(books[0].chapterIds).toBeUndefined();
    });

    it('should exclude soft-deleted books', async () => {
      await Book.create({ authorId: childId, title: 'Active' });
      await Book.create({ authorId: childId, title: 'Deleted', deletedAt: new Date() });
      const books = await parentDao.getChildBookTitlesWithCovers(childId);
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Active');
    });

    it('should sort by updatedAt descending', async () => {
      const b1 = await Book.create({ authorId: childId, title: 'Old' });
      await Book.findByIdAndUpdate(b1._id, { updatedAt: new Date('2025-01-01') });
      const b2 = await Book.create({ authorId: childId, title: 'New' });
      await Book.findByIdAndUpdate(b2._id, { updatedAt: new Date('2026-06-01') });
      const books = await parentDao.getChildBookTitlesWithCovers(childId);
      expect(books[0].title).toBe('New');
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await Book.create({ authorId: childId, title: `Book ${i}` });
      }
      const page1 = await parentDao.getChildBookTitlesWithCovers(childId, { limit: 2, skip: 0 });
      const page2 = await parentDao.getChildBookTitlesWithCovers(childId, { limit: 2, skip: 2 });
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
    });

    it('should return empty array for child with no books', async () => {
      const books = await parentDao.getChildBookTitlesWithCovers(childId);
      expect(books).toEqual([]);
    });
  });

  describe('countChildBooks', () => {
    it('should count all non-deleted books for child', async () => {
      await Book.create({ authorId: childId, title: 'A' });
      await Book.create({ authorId: childId, title: 'B' });
      await Book.create({ authorId: childId, title: 'C', deletedAt: new Date() });
      const total = await parentDao.countChildBooks(childId);
      expect(total).toBe(2);
    });
  });

  // ── Pre-existing DAO functions ─────────────────────────────────────────────

  describe('findParentByIdWithChild', () => {
    it('should return null when parent does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await parentDao.findParentByIdWithChild(fakeId);
      expect(result).toBeNull();
    });
  });

  describe('getChildBookCount', () => {
    it('should return total count of non-deleted books for child', async () => {
      await Book.create({ authorId: childId, title: 'A' });
      await Book.create({ authorId: childId, title: 'B' });
      const count = await parentDao.getChildBookCount(childId);
      expect(count).toBe(2);
    });

    it('should exclude soft-deleted books', async () => {
      await Book.create({ authorId: childId, title: 'A', deletedAt: new Date() });
      const count = await parentDao.getChildBookCount(childId);
      expect(count).toBe(0);
    });
  });

  // ── DeletionRequest DAO Methods (STORY-054) ───────────────────────────────────

  describe('createDeletionRequest', () => {
    it('should create a deletion request with all required fields', async () => {
      const data = {
        parentId: new mongoose.Types.ObjectId(),
        childId: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      const doc = await parentDao.createDeletionRequest(data);
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
      expect(doc.status).toBe('pending');
      expect(doc.parentId.toString()).toBe(data.parentId.toString());
      expect(doc.childId.toString()).toBe(data.childId.toString());
    });
  });

  describe('findPendingDeletionByChild', () => {
    it('should find a pending deletion request for a child', async () => {
      const childId = new mongoose.Types.ObjectId();
      const data = {
        parentId: new mongoose.Types.ObjectId(),
        childId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      await parentDao.createDeletionRequest(data);
      const found = await parentDao.findPendingDeletionByChild(childId);
      expect(found).toBeDefined();
      expect(found.childId.toString()).toBe(childId.toString());
      expect(found.status).toBe('pending');
    });

    it('should return null when no pending request exists', async () => {
      const found = await parentDao.findPendingDeletionByChild(new mongoose.Types.ObjectId());
      expect(found).toBeNull();
    });

    it('should not return completed deletion requests', async () => {
      const childId = new mongoose.Types.ObjectId();
      const data = {
        parentId: new mongoose.Types.ObjectId(),
        childId,
        status: 'completed',
        expiresAt: new Date(Date.now() - 1000),
      };
      await parentDao.createDeletionRequest(data);
      const found = await parentDao.findPendingDeletionByChild(childId);
      expect(found).toBeNull();
    });
  });

  describe('findPendingDeletionByParentAndChild', () => {
    it('should find a pending request for a parent+child pair', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const childId = new mongoose.Types.ObjectId();
      await parentDao.createDeletionRequest({
        parentId, childId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      const found = await parentDao.findPendingDeletionByParentAndChild(parentId, childId);
      expect(found).toBeDefined();
      expect(found.status).toBe('pending');
    });

    it('should return null when no pending request exists for the pair', async () => {
      const found = await parentDao.findPendingDeletionByParentAndChild(
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      );
      expect(found).toBeNull();
    });

    it('should not return cancelled requests', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const childId = new mongoose.Types.ObjectId();
      const request = await parentDao.createDeletionRequest({
        parentId, childId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await parentDao.cancelDeletionRequest(request._id);
      const found = await parentDao.findPendingDeletionByParentAndChild(parentId, childId);
      expect(found).toBeNull();
    });
  });

  describe('cancelDeletionRequest', () => {
    it('should set status to cancelled and set cancelledAt', async () => {
      const request = await parentDao.createDeletionRequest({
        parentId: new mongoose.Types.ObjectId(),
        childId: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      const result = await parentDao.cancelDeletionRequest(request._id);
      expect(result.status).toBe('cancelled');
      expect(result.cancelledAt).toBeDefined();
      expect(new Date(result.cancelledAt).getTime()).toBeGreaterThan(0);
    });

    it('should return null when request does not exist', async () => {
      const result = await parentDao.cancelDeletionRequest(new mongoose.Types.ObjectId());
      expect(result).toBeNull();
    });
  });

  describe('findExpiredDeletionRequests', () => {
    it('should find expired pending requests', async () => {
      await parentDao.createDeletionRequest({
        parentId: new mongoose.Types.ObjectId(),
        childId: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      const results = await parentDao.findExpiredDeletionRequests();
      expect(results.length).toBe(1);
    });

    it('should not find non-expired requests', async () => {
      await parentDao.createDeletionRequest({
        parentId: new mongoose.Types.ObjectId(),
        childId: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // future
      });
      const results = await parentDao.findExpiredDeletionRequests();
      expect(results.length).toBe(0);
    });

    it('should not find expired but cancelled requests', async () => {
      const request = await parentDao.createDeletionRequest({
        parentId: new mongoose.Types.ObjectId(),
        childId: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      await parentDao.cancelDeletionRequest(request._id);
      const results = await parentDao.findExpiredDeletionRequests();
      expect(results.length).toBe(0);
    });

    it('should return empty array when no expired requests exist', async () => {
      const results = await parentDao.findExpiredDeletionRequests();
      expect(results.length).toBe(0);
    });
  });

  describe('markDeletionCompleted', () => {
    it('should set status to completed and set completedAt', async () => {
      const request = await parentDao.createDeletionRequest({
        parentId: new mongoose.Types.ObjectId(),
        childId: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() - 1000),
      });
      const result = await parentDao.markDeletionCompleted(request._id);
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(new Date(result.completedAt).getTime()).toBeGreaterThan(0);
    });

    it('should return null when request does not exist', async () => {
      const result = await parentDao.markDeletionCompleted(new mongoose.Types.ObjectId());
      expect(result).toBeNull();
    });
  });

  describe('findChildBooksWithChapters', () => {
    it('should return books with chapters for a child', async () => {
      const book = await Book.create({ authorId: childId, title: 'Test Book' });
      await Chapter.create({ bookId: book._id, order: 1, title: 'Ch1', content: 'Hello' });
      await Chapter.create({ bookId: book._id, order: 2, title: 'Ch2', content: 'World' });
      const books = await parentDao.findChildBooksWithChapters(childId);
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Test Book');
      expect(books[0].chapters).toHaveLength(2);
      expect(books[0].chapters[0].content).toBe('Hello');
      expect(books[0].chapters[1].content).toBe('World');
    });

    it('should return empty array when child has no books', async () => {
      const books = await parentDao.findChildBooksWithChapters(childId);
      expect(books).toEqual([]);
    });

    it('should exclude soft-deleted chapters', async () => {
      const book = await Book.create({ authorId: childId, title: 'Book' });
      await Chapter.create({ bookId: book._id, order: 1, title: 'Active', content: 'Active' });
      await Chapter.create({ bookId: book._id, order: 2, title: 'Deleted', content: 'Deleted', deletedAt: new Date() });
      const books = await parentDao.findChildBooksWithChapters(childId);
      expect(books[0].chapters).toHaveLength(1);
      expect(books[0].chapters[0].title).toBe('Active');
    });

    it('should exclude soft-deleted books', async () => {
      await Book.create({ authorId: childId, title: 'Deleted', deletedAt: new Date() });
      const books = await parentDao.findChildBooksWithChapters(childId);
      expect(books).toEqual([]);
    });

    it('should return chapters sorted by order', async () => {
      const book = await Book.create({ authorId: childId, title: 'Sorted' });
      await Chapter.create({ bookId: book._id, order: 3, title: 'Three', content: 'C' });
      await Chapter.create({ bookId: book._id, order: 1, title: 'One', content: 'A' });
      await Chapter.create({ bookId: book._id, order: 2, title: 'Two', content: 'B' });
      const books = await parentDao.findChildBooksWithChapters(childId);
      expect(books[0].chapters[0].order).toBe(1);
      expect(books[0].chapters[1].order).toBe(2);
      expect(books[0].chapters[2].order).toBe(3);
    });
  });

  // ── findDeletionStatusByParent (STORY-054 FIX) ──────────────────────────────────

  describe('findDeletionStatusByParent', () => {
    it('should return { childId, status, expiresAt } when pending deletion exists', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const childId = new mongoose.Types.ObjectId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await parentDao.createDeletionRequest({
        parentId,
        childId,
        expiresAt,
      });

      const result = await parentDao.findDeletionStatusByParent(parentId);
      expect(result).toBeDefined();
      expect(result.childId).toBe(childId.toString());
      expect(result.status).toBe('pending');
      expect(result.expiresAt).toBe(expiresAt.toISOString());
    });

    it('should return null when no pending deletion exists for parent', async () => {
      const result = await parentDao.findDeletionStatusByParent(new mongoose.Types.ObjectId());
      expect(result).toBeNull();
    });

    it('should return null for cancelled deletion requests', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const childId = new mongoose.Types.ObjectId();
      const request = await parentDao.createDeletionRequest({
        parentId,
        childId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await parentDao.cancelDeletionRequest(request._id);

      const result = await parentDao.findDeletionStatusByParent(parentId);
      expect(result).toBeNull();
    });

    it('should return null for completed deletion requests', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const childId = new mongoose.Types.ObjectId();
      const request = await parentDao.createDeletionRequest({
        parentId,
        childId,
        expiresAt: new Date(Date.now() - 1000),
      });
      await parentDao.markDeletionCompleted(request._id);

      const result = await parentDao.findDeletionStatusByParent(parentId);
      expect(result).toBeNull();
    });
  });
});