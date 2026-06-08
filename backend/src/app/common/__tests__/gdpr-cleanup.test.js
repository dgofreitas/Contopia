// Contopia — GDPR Cleanup Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../auth/auth-model.js', () => {
  return { Child: { find: vi.fn() } };
});

vi.mock('../../auth/auth-dao.js', () => ({
  softDeleteChildById: vi.fn(),
  hardDeleteChildById: vi.fn(),
}));

vi.mock('../../storage/storage-manager.js', () => ({
  purgeAssetsByAuthorManager: vi.fn(),
}));

vi.mock('../../parent/parent-dao.js', () => ({
  findExpiredDeletionRequests: vi.fn(),
  markDeletionCompleted: vi.fn(),
}));

vi.mock('../../book/book-dao.js', () => ({
  createActivityLog: vi.fn(),
}));

vi.mock('../../book/book-model.js', () => ({
  Book: { find: vi.fn(), deleteMany: vi.fn() },
  Chapter: { deleteMany: vi.fn() },
  ReadingProgress: { deleteMany: vi.fn() },
  ReadingSession: { deleteMany: vi.fn() },
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn().mockResolvedValue(1),
    exists: vi.fn(), scanIterator: vi.fn(),
  },
}));

vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { cleanupExpiredAccounts, scheduleGdrpCleanup } from '../gdpr-cleanup.js';
import { Child } from '../../auth/auth-model.js';
import { hardDeleteChildById, softDeleteChildById } from '../../auth/auth-dao.js';
import { purgeAssetsByAuthorManager } from '../../storage/storage-manager.js';
import { findExpiredDeletionRequests, markDeletionCompleted } from '../../parent/parent-dao.js';
import { createActivityLog } from '../../book/book-dao.js';
import { Book, Chapter, ReadingProgress, ReadingSession } from '../../book/book-model.js';
import redis from '../../../config/redis.js';

