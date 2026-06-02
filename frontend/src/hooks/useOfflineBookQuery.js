/**
 * Contopia — useOfflineBookQuery Hook (STORY-051)
 *
 * Offline fallback for book metadata (title, cover, status).
 * Only queries API for published books when online;
 * falls back to IndexedDB when offline.
 *
 * ACs: AC2 (read offline from cache)
 */
import { useQuery } from '@tanstack/react-query';
import useNetworkStatus from './useNetworkStatus';
import { getCachedBook } from '../services/offline-book-cache';
import apiClient from '../lib/api-client';

export default function useOfflineBookQuery(bookId) {
  const { isOnline } = useNetworkStatus();

  return useQuery({
    queryKey: ['bookOffline', bookId],
    queryFn: async () => {
      // If offline, read from IndexedDB cache
      if (!isOnline) {
        const cachedBook = await getCachedBook(bookId);
        if (cachedBook) {
          return {
            _id: cachedBook.bookId,
            id: cachedBook.bookId,
            title: cachedBook.title || '',
            coverUrl: cachedBook.coverUrl || null,
            cover: cachedBook.coverUrl || null,
            status: cachedBook.status || 'published',
            chapterCount: cachedBook.chapterCount || 0,
            updatedAt: cachedBook.updatedAt,
            readingProgress: cachedBook.readingProgress || null,
          };
        }
        // No cache available offline
        return null;
      }

      // If online, fetch from API
      try {
        const { data } = await apiClient.get(`/v1/books/${bookId}/edit`);
        return data?.data || data;
      } catch (err) {
        // Network error — try IndexedDB fallback
        console.warn('[useOfflineBookQuery] API error, trying cache:', err);
        const cachedBook = await getCachedBook(bookId);
        if (cachedBook) {
          return {
            _id: cachedBook.bookId,
            id: cachedBook.bookId,
            title: cachedBook.title || '',
            coverUrl: cachedBook.coverUrl || null,
            cover: cachedBook.coverUrl || null,
            status: cachedBook.status || 'published',
            chapterCount: cachedBook.chapterCount || 0,
            updatedAt: cachedBook.updatedAt,
            readingProgress: cachedBook.readingProgress || null,
          };
        }
        throw err;
      }
    },
    enabled: !!bookId,
    staleTime: isOnline ? 0 : Infinity,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
  });
}