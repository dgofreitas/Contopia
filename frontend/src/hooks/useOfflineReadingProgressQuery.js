/**
 * Contopia — useOfflineReadingProgressQuery Hook (STORY-051)
 *
 * Offline fallback for reading progress.
 * If online, fetches from /v1/books/:bookId/progress API.
 * If offline, reads from IndexedDB books store (readingProgress field).
 *
 * ACs: AC4 (progress restored offline)
 */
import { useQuery } from '@tanstack/react-query';
import useNetworkStatus from './useNetworkStatus';
import { getCachedBook } from '../services/offline-book-cache';
import apiClient from '../lib/api-client';

export default function useOfflineReadingProgressQuery(bookId) {
  const { isOnline } = useNetworkStatus();

  return useQuery({
    queryKey: ['readingProgress', bookId],
    queryFn: async () => {
      // If offline, read progress from IndexedDB
      if (!isOnline) {
        const cachedBook = await getCachedBook(bookId);
        if (cachedBook && cachedBook.readingProgress) {
          return cachedBook.readingProgress;
        }
        // Also try localStorage (useProgressSync saves there too)
        try {
          const raw = localStorage.getItem(`progress:${bookId}`);
          if (raw) {
            return JSON.parse(raw);
          }
        } catch {
          // ignore
        }
        return null;
      }

      // If online, fetch from API
      try {
        const { data } = await apiClient.get(`/v1/books/${bookId}/progress`);
        return data;
      } catch (err) {
        // Network error — fall back to IndexedDB
        console.warn('[useOfflineReadingProgressQuery] API error, trying cache:', err);
        const cachedBook = await getCachedBook(bookId);
        if (cachedBook && cachedBook.readingProgress) {
          return cachedBook.readingProgress;
        }
        // Try localStorage as last resort
        try {
          const raw = localStorage.getItem(`progress:${bookId}`);
          if (raw) {
            return JSON.parse(raw);
          }
        } catch {
          // ignore
        }
        throw err;
      }
    },
    enabled: !!bookId,
    staleTime: isOnline ? 30 * 1000 : Infinity,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
  });
}