/**
 * Contopia — Sync Service (STORY-048 Task 4)
 *
 * Handles offline-to-online sync protocol and conflict resolution.
 * On reconnect, dequeues pending operations from the syncQueue
 * and POSTs them to /api/v1/chapters/sync.
 *
 * Conflict strategy: Last-write-wins with server timestamp comparison.
 * During the spike, conflicts are logged but do NOT prompt the user.
 */
import { enqueueSyncOp, dequeueSyncOps, putChapter, getChapter } from './offline-db-service.js';
import apiClient from '../lib/api-client.js';

/**
 * Queue a pending write operation for when we're offline.
 *
 * @param {Object} params
 * @param {string} params.type — Operation type (e.g. 'chapter.update', 'book.update')
 * @param {string} [params.chapterId] — Chapter ID for chapter operations
 * @param {string} [params.content] — Chapter content
 * @param {number} [params.baseVersion] — Client's known version of the chapter
 * @param {number} [params.clientTimestamp] — Client-side timestamp (defaults to Date.now())
 * @returns {Promise<Object>} The enqueued operation with auto-generated id
 */
export async function queueSyncOp({ type, chapterId, content, baseVersion, clientTimestamp }) {
  return enqueueSyncOp({
    type,
    chapterId,
    content,
    baseVersion,
    clientTimestamp: clientTimestamp || new Date().toISOString(),
  });
}

/**
 * Called on reconnect (online event).
 *
 * 1. Check navigator.onLine
 * 2. Dequeue pending ops from offline-db syncQueue (limit 50)
 * 3. POST /api/v1/chapters/sync with operations
 * 4. Process results:
 *    — 'ok': remove from syncQueue (already dequeued), update local chapter version
 *    — 'conflict': keep local version, log warning (spike: no user prompt)
 * 5. Return { synced, conflicts, errors }
 *
 * @returns {Promise<{ synced: number, conflicts: number, errors: number }>}
 */
export async function syncOnReconnect() {
  // Bail out if not actually online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, conflicts: 0, errors: 0 };
  }

  // Dequeue pending ops from the syncQueue
  const ops = await dequeueSyncOps(50);

  if (ops.length === 0) {
    return { synced: 0, conflicts: 0, errors: 0 };
  }

  // Prepare the operations payload for the sync endpoint
  const operations = ops.map((op) => ({
    type: op.type,
    chapterId: op.chapterId,
    content: op.content,
    baseVersion: op.baseVersion,
    clientTimestamp: op.clientTimestamp,
  }));

  let synced = 0;
  let conflicts = 0;
  let errors = 0;

  try {
    const response = await apiClient.post('/v1/chapters/sync', { operations });
    const results = response.data?.results || response.data?.data?.results || [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const op = ops[i];

      if (!result) continue;

      if (result.status === 'ok') {
        synced++;
        // Update local chapter version from server response
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
        // Keep the local version as-is for now — spike logs but doesn't prompt
      } else {
        errors++;
        console.warn(`[sync] Unknown status "${result.status}" for chapter ${result.chapterId}`);
      }
    }
  } catch (apiError) {
    // Network/API error during sync — re-enqueue the ops so they can be retried
    errors = ops.length;
    console.error('[sync] API error during syncOnReconnect:', apiError);

    // Re-enqueue failed ops for next sync attempt
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
  }

  return { synced, conflicts, errors };
}

const syncService = {
  queueSyncOp,
  syncOnReconnect,
};

export default syncService;