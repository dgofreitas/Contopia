/**
 * Contopia — Offline DB Service (STORY-048 Task 3, STORY-050 productionized)
 *
 * Extends the existing `contopia-autosave` IndexedDB from v1→v2.
 * v1: drafts store (from autosave-service.js)
 * v2: adds books, chapters, syncQueue stores
 *
 * Validates AC2 (content survives refresh + restart)
 * and NFR-PERF-06 (local save < 100ms).
 */

import storageMonitor from './storage-monitor.js';

const DB_NAME = 'contopia-autosave';
const DB_VERSION = 2;

const STORES = {
  BOOKS: 'books',
  CHAPTERS: 'chapters',
  SYNC_QUEUE: 'syncQueue',
};

let persistentStorageRequested = false;

async function ensurePersistentStorage() {
  if (!persistentStorageRequested) {
    persistentStorageRequested = true;
    try {
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        await navigator.storage.persist();
      }
    } catch {
      // non-critical
    }
  }
}
  } catch {
    // non-critical
  }
}

async function ensurePersistentStorage() {
  if (!persistentStorageRequested) {
    persistentStorageRequested = true;
    try {
      await navigator.storage.persist();
    } catch {
      // non-critical
    }
  }
}

/**
 * Open (or upgrade) the IndexedDB to the current version.
 * Creates books, chapters, and syncQueue stores on v2 upgrade.
 * Preserves existing drafts store from v1.
 *
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Preserve existing drafts store from v1 (autosave-service.js)
      // It's created automatically when opening v1 for the first time.
      // On upgrade from v1→v2, drafts store already exists.

      // v2: books store — book metadata + content for offline reading
      if (!db.objectStoreNames.contains(STORES.BOOKS)) {
        const booksStore = db.createObjectStore(STORES.BOOKS, { keyPath: 'bookId' });
        booksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // v2: chapters store — chapter content + version for sync conflict detection
      if (!db.objectStoreNames.contains(STORES.CHAPTERS)) {
        const chaptersStore = db.createObjectStore(STORES.CHAPTERS, { keyPath: 'chapterId' });
        chaptersStore.createIndex('bookId', 'bookId', { unique: false });
        chaptersStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // v2: syncQueue store — pending write ops queued while offline
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/** Close a DB handle safely. */
function closeDB(db) {
  if (db && !db.closed) {
    db.close();
  }
}

// ─── Books CRUD ─────────────────────────────────────────────────────────────

/**
 * Put (insert or update) a book record.
 *
 * @param {Object} book — Must include `bookId`. Optional: title, author, content, updatedAt, etc.
 * @returns {Promise<Object>} The stored book object.
 */
export async function putBook(book) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BOOKS, 'readwrite');
      const store = tx.objectStore(STORES.BOOKS);
      store.put(book);
      tx.oncomplete = () => resolve(book);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Get a book by bookId.
 *
 * @param {string} bookId
 * @returns {Promise<Object|null>}
 */
export async function getBook(bookId) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BOOKS, 'readonly');
      const store = tx.objectStore(STORES.BOOKS);
      const request = store.get(bookId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    closeDB(db);
  }
}

// ─── Chapters CRUD ──────────────────────────────────────────────────────────

/**
 * Put (insert or update) a chapter record.
 *
 * @param {Object} chapter — Must include `chapterId`. Optional: bookId, content, version, updatedAt, etc.
 * @returns {Promise<Object>} The stored chapter object.
 */
export async function putChapter(chapter) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CHAPTERS, 'readwrite');
      const store = tx.objectStore(STORES.CHAPTERS);
      store.put(chapter);
      tx.oncomplete = () => resolve(chapter);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Get a chapter by chapterId.
 *
 * @param {string} chapterId
 * @returns {Promise<Object|null>}
 */
export async function getChapter(chapterId) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CHAPTERS, 'readonly');
      const store = tx.objectStore(STORES.CHAPTERS);
      const request = store.get(chapterId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Store multiple chapters at once (batch put).
 * Useful for initial book download or sync.
 *
 * @param {string} bookId — Book ID to tag all chapters with.
 * @param {Object[]} chapters — Array of chapter objects (each must have `chapterId`).
 * @returns {Promise<Object[]>} Array of stored chapter objects.
 */
export async function putChaptersByBook(bookId, chapters) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CHAPTERS, 'readwrite');
      const store = tx.objectStore(STORES.CHAPTERS);
      const results = [];

      for (const chapter of chapters) {
        const enriched = { ...chapter, bookId };
        store.put(enriched);
        results.push(enriched);
      }

      tx.oncomplete = () => resolve(results);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Get all chapters for a book, using the bookId index.
 *
 * @param {string} bookId
 * @returns {Promise<Object[]>}
 */
export async function getChaptersByBook(bookId) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CHAPTERS, 'readonly');
      const store = tx.objectStore(STORES.CHAPTERS);
      const index = store.index('bookId');
      const request = index.getAll(bookId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } finally {
    closeDB(db);
  }
}

