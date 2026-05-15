// Contopia — GDPR/LGPD Account Cleanup (scheduled hard-delete of soft-deleted accounts)
import pino from 'pino';
import { Child } from '../auth/auth-model.js';
import { hardDeleteChildById } from '../auth/auth-dao.js';
import { purgeAssetsByAuthorManager } from '../storage/storage-manager.js';

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

  return { processed, errors };
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