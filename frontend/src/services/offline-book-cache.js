/**
 * Contopia — Offline Book Cache Service (STORY-051)
 *
 * Core caching service for offline reading of published books.
 * Stores book metadata and chapter content in IndexedDB via offline-db-service.js.
 * ONLY caches books with status === 'published'.
 *
 * Validated ACs: AC1 (cache on publish), AC5 (sync on reconnect), AC6 (storage warning)
 */
import { putBook, getBook, getChaptersByBook, putChaptersByBook } from './offline-db-service.js';
import storageMonitor from './storage-monitor.js';
import apiClient from '../lib/api-client.js';

/**
 * Cache a published book and its chapters to IndexedDB.
 * Only caches if book.status === 'published'.
 *
 * @param {string} bookId — The book ID to cache
 * @returns {Promise<boolean>} true if cached successfully, false if not published or error
 */
export async function cachePublishedBook(bookId) {
  try {
    // Fetch book metadata from API
    const { data: bookResponse } = await apiClient.get(`/v1/books/${bookId}/edit`);
    const bookData = bookResponse?.data || bookResponse;

    // ONLY cache published books (AC boundary: drafts not cached for reading)
    if (!bookData || bookData.status !== 'published') {
      console.warn(`[offline-book-cache] Skipping cache for book ${bookId}: status=${bookData?.status}`);
      return false;
    }

    // Fetch chapters for reading
    const { data: chaptersResponse } = await apiClient.get(`/v1/reader/${bookId}/chapters`);
    const chapters = Array.isArray(chaptersResponse) ? chaptersResponse : (chaptersResponse?.data || []);

    // Fetch reading progress if available
    let readingProgress = null;
    try {
      const { data: progressResponse } = await apiClient.get(`/v1/books/${bookId}/progress`);
      readingProgress = progressResponse?.data || progressResponse || null;
    } catch {
      // Progress may not exist yet — non-critical
    }

    // Store book metadata in IndexedDB
    await putBook({
      bookId,
      title: bookData.title || '',
      coverUrl: bookData.coverUrl || bookData.cover || null,
      status: bookData.status,
      chapterCount: chapters.length,
      updatedAt: bookData.updatedAt || new Date().toISOString(),
      cachedAt: new Date().toISOString(),
      childId: bookData.childId || null,
      readingProgress,
    });

    // Store chapters in IndexedDB
    if (chapters.length > 0) {
      const enrichedChapters = chapters.map((ch) => ({
        chapterId: ch._id || ch.id,
        bookId,
        title: ch.title || '',
        content: ch.content || '',
        order: ch.order ?? ch.chapterNumber ?? 0,
        updatedAt: ch.updatedAt || new Date().toISOString(),
      }));
      await putChaptersByBook(bookId, enrichedChapters);
    }

    console.info(`[offline-book-cache] Cached published book "${bookData.title}" (${bookId}) with ${chapters.length} chapters`);
    return true;
  } catch (err) {
    console.error(`[offline-book-cache] Failed to cache book ${bookId}:`, err);
    return false;
  }
}

/**
 * Get a cached book from IndexedDB.
 *
 * @param {string} bookId
 * @returns {Promise<Object|null>} Book record or null if not cached
 */
export async function getCachedBook(bookId) {
  try {
    return await getBook(bookId);
  } catch (err) {
    console.error(`[offline-book-cache] Failed to get cached book ${bookId}:`, err);
    return null;
  }
}

/**
 * Get cached chapters for a book from IndexedDB.
 *
 * @param {string} bookId
 * @returns {Promise<Object[]>} Array of chapter records (empty array if none cached)
 */
export async function getCachedChapters(bookId) {
  try {
    return await getChaptersByBook(bookId);
  } catch (err) {
    console.error(`[offline-book-cache] Failed to get cached chapters for book ${bookId}:`, err);
    return [];
  }
}

