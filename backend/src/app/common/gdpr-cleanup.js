// Contopia — GDPR/LGPD Account Cleanup (scheduled hard-delete of soft-deleted accounts)
import pino from 'pino';
import { Child } from '../auth/auth-model.js';
import { hardDeleteChildById, softDeleteChildById, createAuditLog } from '../auth/auth-dao.js';
import { Book, Chapter, ReadingProgress, ReadingSession } from '../book/book-model.js';
import { purgeAssetsByAuthorManager } from '../storage/storage-manager.js';
import { findExpiredDeletionRequests, markDeletionCompleted } from '../parent/parent-dao.js';
import { createActivityLog } from '../book/book-dao.js';
import redis from '../../config/redis.js';

const logger = pino({ name: 'gdpr-cleanup', level: process.env.LOG_LEVEL || 'info' });

/**
 * Find and permanently delete all children whose deletedAt is older than 30 days.
 * Purges their assets first (best-effort), then hard-deletes the document.
 */
export async function cleanupExpiredAccounts() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const BATCH_SIZE = 100;
  let processed = 0;
  let errors = 0;
  let batchCount = 0;
  let hasMore = true;

  logger.info('Starting GDPR cleanup for expired accounts');

  while (hasMore) {
    batchCount++;
    // Find soft-deleted children past the 30-day grace period, batched
    const expiredChildren = await Child.find({ deletedAt: { $lt: cutoff } })
      .limit(BATCH_SIZE)
      .lean();

    if (expiredChildren.length === 0) {
      hasMore = false;
      break;
    }

    if (expiredChildren.length < BATCH_SIZE) {
      hasMore = false;
    }

    logger.info({ batch: batchCount, count: expiredChildren.length }, 'Processing GDPR cleanup batch');

    for (const child of expiredChildren) {
      try {
        // Purge assets (best-effort)
        try {
          await purgeAssetsByAuthorManager(child._id.toString());
        } catch (purgeErr) {
          logger.warn({ err: purgeErr, childId: child._id }, 'Asset purge failed during GDPR cleanup — continuing');
        }

        // Hard-delete the child document
        await hardDeleteChildById(child._id.toString());
        processed++;
      } catch (err) {
        errors++;
        logger.warn({ err, childId: child._id }, 'Failed to hard-delete expired account during GDPR cleanup');
      }
    }
  }

  logger.info({ processed, errors, batches: batchCount }, 'GDPR cleanup completed');

  // ── Process Expired DeletionRequests (STORY-054) ────────────────────────────
  const deletionResult = await processExpiredDeletionRequests();

  return { processed, errors, ...deletionResult };
}

/**
 * Find and process expired DeletionRequests (status='pending' where expiresAt < now).
 * For each: hard-delete cascade (Books→Chapters, Assets, ReadingProgress, ReadingSession),
 * purge S3 assets, soft-delete Child, revoke Redis sessions, create ActivityLog,
 * mark DeletionRequest completed.
 */
async function processExpiredDeletionRequests() {
  let deletionProcessed = 0;
  let deletionErrors = 0;

  logger.info('Processing expired DeletionRequests');

  const expiredRequests = await findExpiredDeletionRequests();

  for (const request of expiredRequests) {
    try {
      const childId = request.childId.toString();
      const parentId = request.parentId.toString();

      // 1. Find all books by this child (needed for chapter cascade)
      const books = await Book.find({ authorId: childId }).select('_id').lean().exec();
      const bookIds = books.map((b) => b._id);

      // 2. Hard-delete all Chapters where bookId in books
      if (bookIds.length > 0) {
        await Chapter.deleteMany({ bookId: { $in: bookIds } }).lean().exec();
      }

      // 3. Hard-delete all Books by this child
      await Book.deleteMany({ authorId: childId }).lean().exec();

      // 4. Hard-delete all ReadingProgress for this child
      await ReadingProgress.deleteMany({ userId: childId }).lean().exec();

      // 5. Hard-delete all ReadingSession for this child
      await ReadingSession.deleteMany({ childId: childId }).lean().exec();

      // 6. Purge S3 assets (covers, files) for this child
      try {
        await purgeAssetsByAuthorManager(childId);
      } catch (purgeErr) {
        logger.warn({ err: purgeErr, childId }, 'Asset purge failed during DeletionRequest processing — continuing');
      }

      // 7. Soft-delete Child (existing cleanup will hard-delete after 30 days)
      await softDeleteChildById(childId);

      // 8. Revoke all Redis sessions for child
      try {
        const childPattern = `session:${childId}:*`;
        for await (const key of redis.scanIterator({ match: childPattern })) {
          await redis.del(key);
        }
      } catch (redisErr) {
        logger.warn({ err: redisErr, childId }, 'Failed to revoke child sessions during deletion');
      }

      // 9. Revoke all Redis sessions for parent
      try {
        const parentPattern = `parentSession:${parentId}:*`;
        for await (const key of redis.scanIterator({ match: parentPattern })) {
          await redis.del(key);
        }
      } catch (redisErr) {
        logger.warn({ err: redisErr, parentId }, 'Failed to revoke parent sessions during deletion');
      }

      // 10. ActivityLog: ACCOUNT_DELETION_COMPLETED (actor: system)
      try {
        await createActivityLog({
          actorId: childId,
          actorType: 'system',
          action: 'ACCOUNT_DELETION_COMPLETED',
          targetId: childId,
          targetType: 'user',
          metadata: { deletionRequestId: request._id.toString(), parentId },
        });
      } catch (logErr) {
        logger.warn({ err: logErr }, 'ActivityLog creation failed for deletion completion');
      }

      // 11. Mark DeletionRequest as completed
      await markDeletionCompleted(request._id);

      deletionProcessed++;
      logger.info({ childId, deletionRequestId: request._id }, 'DeletionRequest completed — child cascade-deleted');
    } catch (err) {
      deletionErrors++;
      logger.warn({ err, childId: request.childId }, 'Failed to process expired DeletionRequest');
    }
  }

  logger.info({ deletionProcessed, deletionErrors }, 'Expired DeletionRequests processed');

  return { deletionProcessed, deletionErrors };
}

/**
 * Schedule periodic GDPR cleanup.
 * @param {number} intervalMs - Interval in ms (default 24h)
 */
export function scheduleGdrpCleanup(intervalMs = 24 * 60 * 60 * 1000) {
  logger.info({ intervalMs }, 'GDPR cleanup scheduler started');

  // Run immediately on startup
  cleanupExpiredAccounts().catch((err) => {
    logger.error({ err }, 'Initial GDPR cleanup failed');
  });

  return setInterval(() => {
    cleanupExpiredAccounts().catch((err) => {
      logger.error({ err }, 'Scheduled GDPR cleanup failed');
    });
  }, intervalMs);
}