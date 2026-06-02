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

const DB_NAME = 'contopia-autosave';
const DB_VERSION = 2;

const STORES = {
  BOOKS: 'books',
  CHAPTERS: 'chapters',
  SYNC_QUEUE: 'syncQueue',
};

let persistentStorageRequested = false;

let cachedDB = null;
let cachedDBPromise = null;

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

export function openDB() {
  if (cachedDB && !cachedDB.closed) {
    return Promise.resolve(cachedDB);
  }
  if (cachedDBPromise) {
    return cachedDBPromise;
  }
  cachedDBPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.BOOKS)) {
        const booksStore = db.createObjectStore(STORES.BOOKS, { keyPath: 'bookId' });
        booksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CHAPTERS)) {
        const chaptersStore = db.createObjectStore(STORES.CHAPTERS, { keyPath: 'chapterId' });
        chaptersStore.createIndex('bookId', 'bookId', { unique: false });
        chaptersStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      cachedDB = event.target.result;
      cachedDB.onclose = () => { cachedDB = null; cachedDBPromise = null; };
      cachedDBPromise = null;
      resolve(cachedDB);
    };
    request.onerror = (event) => {
      cachedDBPromise = null;
      reject(event.target.error);
    };
  });
  return cachedDBPromise;
}

export function closeDB() {
  if (cachedDB && !cachedDB.closed) {
    cachedDB.close();
  }
  cachedDB = null;
  cachedDBPromise = null;
}

export function closeAllDBs() {
  closeDB();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    closeDB();
  });
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
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BOOKS, 'readwrite');
    const store = tx.objectStore(STORES.BOOKS);
    store.put(book);
    tx.oncomplete = () => resolve(book);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get a book by bookId.
 *
 * @param {string} bookId
 * @returns {Promise<Object|null>}
 */
export async function getBook(bookId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BOOKS, 'readonly');
    const store = tx.objectStore(STORES.BOOKS);
    const request = store.get(bookId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
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
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CHAPTERS, 'readwrite');
    const store = tx.objectStore(STORES.CHAPTERS);
    store.put(chapter);
    tx.oncomplete = () => resolve(chapter);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get a chapter by chapterId.
 *
 * @param {string} chapterId
 * @returns {Promise<Object|null>}
 */
export async function getChapter(chapterId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CHAPTERS, 'readonly');
    const store = tx.objectStore(STORES.CHAPTERS);
    const request = store.get(chapterId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
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
  return new Promise((resolve, reject) => {
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
}

/**
 * Get all chapters for a book, using the bookId index.
 *
 * @param {string} bookId
 * @returns {Promise<Object[]>}
 */
export async function getChaptersByBook(bookId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CHAPTERS, 'readonly');
    const store = tx.objectStore(STORES.CHAPTERS);
    const index = store.index('bookId');
    const request = index.getAll(bookId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
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
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const enriched = {
      ...op,
      timestamp: op.timestamp || Date.now(),
    };
    const request = store.add(enriched);
    request.onsuccess = () => {
      resolve({ ...enriched, id: request.result });
    };
    tx.onerror = () => reject(tx.error);
  });
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
  const ops = [];
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'next');

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && ops.length < limit) {
        ops.push(cursor.value);
        cursor.delete();
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve(ops);
    tx.onerror = () => reject(tx.error);
  });
  closeDB(db);
  return ops;
}

/**
 * Clear the entire sync queue.
 *
 * @returns {Promise<void>}
 */
export async function clearSyncQueue() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get the entire sync queue (without removing entries).
 *
 * @returns {Promise<Object[]>}
 */
export async function getSyncQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
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
}

/**
 * Get the count of pending sync operations in the queue.
 *
 * @returns {Promise<number>}
 */
export async function getSyncQueueCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
}

// ─── Storage Persistence ────────────────────────────────────────────────────

/**
 * Request persistent storage to prevent browser from clearing IndexedDB
 * under storage pressure.
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
}

const offlineDBService = {
  openDB,
  closeDB,
  closeAllDBs,
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
