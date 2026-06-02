/**
 * Contopia — useOfflineChaptersQuery Hook (STORY-051)
 *
 * Wraps useChaptersQuery with offline fallback.
 * If offline, serves chapters from IndexedDB via getChaptersByBook().
 * If online, uses TanStack Query with networkMode: 'offlineFirst'.
 *
 * ACs: AC2 (read offline from cache), AC3 (navigate chapters offline)
 */
import { useQuery } from '@tanstack/react-query';
import useNetworkStatus from './useNetworkStatus';
import { getCachedChapters } from '../services/offline-book-cache';
import apiClient from '../lib/api-client';

export default function useOfflineChaptersQuery(bookId) {
  const { isOnline } = useNetworkStatus();

  return useQuery({
    queryKey: ['chapters', bookId],
    queryFn: async () => {
      // If offline, serve from IndexedDB cache
      if (!isOnline) {
        const cachedChapters = await getCachedChapters(bookId);
        if (cachedChapters && cachedChapters.length > 0) {
          // Map cached chapter format to the format expected by ReaderPage
          return cachedChapters.map((ch) => ({
            _id: ch.chapterId,
            id: ch.chapterId,
            title: ch.title || '',
            content: ch.content || '',
            order: ch.order ?? 0,
            chapterNumber: ch.order ?? 0,
            bookId: ch.bookId || bookId,
            updatedAt: ch.updatedAt,
          }));
        }
        // No cache available offline — return empty
        return [];
      }

      // If online, fetch from API
      try {
        const { data } = await apiClient.get(`/v1/reader/${bookId}/chapters`);
        return data;
      } catch (err) {
        // Network error — try IndexedDB fallback
        console.warn('[useOfflineChaptersQuery] API error, trying cache:', err);
        const cachedChapters = await getCachedChapters(bookId);
        if (cachedChapters && cachedChapters.length > 0) {
          return cachedChapters.map((ch) => ({
            _id: ch.chapterId,
            id: ch.chapterId,
            title: ch.title || '',
            content: ch.content || '',
            order: ch.order ?? 0,
            chapterNumber: ch.order ?? 0,
            bookId: ch.bookId || bookId,
            updatedAt: ch.updatedAt,
          }));
        }
        throw err;
      }
    },
    enabled: !!bookId,
    staleTime: isOnline ? 2 * 60 * 1000 : Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
  });
}