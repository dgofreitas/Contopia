const DB_NAME = 'contopia-autosave';
const DB_VERSION = 2; // v1 = drafts (existing), v2 = adds books, chapters, syncQueue (STORY-048)
const STORE_NAME = 'drafts';

let persistentStorageRequested = false;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // v1: drafts store (existing)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('byTimestamp', 'timestamp', { unique: false });
        store.createIndex('byBookId', 'bookId', { unique: false });
      }

      // v2 upgrade: add books, chapters, syncQueue stores (STORY-048)
      // These are also created in offline-db-service.js openDB — both paths
      // use !contains guards so they are idempotent.
      if (!db.objectStoreNames.contains('books')) {
        const booksStore = db.createObjectStore('books', { keyPath: 'bookId' });
        booksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('chapters')) {
        const chaptersStore = db.createObjectStore('chapters', { keyPath: 'chapterId' });
        chaptersStore.createIndex('bookId', 'bookId', { unique: false });
        chaptersStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      _cleanupWithDB(db, 7, 50).then(() => resolve(db)).catch(() => resolve(db));
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

async function requestPersistentStorageIfNeeded() {
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

async function saveDraft(bookId, chapterId, { content, wordCount, timestamp, serverVersion, isLocalOnly }) {
  if (isLocalOnly) {
    requestPersistentStorageIfNeeded();
  }

  try {
    const db = await openDB();
    const key = `books/${bookId}/chapters/${chapterId}`;
    const draft = {
      key,
      bookId,
      chapterId,
      content,
      wordCount: wordCount || 0,
      timestamp: timestamp || Date.now(),
      serverVersion: serverVersion || null,
      isLocalOnly: isLocalOnly !== undefined ? isLocalOnly : true,
    };

    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(draft);
      tx.oncomplete = () => {
        db.close();
        resolve(draft);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });

    if (isLocalOnly) {
      try {
        const { queueSyncOp } = await import('./sync-service.js');
        await queueSyncOp({
          type: 'chapter.update',
          chapterId,
          content,
          baseVersion: serverVersion,
          clientTimestamp: new Date().toISOString(),
        });
      } catch (syncErr) {
        console.warn('[autosave] Failed to enqueue sync op on offline save:', syncErr);
      }
    }

    return result;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('[autosave] IndexedDB quota exceeded, falling back to localStorage');
      try {
        const key = `autosave_draft_${bookId}_${chapterId}`;
        localStorage.setItem(key, JSON.stringify({ content, timestamp: Date.now(), isLocalOnly: true }));
        return { key, bookId, chapterId, content, timestamp: Date.now(), isLocalOnly: true };
      } catch (lsError) {
        console.warn('[autosave] localStorage also failed:', lsError);
        throw lsError;
      }
    }
    throw error;
  }
}

async function getDraft(bookId, chapterId) {
  const db = await openDB();
  const key = `books/${bookId}/chapters/${chapterId}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteDraft(bookId, chapterId) {
  const db = await openDB();
  const key = `books/${bookId}/chapters/${chapterId}`;
  localStorage.removeItem(`autosave_draft_${bookId}_${chapterId}`);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function getAllPendingDrafts() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('byTimestamp');
    const request = index.getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function cleanupOldDrafts(maxAgeDays = 7, maxCount = 50) {
  try {
    const db = await openDB();
    await _cleanupWithDB(db, maxAgeDays, maxCount);
    db.close();
  } catch {
    // silently ignore cleanup errors
  }
}

async function _cleanupWithDB(db, maxAgeDays, maxCount) {
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - maxAge;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('byTimestamp');
    const request = index.openCursor(null, 'prev');
    const draftsToKeep = [];
    let count = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const draft = cursor.value;
        if (draft.timestamp < cutoff || count >= maxCount) {
          cursor.delete();
        } else {
          draftsToKeep.push(draft);
          count++;
        }
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(draftsToKeep);
    tx.onerror = () => resolve(draftsToKeep);
  });
}

async function flushDraftsForBook(bookId) {
  const apiClient = (await import('../lib/api-client.js')).default;
  const db = await openDB();

  const drafts = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('byBookId');
    const request = index.getAll(bookId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });

  const results = await Promise.allSettled(
    drafts.map((draft) =>
      apiClient.put(`/v1/chapters/${draft.chapterId}`, { content: draft.content })
    )
  );

  const tx2 = db.transaction(STORE_NAME, 'readwrite');
  const store2 = tx2.objectStore(STORE_NAME);
  for (const draft of drafts) {
    store2.delete(draft.key);
  }
  await new Promise((resolve, reject) => {
    tx2.oncomplete = () => {
      db.close();
      resolve();
    };
    tx2.onerror = () => {
      db.close();
      reject(tx2.error);
    };
  });

  return results;
}

const autosaveService = {
  openDB,
  saveDraft,
  getDraft,
  deleteDraft,
  getAllPendingDrafts,
  cleanupOldDrafts,
  flushDraftsForBook,
};

export default autosaveService;