/**
 * Get all cached book IDs from IndexedDB.
 * Scans the books store and returns an array of bookId values.
 *
 * @returns {Promise<string[]>} Array of cached book IDs
 */
export async function getAllCachedBookIds() {
  try {
    const db = await (await import('./offline-db-service.js')).default.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[offline-book-cache] Failed to get all cached book IDs:', err);
    return [];
  }
}

/**
 * Remove a cached book and its chapters from IndexedDB.
 *
 * @param {string} bookId
 * @returns {Promise<boolean>} true if removed, false if error
 */
export async function removeCachedBook(bookId) {
  try {
    const db = await (await import('./offline-db-service.js')).default.openDB();

    // Remove book record
    await new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      store.delete(bookId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Remove all chapters for this book using the bookId index
    const chapters = await getChaptersByBook(bookId);
    if (chapters.length > 0) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('chapters', 'readwrite');
        const store = tx.objectStore('chapters');
        for (const ch of chapters) {
          store.delete(ch.chapterId || ch._id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    console.info(`[offline-book-cache] Removed cached book ${bookId}`);
    return true;
  } catch (err) {
    console.error(`[offline-book-cache] Failed to remove cached book ${bookId}:`, err);
    return false;
  }
}

/**
 * Sync published books for a child: fetch published books list from API,
 * diff against cached IDs, and download any new ones.
 *
 * @param {string} childId — The child ID to sync books for
 * @returns {Promise<{ synced: number, errors: number, storageWarning: boolean }>}
 */
export async function syncPublishedBooks(childId) {
  if (!childId) {
    console.warn('[offline-book-cache] syncPublishedBooks: no childId provided');
    return { synced: 0, errors: 0, storageWarning: false };
  }

  try {
    // Fetch published books list from API
    const { data } = await apiClient.get('/v1/books', {
      params: { status: 'published', pageSize: 100 },
    });

    const books = data?.data || data || [];
    const publishedBooks = books.filter((b) => b.status === 'published');

    // Get already-cached book IDs
    const cachedIds = await getAllCachedBookIds();
    const cachedSet = new Set(cachedIds);

    // Find new books that aren't cached yet
    const newBooks = publishedBooks.filter((b) => !cachedSet.has(b._id || b.id));

    let synced = 0;
    let errors = 0;

    // Cache each new published book
    for (const book of newBooks) {
      const bookId = book._id || book.id;
      const success = await cachePublishedBook(bookId);
      if (success) {
        synced++;
      } else {
        errors++;
      }
    }

    // Remove cached books that are no longer published (e.g., unpublished)
    const publishedIds = new Set(publishedBooks.map((b) => b._id || b.id));
    for (const cachedId of cachedIds) {
      if (!publishedIds.has(cachedId)) {
        // Book was unpublished or deleted — remove from cache
        const cachedBook = await getBook(cachedId);
        if (cachedBook && cachedBook.status !== 'published') {
          await removeCachedBook(cachedId);
        }
      }
    }

    // Check storage pressure
    const storageWarning = await checkStorageAndWarn();

    return { synced, errors, storageWarning };
  } catch (err) {
    console.error('[offline-book-cache] syncPublishedBooks failed:', err);
    return { synced: 0, errors: 1, storageWarning: false };
  }
}

/**
 * Check storage pressure and return warning flag.
 * Uses storageMonitor.isStoragePressure() to check if usage >= 80% of quota.
 *
 * @returns {Promise<boolean>} true if storage is under pressure
 */
export async function checkStorageAndWarn() {
  try {
    const estimate = await storageMonitor.getStorageEstimate();
    return storageMonitor.isStoragePressure(estimate);
  } catch {
    return false;
  }
}

const offlineBookCache = {
  cachePublishedBook,
  getCachedBook,
  getCachedChapters,
  getAllCachedBookIds,
  removeCachedBook,
  syncPublishedBooks,
  checkStorageAndWarn,
};

export default offlineBookCache;