describe('GDPR Cleanup', () => {
  // No parent beforeEach — each sub-describe handles its own setup
  describe('cleanupExpiredAccounts', () => {
    beforeEach(() => {
      // mockReset clears implementation AND calls; mockReturnValue sets fresh impl
      Child.find.mockReset();
      hardDeleteChildById.mockReset();
      purgeAssetsByAuthorManager.mockReset();
      findExpiredDeletionRequests.mockReset();
      redis.scanIterator.mockReset();
      redis.del.mockReset();
      // Default: no expired children
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });
      // Default: no expired DeletionRequests
      findExpiredDeletionRequests.mockResolvedValue([]);
      // Default: no Redis keys
      redis.scanIterator.mockReturnValue((async function* () { /* no keys */ })());
      redis.del.mockResolvedValue(1);
    });

    it('should find expired children, purge assets, and hard-delete', async () => {
      const expiredChildren = [
        { _id: 'c1', firstName: 'João' },
        { _id: 'c2', firstName: 'Maria' },
      ];
      // Mock: Child.find(...).limit(...).lean() returns the array
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(expiredChildren) }) });
      purgeAssetsByAuthorManager.mockResolvedValue(undefined);
      hardDeleteChildById.mockResolvedValue({ _id: 'c1' });

      const result = await cleanupExpiredAccounts();

      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
      expect(purgeAssetsByAuthorManager).toHaveBeenCalledWith('c1');
      expect(purgeAssetsByAuthorManager).toHaveBeenCalledWith('c2');
      expect(hardDeleteChildById).toHaveBeenCalledWith('c1');
      expect(hardDeleteChildById).toHaveBeenCalledWith('c2');
    });

    it('should return processed:0 when no expired children exist', async () => {
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });

      const result = await cleanupExpiredAccounts();

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(purgeAssetsByAuthorManager).not.toHaveBeenCalled();
    });

    it('should continue processing even if purge fails for one child', async () => {
      const expiredChildren = [
        { _id: 'c1', firstName: 'João' },
        { _id: 'c2', firstName: 'Maria' },
      ];
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(expiredChildren) }) });
      purgeAssetsByAuthorManager
        .mockRejectedValueOnce(new Error('S3 error'))
        .mockResolvedValueOnce(undefined);
      hardDeleteChildById
        .mockRejectedValueOnce(new Error('DB error')) // c1 purge fails, hard-delete also fails
        .mockResolvedValueOnce({ _id: 'c2' }); // c2 succeeds

      const result = await cleanupExpiredAccounts();

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  describe('scheduleGdrpCleanup', () => {
    beforeEach(() => {
      Child.find.mockReset();
      findExpiredDeletionRequests.mockReset();
      redis.scanIterator.mockReset();
      redis.del.mockReset();
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });
      findExpiredDeletionRequests.mockResolvedValue([]);
      redis.scanIterator.mockReturnValue((async function* () { /* no keys */ })());
      redis.del.mockResolvedValue(1);
    });

    it('should call cleanup immediately and return an interval object', async () => {
      const interval = scheduleGdrpCleanup(60 * 1000);

      // Let the immediate call run
      await new Promise((r) => setTimeout(r, 10));

      expect(typeof interval).toBe('object');
      clearInterval(interval);
    });
  });

  // ── DeletionRequest Processing (STORY-054) ──────────────────────────────────────

  describe('processExpiredDeletionRequests', () => {
    beforeEach(() => {
      findExpiredDeletionRequests.mockReset();
      softDeleteChildById.mockReset();
      markDeletionCompleted.mockReset();
      createActivityLog.mockReset();
      Book.find.mockReset();
      Chapter.deleteMany.mockReset();
      Book.deleteMany.mockReset();
      ReadingProgress.deleteMany.mockReset();
      ReadingSession.deleteMany.mockReset();
      purgeAssetsByAuthorManager.mockReset();
      Child.find.mockReset();
      redis.scanIterator.mockReset();
      redis.del.mockReset();
      // Default: no expired children (prevents processing from cleanupExpiredAccounts loop)
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });
      // Default: no Redis keys
      redis.scanIterator.mockReturnValue((async function* () { /* no keys */ })());
      redis.del.mockResolvedValue(1);
      // NOTE: do NOT set default for findExpiredDeletionRequests — each test must set it explicitly
    });

    it('should soft-delete child and mark request completed for expired DeletionRequests', async () => {
      // Arrange
      const deletionRequestId = 'dr1';
      const childId = 'child_1';
      const parentId = 'parent_1';
      const bookId = 'book_1';
      const mockRequest = { _id: deletionRequestId, childId: { toString: () => childId }, parentId: { toString: () => parentId }, status: 'pending' };
      findExpiredDeletionRequests.mockReturnValue([mockRequest]);
      Book.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([{ _id: bookId }]),
          }),
        }),
      });
      Chapter.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 3 }) }),
      });
      Book.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 1 }) }),
      });
      ReadingProgress.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 5 }) }),
      });
      ReadingSession.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 10 }) }),
      });
      purgeAssetsByAuthorManager.mockReturnValue(undefined);
      softDeleteChildById.mockReturnValue({ _id: childId });
      markDeletionCompleted.mockReturnValue({ _id: deletionRequestId, status: 'completed' });
      createActivityLog.mockReturnValue({});

      // Act
      const result = await cleanupExpiredAccounts();

      // Assert
      expect(result.deletionProcessed).toBe(1);
      expect(result.deletionErrors).toBe(0);
      // Verify cascade: Books found, Chapters/Books/ReadingProgress/ReadingSession hard-deleted
      expect(Book.find).toHaveBeenCalledWith({ authorId: childId });
      expect(Chapter.deleteMany).toHaveBeenCalledWith({ bookId: { $in: [bookId] } });
      expect(Book.deleteMany).toHaveBeenCalledWith({ authorId: childId });
      expect(ReadingProgress.deleteMany).toHaveBeenCalledWith({ userId: childId });
      expect(ReadingSession.deleteMany).toHaveBeenCalledWith({ childId: childId });
      expect(purgeAssetsByAuthorManager).toHaveBeenCalledWith(childId);
      expect(softDeleteChildById).toHaveBeenCalledWith(childId);
      expect(markDeletionCompleted).toHaveBeenCalledWith(deletionRequestId);
      expect(createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCOUNT_DELETION_COMPLETED',
          actorType: 'system',
        }),
      );
    });

    it('should revoke Redis sessions for child and parent', async () => {
      // Arrange
      const childId = 'child_2';
      const parentId = 'parent_2';
      const mockRequest = { _id: 'dr2', childId: { toString: () => childId }, parentId: { toString: () => parentId }, status: 'pending' };
      findExpiredDeletionRequests.mockReturnValue([mockRequest]);
      Book.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
        }),
      });
      Chapter.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      Book.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      ReadingProgress.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      ReadingSession.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      purgeAssetsByAuthorManager.mockReturnValue(undefined);
      softDeleteChildById.mockReturnValue({});
      markDeletionCompleted.mockReturnValue({});
      createActivityLog.mockReturnValue({});

      // Mock two session keys for child, one for parent
      const childKeys = async function* () {
        yield `session:${childId}:abc`;
        yield `session:${childId}:def`;
      };
      const parentKeys = async function* () {
        yield `parentSession:${parentId}:xyz`;
      };
      redis.scanIterator
        .mockReturnValueOnce(childKeys())
        .mockReturnValueOnce(parentKeys());

      // Act
      const result = await cleanupExpiredAccounts();

      // Assert
      expect(result.deletionProcessed).toBe(1);
      expect(redis.del).toHaveBeenCalledWith(`session:${childId}:abc`);
      expect(redis.del).toHaveBeenCalledWith(`session:${childId}:def`);
      expect(redis.del).toHaveBeenCalledWith(`parentSession:${parentId}:xyz`);
    });

    it('should continue processing when Redis revocation fails', async () => {
      // Arrange
      const childId = 'child_3';
      const parentId = 'parent_3';
      const mockRequest = { _id: 'dr3', childId: { toString: () => childId }, parentId: { toString: () => parentId }, status: 'pending' };
      findExpiredDeletionRequests.mockReturnValue([mockRequest]);
      Book.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
        }),
      });
      Chapter.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      Book.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      ReadingProgress.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      ReadingSession.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      purgeAssetsByAuthorManager.mockReturnValue(undefined);
      softDeleteChildById.mockReturnValue({});
      markDeletionCompleted.mockReturnValue({});
      createActivityLog.mockReturnValue({});

      // Redis scanIterator throws
      redis.scanIterator.mockReturnValue((async function* () {
        throw new Error('Redis connection lost');
      })());

      // Act
      const result = await cleanupExpiredAccounts();

      // Assert: still processes successfully despite Redis errors
      expect(result.deletionProcessed).toBe(1);
      expect(result.deletionErrors).toBe(0);
      expect(softDeleteChildById).toHaveBeenCalledWith(childId);
    });

    it('should return 0 processed when no expired DeletionRequests exist', async () => {
      // Arrange
      findExpiredDeletionRequests.mockResolvedValue([]);
      Child.find.mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });

      // Act
      const result = await cleanupExpiredAccounts();

      // Assert
      expect(result.deletionProcessed).toBe(0);
      expect(result.deletionErrors).toBe(0);
      expect(softDeleteChildById).not.toHaveBeenCalled();
    });

    it('should increment deletionErrors when cascade fails', async () => {
      // Arrange
      const childId = 'c4';
      const parentId = 'p4';
      findExpiredDeletionRequests.mockResolvedValue([
        { _id: 'dr4', childId: { toString: () => childId }, parentId: { toString: () => parentId }, status: 'pending' },
      ]);
      Book.find.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) });
      Chapter.deleteMany.mockResolvedValue({ deletedCount: 0 });
      Book.deleteMany.mockRejectedValue(new Error('DB error')); // Book cascade fails

      // Act
      const result = await cleanupExpiredAccounts();

      // Assert
      expect(result.deletionProcessed).toBe(0);
      expect(result.deletionErrors).toBe(1);
    });

    it('should handle ActivityLog failure gracefully during deletion processing', async () => {
      // Arrange
      const childId = 'c5';
      const parentId = 'p5';
      const mockRequest = { _id: 'dr5', childId: { toString: () => childId }, parentId: { toString: () => parentId }, status: 'pending' };
      findExpiredDeletionRequests.mockReturnValue([mockRequest]);
      Book.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }),
        }),
      });
      Chapter.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      Book.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      ReadingProgress.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      ReadingSession.deleteMany.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) }),
      });
      purgeAssetsByAuthorManager.mockReturnValue(undefined);
      softDeleteChildById.mockReturnValue({});
      markDeletionCompleted.mockReturnValue({});
      createActivityLog.mockRejectedValue(new Error('Log error'));

      // Act
      const result = await cleanupExpiredAccounts();

      // Assert: still marks as processed
      expect(result.deletionProcessed).toBe(1);
      expect(markDeletionCompleted).toHaveBeenCalled();
    });
  });
});