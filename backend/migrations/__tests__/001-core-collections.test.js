// Contopia — Migration 001: Core Collections Test
// STORY-004: Core Data Model & Database Migrations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createRequire } from 'node:module';
import { startTestReplSet, stopTestReplSet } from '../../src/test-utils/mongo-test.js';

// Migrations are CommonJS — use createRequire to load them
const require = createRequire(import.meta.url);
const migration001 = require('../../migrations/001-create-collections');

describe('Migration 001: Create Core Collections & Indexes', () => {
  let db;

  beforeAll(async () => {
    const { uri } = await startTestReplSet();
    db = mongoose.connection.db;
  });

  afterAll(async () => {
    await stopTestReplSet();
  });

  beforeEach(async () => {
    // Drop all collections before each test
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      await db.dropCollection(col.name).catch(() => {});
    }
  });

  describe('up()', () => {
    it('should create all 5 core collections', async () => {
      await migration001.up(db);

      const collections = await db.listCollections().toArray();
      const names = collections.map((c) => c.name).sort();
      expect(names).toEqual(['activity_logs', 'assets', 'books', 'chapters', 'reading_progress']);
    });

    it('should create indexes on books collection', async () => {
      await migration001.up(db);
      const indexes = await db.collection('books').indexes();
      const indexKeys = indexes.map((idx) => JSON.stringify(idx.key));

      expect(indexes.length).toBeGreaterThanOrEqual(5); // _id + 4 custom indexes

      // Check specific indexes exist
      expect(indexKeys).toContain(JSON.stringify({ _id: 1 }));
      // Text index has key { _fts: 'text', _ftsx: 1 } - check by name instead
      expect(indexes.some((idx) => idx.name === 'title_text')).toBe(true);
      expect(indexKeys).toContain(JSON.stringify({ authorId: 1, status: 1, deletedAt: 1, createdAt: -1 }));
      expect(indexKeys).toContain(JSON.stringify({ authorId: 1, createdAt: -1, deletedAt: 1 }));
      expect(indexKeys).toContain(JSON.stringify({ status: 1, publishedAt: -1, deletedAt: 1 }));
    });

    it('should create indexes on chapters collection', async () => {
      await migration001.up(db);
      const indexes = await db.collection('chapters').indexes();
      const indexKeys = indexes.map((idx) => JSON.stringify(idx.key));

      expect(indexKeys).toContain(JSON.stringify({ _id: 1 }));
      expect(indexKeys).toContain(JSON.stringify({ bookId: 1, order: 1, deletedAt: 1 }));
      expect(indexKeys).toContain(JSON.stringify({ bookId: 1, deletedAt: 1 }));
    });

    it('should create unique compound index on chapters (bookId + order + deletedAt)', async () => {
      await migration001.up(db);
      const indexes = await db.collection('chapters').indexes();
      const compoundIdx = indexes.find(
        (idx) => idx.key.bookId === 1 && idx.key.order === 1 && idx.key.deletedAt === 1
      );
      expect(compoundIdx).toBeDefined();
      expect(compoundIdx.unique).toBe(true);
      expect(compoundIdx.partialFilterExpression).toEqual({ deletedAt: null });
    });

    it('should create indexes on assets collection', async () => {
      await migration001.up(db);
      const indexes = await db.collection('assets').indexes();
      const indexKeys = indexes.map((idx) => JSON.stringify(idx.key));

      expect(indexKeys).toContain(JSON.stringify({ _id: 1 }));
      expect(indexKeys).toContain(JSON.stringify({ bookId: 1, type: 1, deletedAt: 1 }));
      expect(indexKeys).toContain(JSON.stringify({ authorId: 1, deletedAt: 1 }));
    });

    it('should create unique compound index on reading_progress (userId + bookId)', async () => {
      await migration001.up(db);
      const indexes = await db.collection('reading_progress').indexes();
      const compoundIdx = indexes.find(
        (idx) => idx.key.userId === 1 && idx.key.bookId === 1
      );
      expect(compoundIdx).toBeDefined();
      expect(compoundIdx.unique).toBe(true);
    });

    it('should create indexes on reading_progress collection', async () => {
      await migration001.up(db);
      const indexes = await db.collection('reading_progress').indexes();
      const indexKeys = indexes.map((idx) => JSON.stringify(idx.key));

      expect(indexKeys).toContain(JSON.stringify({ _id: 1 }));
      expect(indexKeys).toContain(JSON.stringify({ userId: 1, bookId: 1 }));
      expect(indexKeys).toContain(JSON.stringify({ userId: 1, updatedAt: -1 }));
    });

    it('should create indexes on activity_logs collection', async () => {
      await migration001.up(db);
      const indexes = await db.collection('activity_logs').indexes();
      const indexKeys = indexes.map((idx) => JSON.stringify(idx.key));

      expect(indexKeys).toContain(JSON.stringify({ _id: 1 }));
      expect(indexKeys).toContain(JSON.stringify({ createdAt: 1 })); // TTL
      expect(indexKeys).toContain(JSON.stringify({ actorId: 1, createdAt: -1 }));
      expect(indexKeys).toContain(JSON.stringify({ action: 1, createdAt: -1 }));
      expect(indexKeys).toContain(JSON.stringify({ targetId: 1, targetType: 1 }));

      // Check TTL index
      const ttlIdx = indexes.find((idx) => idx.key.createdAt === 1);
      expect(ttlIdx).toBeDefined();
      expect(ttlIdx.expireAfterSeconds).toBe(90 * 24 * 60 * 60);
    });

    it('should be idempotent — running twice does not throw', async () => {
      await migration001.up(db);
      // Second run should not throw
      await expect(migration001.up(db)).resolves.not.toThrow();

      const collections = await db.listCollections().toArray();
      expect(collections).toHaveLength(5);
    });
  });

  describe('down()', () => {
    it('should drop all 5 core collections', async () => {
      await migration001.up(db);
      await migration001.down(db);

      const collections = await db.listCollections().toArray();
      expect(collections).toHaveLength(0);
    });

    it('should not throw when running down on already dropped collections', async () => {
      await migration001.up(db);
      await migration001.down(db);
      // Second down should not throw
      await expect(migration001.down(db)).resolves.not.toThrow();
    });
  });

  describe('up/down round trip', () => {
    it('should allow up → down → up cycle', async () => {
      await migration001.up(db);
      await migration001.down(db);
      await migration001.up(db);

      const collections = await db.listCollections().toArray();
      expect(collections).toHaveLength(5);
    });
  });
});
