import { useState, useEffect, useCallback, useRef } from 'react';
import { syncOnReconnect } from '../services/sync-service.js';
import { getSyncQueueCount } from '../services/offline-db-service.js';
import storageMonitor from '../services/storage-monitor.js';

const MAX_RETRIES = 5;
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000];

let persistentStorageRequested = false;

export default function useAutoSync({ enabled = true, onSyncComplete } = {}) {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });
  const onSyncCompleteRef = useRef(onSyncComplete);
  onSyncCompleteRef.current = onSyncComplete;

  const retryCountRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const syncingRef = useRef(false);

  const requestPersistIfNeeded = useCallback(async () => {
    if (!persistentStorageRequested) {
      persistentStorageRequested = true;
      try {
        await requestPersistentStorage();
      } catch {
        // non-critical
      }
    }
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
      await sync();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      isUnmountedRef.current = true;
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, sync]);

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