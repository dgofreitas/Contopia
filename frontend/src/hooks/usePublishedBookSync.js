/**
 * Contopia — usePublishedBookSync Hook (STORY-051)
 *
 * Auto-syncs published books to IndexedDB on app mount and on reconnect.
 * Returns cached book IDs, loading state, and storage warning flag.
 *
 * ACs: AC1 (cache on publish), AC5 (sync on reconnect)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../stores/auth-store';
import useNetworkStatus from './useNetworkStatus';
import { syncPublishedBooks, getAllCachedBookIds, checkStorageAndWarn } from '../services/offline-book-cache';

export default function usePublishedBookSync({ enabled = true } = {}) {
  const [cachedBooks, setCachedBooks] = useState([]);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [storageWarning, setStorageWarning] = useState(false);
  const { isOnline } = useNetworkStatus();
  const childId = useAuthStore((s) => s.user?.childId);
  const syncingRef = useRef(false);
  const mountedRef = useRef(true);
  const isOnlineRef = useRef(isOnline);
  const childIdRef = useRef(childId);

  // Keep refs in sync with latest values
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    childIdRef.current = childId;
  }, [childId]);

  // Load cached book IDs from IndexedDB
  const loadCachedBooks = useCallback(async () => {
    try {
      const ids = await getAllCachedBookIds();
      if (mountedRef.current) {
        setCachedBooks(ids);
      }
    } catch (err) {
      console.error('[usePublishedBookSync] Failed to load cached books:', err);
    }
  }, []);

  // Check storage pressure
  const checkStorage = useCallback(async () => {
    try {
      const warning = await checkStorageAndWarn();
      if (mountedRef.current) {
        setStorageWarning(warning);
      }
    } catch {
      // non-critical
    }
  }, []);

  // Sync published books on mount and when coming online
  const syncBooks = useCallback(async () => {
    if (!enabled || !childIdRef.current || syncingRef.current) return;

    syncingRef.current = true;
    setIsLoadingCache(true);

    try {
      // Sync new published books from API → IndexedDB
      const result = await syncPublishedBooks(childIdRef.current);

      if (mountedRef.current) {
        setStorageWarning(result.storageWarning);
      }

      // Refresh cached book IDs after sync
      await loadCachedBooks();
    } catch (err) {
      console.error('[usePublishedBookSync] Sync failed:', err);
    } finally {
      if (mountedRef.current) {
        setIsLoadingCache(false);
      }
      syncingRef.current = false;
    }
  }, [enabled, loadCachedBooks]);

  // Initial load of cached books on mount
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      setIsLoadingCache(true);
      await loadCachedBooks();
      await checkStorage();
      setIsLoadingCache(false);

      // If online, trigger initial sync
      if (isOnlineRef.current && enabled) {
        await syncBooks();
      }
    };

    init();

    return () => {
      mountedRef.current = false;
    };
  }, [loadCachedBooks, checkStorage, enabled, syncBooks]);

  // Re-sync when coming back online (on reconnect)
  useEffect(() => {
    if (isOnline && enabled && childId) {
      syncBooks();
    }
  }, [isOnline, enabled, childId, syncBooks]);

  return {
    cachedBooks,
    isLoadingCache,
    storageWarning,
    refreshCachedBooks: loadCachedBooks,
    syncBooks,
  };
}