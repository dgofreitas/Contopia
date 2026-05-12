// Contopia — ActivityLog DAO Tests
// STORY-004: Core Data Model & Database Migrations
// Note: ActivityLog is append-only — no soft delete, no update
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { ActivityLog } from '../../book/book-model.js';
import * as bookDao from '../../book/book-dao.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('ActivityLog DAO', () => {
  let actorId;
  let targetId;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    actorId = new mongoose.Types.ObjectId();
    targetId = new mongoose.Types.ObjectId();
  });

  describe('createActivityLog', () => {
    it('should create and return an activity log document', async () => {
      const log = await bookDao.createActivityLog({
        actorId,
        actorType: 'child',
        action: 'book.create',
        targetId,
        targetType: 'book',
        metadata: { title: 'My Book' },
      });

      expect(log).toBeDefined();
      expect(log._id).toBeDefined();
      expect(log.actorId.toString()).toBe(actorId.toString());
      expect(log.actorType).toBe('child');
      expect(log.action).toBe('book.create');
      expect(log.targetId.toString()).toBe(targetId.toString());
      expect(log.targetType).toBe('book');
      expect(log.metadata.title).toBe('My Book');
      expect(log.createdAt).toBeInstanceOf(Date);
    });

    it('should create log with minimum fields', async () => {
      const log = await bookDao.createActivityLog({
        actorId,
        actorType: 'system',
        action: 'system.maintenance',
      });

      expect(log).toBeDefined();
      expect(log.metadata).toEqual({});
      expect(log.targetId).toBeNull();
      expect(log.targetType).toBeNull();
    });
  });

  describe('findActivityLogs', () => {
    it('should return all logs when no filters provided', async () => {
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.create' });
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.publish' });
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.delete' });

      const logs = await bookDao.findActivityLogs();
      expect(logs).toHaveLength(3);
    });

    it('should filter by actorId', async () => {
      const otherActor = new mongoose.Types.ObjectId();
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.create' });
      await bookDao.createActivityLog({ actorId: otherActor, actorType: 'child', action: 'book.publish' });

      const logs = await bookDao.findActivityLogs({ actorId });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('book.create');
    });

    it('should filter by action', async () => {
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.create' });
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.publish' });

      const logs = await bookDao.findActivityLogs({ action: 'book.create' });
      expect(logs).toHaveLength(1);
    });

    it('should filter by targetId', async () => {
      const otherTarget = new mongoose.Types.ObjectId();
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.create', targetId, targetType: 'book' });
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.create', targetId: otherTarget, targetType: 'book' });

      const logs = await bookDao.findActivityLogs({ targetId });
      expect(logs).toHaveLength(1);
      expect(logs[0].targetId.toString()).toBe(targetId.toString());
    });

    it('should filter by targetType', async () => {
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.create', targetId, targetType: 'book' });
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'user.login', targetId: actorId, targetType: 'user' });

      const logs = await bookDao.findActivityLogs({ targetType: 'user' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('user.login');
    });

    it('should combine multiple filters', async () => {
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.create', targetId, targetType: 'book' });
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.publish', targetId, targetType: 'book' });
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'book.create', targetId: new mongoose.Types.ObjectId(), targetType: 'book' });

      const logs = await bookDao.findActivityLogs({ actorId, action: 'book.create' });
      expect(logs).toHaveLength(2);
    });

    it('should return empty array when no logs match', async () => {
      const logs = await bookDao.findActivityLogs({ action: 'nonexistent' });
      expect(logs).toEqual([]);
    });

    it('should sort by createdAt descending', async () => {
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'first' });
      await new Promise((r) => setTimeout(r, 50));
      await bookDao.createActivityLog({ actorId, actorType: 'child', action: 'second' });

      const logs = await bookDao.findActivityLogs({ actorId });
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('second');
      expect(logs[1].action).toBe('first');
    });

    it('should respect limit and skip pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await bookDao.createActivityLog({ actorId, actorType: 'child', action: `event.${i}` });
      }

      const firstThree = await bookDao.findActivityLogs({ limit: 3, skip: 0 });
      expect(firstThree).toHaveLength(3);

      const nextTwo = await bookDao.findActivityLogs({ limit: 3, skip: 3 });
      expect(nextTwo).toHaveLength(2);
    });
  });

  describe('No soft delete for ActivityLog', () => {
    it('should not have softDeleteActivityLog in bookDao', () => {
      expect(bookDao.softDeleteActivityLog).toBeUndefined();
    });

    it('should not have deletedAt in schema', () => {
      const schemaPaths = Object.keys(ActivityLog.schema.paths);
      expect(schemaPaths).not.toContain('deletedAt');
    });
  });
});