// ─── Sync Queue ──────────────────────────────────────────────────────────────

/**
 * Enqueue a sync operation for later processing (when back online).
 *
 * @param {Object} op — Must include `type` (e.g. 'chapter.update', 'book.update').
 *                       Optional: payload, timestamp (defaults to Date.now()).
 * @returns {Promise<Object>} The stored op with auto-generated `id`.
 */
export async function enqueueSyncOp(op) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const enriched = {
        ...op,
        timestamp: op.timestamp || Date.now(),
      };
      const request = store.add(enriched);
      request.onsuccess = () => {
        // result holds the generated key (id)
        resolve({ ...enriched, id: request.result });
      };
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Dequeue (retrieve and remove) up to `limit` sync operations,
 * ordered by timestamp ascending (FIFO).
 *
 * @param {number} [limit=50] — Max ops to dequeue.
 * @returns {Promise<Object[]>} Array of dequeued ops (with their `id`s).
 */
export async function dequeueSyncOps(limit = 50) {
  const db = await openDB();
  try {
    // Read all ops
    const ops = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('timestamp');
      const request = index.getAll(null);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const sorted = ops.sort((a, b) => a.timestamp - b.timestamp).slice(0, limit);

    if (sorted.length === 0) {
      return [];
    }

    // Delete dequeued ops in a separate transaction
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      for (const op of sorted) {
        store.delete(op.id);
      }
      tx.oncomplete = () => resolve(sorted);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Clear the entire sync queue.
 *
 * @returns {Promise<void>}
 */
export async function clearSyncQueue() {
  const db = await openDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Get the entire sync queue (without removing entries).
 *
 * @returns {Promise<Object[]>}
 */
export async function getSyncQueue() {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Update an existing sync operation by id.
 *
 * @param {number} id — The auto-generated id of the op.
 * @param {Object} updates — Fields to update.
 * @returns {Promise<void>}
 */
export async function updateSyncOp(id, updates) {
  const db = await openDB();
  try {
    const existing = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!existing) {
      console.warn(`[offlineDB] updateSyncOp: no op found with id ${id}`);
      return;
    }

    const updated = { ...existing, ...updates, id };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      store.put(updated);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Get the count of pending sync operations in the queue.
 *
 * @returns {Promise<number>}
 */
export async function getSyncQueueCount() {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    closeDB(db);
  }
}

/**
 * Delete a sync operation by type and chapterId.
 * Used for op deduplication before enqueueing.
 *
 * @param {string} type — Operation type (e.g. 'chapter.update')
 * @param {string} chapterId — Chapter ID
 * @returns {Promise<boolean>} Whether an op was deleted
 */
export async function deleteSyncOpByTypeChapter(type, chapterId) {
  const db = await openDB();
  try {
    const ops = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const match = ops.find((op) => op.type === type && op.chapterId === chapterId);

    if (!match) return false;

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      store.delete(match.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return true;
  } finally {
    closeDB(db);
  }
}

// ─── Storage Persistence ────────────────────────────────────────────────────

/**
 * Request persistent storage to prevent browser from clearing IndexedDB
 * under storage pressure. Also called on first offline write.
 *
 * Browser behavior:
 * - Chrome: Grants automatically if site has engagement (no prompt)
 * - Firefox: Prompts the user
 * - Safari: May deny
 *
 * @returns {Promise<boolean>} Whether persistent storage was granted.
 */
export async function requestPersistentStorage() {
  await ensurePersistentStorage();
  if (navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Get storage estimate (quota and usage) via navigator.storage.estimate().
 *
 * @returns {Promise<{quota: number, usage: number}|null>}
 */
export async function getStorageEstimate() {
  if (navigator.storage && typeof navigator.storage.estimate === 'function') {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
      };
    } catch {
      return null;
    }
  }
  return null;
}

// ─── DB Stats ────────────────────────────────────────────────────────────────

/**
 * Get database statistics: entry counts per store + storage estimate.
 *
 * @returns {Promise<{books: number, chapters: number, syncQueue: number, storage: Object|null}>}
 */
export async function getDBStats() {
  const db = await openDB();
  try {
    const countStore = (storeName) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

    const [books, chapters, syncQueue] = await Promise.all([
      countStore(STORES.BOOKS),
      countStore(STORES.CHAPTERS),
      countStore(STORES.SYNC_QUEUE),
    ]);

    const storage = await getStorageEstimate();
    return { books, chapters, syncQueue, storage };
  } finally {
    closeDB(db);
  }
}

const offlineDBService = {
  openDB,
  putBook,
  getBook,
  putChapter,
  getChapter,
  putChaptersByBook,
  getChaptersByBook,
  enqueueSyncOp,
  dequeueSyncOps,
  clearSyncQueue,
  getSyncQueue,
  updateSyncOp,
  getSyncQueueCount,
  deleteSyncOpByTypeChapter,
  requestPersistentStorage,
  getStorageEstimate,
  getDBStats,
};

export default offlineDBService;