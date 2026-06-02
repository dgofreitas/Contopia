/**
 * Contopia — Sync Service (STORY-048 Task 4, STORY-050 productionized)
 *
 * Handles offline-to-online sync protocol and conflict resolution.
 * On reconnect, dequeues pending operations from the syncQueue
 * and POSTs them to /api/v1/chapters/sync.
 *
 * Conflict strategy: Last-write-wins with server timestamp comparison.
 * During the spike, conflicts are logged but do NOT prompt the user.
 */
import { enqueueSyncOp, dequeueSyncOps, putChapter, getChapter, getSyncQueue } from './offline-db-service.js';
import apiClient from '../lib/api-client.js';

const MAX_RETRIES = 5;
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Queue a pending write operation for when we're offline.
 * Performs deduplication: if an existing op with same {type, chapterId}
 * exists in the sync queue, update it instead of adding a duplicate.
 *
 * @param {Object} params
 * @param {string} params.type — Operation type (e.g. 'chapter.update', 'chapter.create')
 * @param {string} [params.chapterId] — Chapter ID for chapter operations
 * @param {string} [params.bookId] — Book ID for chapter.create operations
 * @param {string} [params.title] — Title for chapter.create operations
 * @param {string} [params.content] — Chapter content
 * @param {number} [params.baseVersion] — Client's known version of the chapter
 * @param {string} [params.clientTimestamp] — Client-side timestamp
 * @param {string} [params.tempChapterId] — Temporary client-side UUID for chapter.create
 * @param {Function} [params.onProgress] — Progress callback
 * @returns {Promise<Object>} The enqueued operation with auto-generated id
 */
export async function queueSyncOp({ type, chapterId, bookId, title, content, baseVersion, clientTimestamp, tempChapterId }) {
  if (chapterId && (type === 'chapter.update' || type === 'chapter.update')) {
    try {
      const existingQueue = await getSyncQueue();
      const duplicate = existingQueue.find(
        (op) => op.type === type && op.chapterId === chapterId
      );
      if (duplicate) {
        const { updateSyncOp } = await import('./offline-db-service.js');
        await updateSyncOp(duplicate.id, {
          content,
          baseVersion: baseVersion ?? duplicate.baseVersion,
          clientTimestamp: clientTimestamp || new Date().toISOString(),
        });
        return { ...duplicate, content, baseVersion: baseVersion ?? duplicate.baseVersion, clientTimestamp: clientTimestamp || new Date().toISOString() };
      }
    } catch (err) {
      console.warn('[sync] Deduplication check failed, proceeding with enqueue:', err);
    }
  }

  return enqueueSyncOp({
    type,
    chapterId,
    bookId,
    title,
    content,
    baseVersion,
    clientTimestamp: clientTimestamp || new Date().toISOString(),
    tempChapterId,
  });
}

/**
 * Called on reconnect (online event).
 * Includes retry with exponential backoff and progress callbacks.
 *
 * @param {Object} [options]
 * @param {Function} [options.onProgress] — Called with { synced, total, currentOp } during sync
 * @returns {Promise<{ synced: number, conflicts: number, errors: number }>}
 */
export async function syncOnReconnect({ onProgress } = {}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, conflicts: 0, errors: 0 };
  }

  const ops = await dequeueSyncOps(50);

  if (ops.length === 0) {
    return { synced: 0, conflicts: 0, errors: 0 };
  }

  const total = ops.length;
  let synced = 0;
  let conflicts = 0;
  let errors = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const operations = ops.map((op) => ({
        type: op.type,
        chapterId: op.chapterId,
        bookId: op.bookId,
        title: op.title,
        content: op.content,
        baseVersion: op.baseVersion,
        clientTimestamp: op.clientTimestamp,
        tempChapterId: op.tempChapterId,
      }));

      const response = await apiClient.post('/v1/chapters/sync', { operations });
      const results = response.data?.results || response.data?.data?.results || [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const op = ops[i];

        if (!result) continue;

        if (onProgress) {
          onProgress({ synced: synced + conflicts + 1, total, currentOp: op });
        }

        if (result.status === 'ok') {
          synced++;
          if (result.chapterId && (result.serverVersion !== undefined)) {
            try {
              const localChapter = await getChapter(result.chapterId);
              if (localChapter) {
                await putChapter({
                  ...localChapter,
                  version: result.serverVersion,
                  content: result.serverContent ?? localChapter.content,
                  updatedAt: result.serverTimestamp ?? Date.now(),
                  isLocalOnly: false,
                });
              }
            } catch (updateErr) {
              console.warn('[sync] Failed to update local chapter version:', updateErr);
            }
          }
        } else if (result.status === 'conflict') {
          conflicts++;
          console.warn(
            `[sync] Conflict for chapter ${result.chapterId}: server version ${result.serverVersion}, local baseVersion ${op.baseVersion}. ` +
            'Keeping local version (spike: no user prompt).'
          );
        } else {
          errors++;
          console.warn(`[sync] Unknown status "${result.status}" for chapter ${result.chapterId}`);
        }
      }

      return { synced, conflicts, errors };
    } catch (apiError) {
      if (attempt < MAX_RETRIES) {
        console.warn(`[sync] Sync attempt ${attempt + 1} failed, retrying in ${BACKOFF_DELAYS[attempt]}ms...`);
        await sleep(BACKOFF_DELAYS[attempt]);
      } else {
        errors = ops.length;
        console.error('[sync] API error during syncOnReconnect after all retries:', apiError);

        for (const op of ops) {
          try {
            await enqueueSyncOp({
              type: op.type,
              chapterId: op.chapterId,
              content: op.content,
              baseVersion: op.baseVersion,
              clientTimestamp: op.clientTimestamp,
            });
          } catch (requeueErr) {
            console.warn('[sync] Failed to re-enqueue op:', requeueErr);
          }
        }

        return { synced, conflicts, errors };
      }
    }
  }

  return { synced, conflicts, errors };
}

const syncService = {
  queueSyncOp,
  syncOnReconnect,
};

export default syncService;