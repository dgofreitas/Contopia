import { useState, useEffect, useCallback, useRef } from 'react';
import { syncOnReconnect } from '../services/sync-service.js';
import { getSyncQueueCount, requestPersistentStorage } from '../services/offline-db-service.js';
import storageMonitor from '../services/storage-monitor.js';
import { syncPublishedBooks } from '../services/offline-book-cache.js';
import useAuthStore from '../stores/auth-store.js';

const MAX_RETRIES = 5;
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000];

export default function useAutoSync({ enabled = true, onSyncComplete } = {}) {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });
  const onSyncCompleteRef = useRef(onSyncComplete);
  onSyncCompleteRef.current = onSyncComplete;

  const childId = useAuthStore((s) => s.user?.childId);
  const retryCountRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const syncingRef = useRef(false);
  const persistRequestedRef = useRef(false);

  const requestPersistIfNeeded = useCallback(async () => {
    if (persistRequestedRef.current) return;
    persistRequestedRef.current = true;
    await requestPersistentStorage();
  }, []);

  const checkStoragePressure = useCallback(async () => {
    try {
      const estimate = await storageMonitor.getStorageEstimate();
      if (storageMonitor.isStoragePressure(estimate)) {
        console.warn('[autoSync] Storage usage >= 80%. Consider cleanup.');
      }
    } catch {
      // non-critical
    }
  }, []);

  const sync = useCallback(async () => {
    if (!enabled || syncingRef.current) return { synced: 0, conflicts: 0, errors: 0 };

    syncingRef.current = true;
    setSyncStatus('syncing');
    setSyncProgress({ synced: 0, total: 0 });
    retryCountRef.current = 0;

    try {
      const queueCount = await getSyncQueueCount();
      if (queueCount === 0) {
        setSyncStatus('complete');
        setSyncProgress({ synced: 0, total: 0 });
        syncingRef.current = false;
        onSyncCompleteRef.current?.({ synced: 0, conflicts: 0, errors: 0 });
        return { synced: 0, conflicts: 0, errors: 0 };
      }

      setSyncProgress({ synced: 0, total: queueCount });

      while (retryCountRef.current < MAX_RETRIES) {
        try {
          const result = await syncOnReconnect();
          setSyncProgress({ synced: result.synced + result.conflicts, total: queueCount });
          setSyncStatus(result.errors > 0 ? 'error' : 'complete');

          if (result.conflicts > 0) {
            setSyncStatus('complete');
          }

          syncingRef.current = false;
          onSyncCompleteRef.current?.(result);
          return result;
        } catch (err) {
          retryCountRef.current++;
          if (retryCountRef.current >= MAX_RETRIES) {
            setSyncStatus('error');
            syncingRef.current = false;
            throw err;
          }
          const delay = BACKOFF_DELAYS[retryCountRef.current - 1] || 16000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch {
      setSyncStatus('error');
      syncingRef.current = false;
      return { synced: 0, conflicts: 0, errors: 1 };
    }

    syncingRef.current = false;
    return { synced: 0, conflicts: 0, errors: 0 };
  }, [enabled]);

  useEffect(() => {
    isUnmountedRef.current = false;
    if (!enabled) return;

    const handleOnline = async () => {
      // 1. Sync pending chapter writes via existing queue (STORY-048/050)
      await sync();

      // 2. Sync newly published books to IndexedDB (STORY-051)
      if (childId) {
        try {
          await syncPublishedBooks(childId);
        } catch (err) {
          console.warn('[autoSync] Failed to sync published books on reconnect:', err);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      isUnmountedRef.current = true;
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, sync, childId]);

  useEffect(() => {
    if (!enabled) return;

    const checkPressure = async () => {
      await checkStoragePressure();
    };
    checkPressure();
  }, [enabled, checkStoragePressure]);

  return {
    sync,
    syncStatus,
    syncProgress,
    requestPersistIfNeeded,
  };
}
