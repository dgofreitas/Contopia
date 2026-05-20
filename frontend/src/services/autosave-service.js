const DB_NAME = 'contopia-autosave';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('byTimestamp', 'timestamp', { unique: false });
        store.createIndex('byBookId', 'bookId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      _cleanupWithDB(db, 7, 50).then(() => resolve(db)).catch(() => resolve(db));
    };

    request.onerror = (event) => reject(event.target.error);
  });
}


async function saveDraft(bookId, chapterId, { content, wordCount, timestamp, serverVersion, isLocalOnly }) {
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

    return new Promise((resolve, reject) => {
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

const autosaveService = {
  openDB,
  saveDraft,
  getDraft,
  deleteDraft,
  getAllPendingDrafts,
  cleanupOldDrafts,
};

export default autosaveService;