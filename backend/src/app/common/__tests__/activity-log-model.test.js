// Contopia — ActivityLog Model Tests
// STORY-004: Core Data Model & Database Migrations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { ActivityLog } from '../../book/book-model.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('ActivityLog Model', () => {
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
    it('should create an activity log with required fields', async () => {
      const actorId = new mongoose.Types.ObjectId();
      const log = await ActivityLog.create({
        actorId,
        actorType: 'child',
        action: 'book.create',
      });

      expect(log).toBeDefined();
      expect(log._id).toBeDefined();
      expect(log.actorId.toString()).toBe(actorId.toString());
      expect(log.actorType).toBe('child');
      expect(log.action).toBe('book.create');
      expect(log.metadata).toEqual({});
      expect(log.targetId).toBeNull();
      expect(log.targetType).toBeNull();
      // Only createdAt, NOT updatedAt
      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.updatedAt).toBeUndefined();
    });

    it('should enforce required actorId', async () => {
      await expect(
        ActivityLog.create({ actorType: 'child', action: 'test' })
      ).rejects.toThrow();
    });

    it('should enforce required actorType', async () => {
      await expect(
        ActivityLog.create({ actorId: new mongoose.Types.ObjectId(), action: 'test' })
      ).rejects.toThrow();
    });

    it('should enforce required action', async () => {
      await expect(
        ActivityLog.create({
          actorId: new mongoose.Types.ObjectId(),
          actorType: 'child',
        })
      ).rejects.toThrow();
    });

    it('should enforce actorType enum values', async () => {
      await expect(
        ActivityLog.create({
          actorId: new mongoose.Types.ObjectId(),
          actorType: 'invalid',
          action: 'test',
        })
      ).rejects.toThrow();
    });

    it('should accept all valid actorType values', async () => {
      const actorId = new mongoose.Types.ObjectId();
      for (const type of ['child', 'parent', 'system']) {
        const log = await ActivityLog.create({ actorId, actorType: type, action: 'test' });
        expect(log.actorType).toBe(type);
      }
    });

    it('should enforce targetType enum values', async () => {
      await expect(
        ActivityLog.create({
          actorId: new mongoose.Types.ObjectId(),
          actorType: 'child',
          action: 'test',
          targetType: 'invalid',
        })
      ).rejects.toThrow();
    });

    it('should accept all valid targetType values', async () => {
      const actorId = new mongoose.Types.ObjectId();
      for (const type of ['book', 'chapter', 'asset', 'user', 'system']) {
        const log = await ActivityLog.create({
          actorId,
          actorType: 'child',
          action: 'test',
          targetType: type,
          targetId: new mongoose.Types.ObjectId(),
        });
        expect(log.targetType).toBe(type);
      }
    });

    it('should default metadata to empty object', async () => {
      const log = await ActivityLog.create({
        actorId: new mongoose.Types.ObjectId(),
        actorType: 'child',
        action: 'book.create',
      });
      expect(log.metadata).toEqual({});
    });

    it('should accept custom metadata', async () => {
      const log = await ActivityLog.create({
        actorId: new mongoose.Types.ObjectId(),
        actorType: 'child',
        action: 'book.create',
        metadata: { title: 'My Book', status: 'draft' },
      });
      expect(log.metadata.title).toBe('My Book');
      expect(log.metadata.status).toBe('draft');
    });

    it('should accept targetId and targetType', async () => {
      const targetId = new mongoose.Types.ObjectId();
      const log = await ActivityLog.create({
        actorId: new mongoose.Types.ObjectId(),
        actorType: 'child',
        action: 'book.publish',
        targetId,
        targetType: 'book',
      });
      expect(log.targetId.toString()).toBe(targetId.toString());
      expect(log.targetType).toBe('book');
    });

    it('should reject action exceeding 100 characters', async () => {
      await expect(
        ActivityLog.create({
          actorId: new mongoose.Types.ObjectId(),
          actorType: 'child',
          action: 'a'.repeat(101),
        })
      ).rejects.toThrow();
    });
  });

  describe('Timestamps: createdAt only, no updatedAt, no deletedAt', () => {
    it('should have createdAt but not updatedAt', async () => {
      const log = await ActivityLog.create({
        actorId: new mongoose.Types.ObjectId(),
        actorType: 'child',
        action: 'test',
      });
      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.updatedAt).toBeUndefined();
    });

    it('should NOT have deletedAt field in schema', () => {
      // ActivityLog should not have soft delete capability
      const schemaKeys = Object.keys(ActivityLog.schema.paths);
      expect(schemaKeys).not.toContain('deletedAt');
    });
  });

  describe('Collection name', () => {
    it('should use activity_logs collection', () => {
      expect(ActivityLog.collection.collectionName).toBe('activity_logs');
    });
  });
});
