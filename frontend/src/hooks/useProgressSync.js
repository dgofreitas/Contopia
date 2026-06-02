import { useState, useCallback, useRef, useEffect } from 'react';
import useUpdateReadingProgress from './useUpdateReadingProgress';
import useReadingProgressQuery from './useReadingProgressQuery';
import useNetworkStatus from './useNetworkStatus';
import useReaderStore from '../stores/reader-store';
import { putBook, getBook } from '../services/offline-db-service';
import { queueSyncOp } from '../services/sync-service';

const DEBOUNCE_MS = 10000;
const LOCAL_PREFIX = 'progress:';

function getLocalProgress(bookId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_PREFIX}${bookId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLocalProgress(bookId, data) {
  try {
    localStorage.setItem(`${LOCAL_PREFIX}${bookId}`, JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage may be full — fail silently per NFR-AVL-04
  }
}

function clearLocalProgress(bookId) {
  try {
    localStorage.removeItem(`${LOCAL_PREFIX}${bookId}`);
  } catch {
    // ignore
  }
}

export default function useProgressSync(bookId) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { data: serverProgress } = useReadingProgressQuery(bookId);
  const { mutateAsync: saveToServer } = useUpdateReadingProgress(bookId);
  const setLocalProgressStore = useReaderStore((s) => s.setLocalProgress);
  const setSyncStatus = useReaderStore((s) => s.setSyncStatus);

  const [_localProgress, setLocalProgressState] = useState(() => getLocalProgress(bookId));
  const [_syncStatus, setSyncStatusState] = useState('idle');

  const debounceRef = useRef(null);
  const pendingRef = useRef(null);
  const isUnmountedRef = useRef(false);
  const bookIdRef = useRef(bookId);

  // Merge local vs server progress on mount / data change
  const mergedProgress = (() => {
    const local = getLocalProgress(bookId);
    const server = serverProgress;

    if (!local && !server) return null;
    if (!local) return server;
    if (!server) return local;

    const localTime = local.timestamp || 0;
    const serverTime = server.updatedAt ? new Date(server.updatedAt).getTime() : 0;

    return localTime >= serverTime ? local : server;
  })();

  // Sync store with merged progress
  useEffect(() => {
    if (mergedProgress) {
      setLocalProgressStore(mergedProgress);
    }
  }, [mergedProgress, setLocalProgressStore]);

  useEffect(() => {
    setSyncStatus(_syncStatus);
  }, [_syncStatus, setSyncStatus]);

  // Clear debounce on bookId change
  useEffect(() => {
    bookIdRef.current = bookId;
    setLocalProgressState(getLocalProgress(bookId));
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bookId]);

  // Cleanup on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // On reconnect: flush pending progress to server
  useEffect(() => {
    if (isOnline && wasOffline && pendingRef.current && bookId) {
      const pending = pendingRef.current;
      setSyncStatusState('saving');
      saveToServer(pending)
        .then(() => {
          if (!isUnmountedRef.current) {
            setSyncStatusState('idle');
            pendingRef.current = null;
          }
        })
        .catch(() => {
          if (!isUnmountedRef.current) {
            setSyncStatusState('error');
          }
        });
    }
  }, [isOnline, wasOffline, bookId, saveToServer]);

  const saveProgress = useCallback(
    (progressData) => {
      if (!bookId) return;

      const data = {
        ...progressData,
      };

      // Always save locally immediately
      setLocalProgress(bookId, data);
      setLocalProgressState(getLocalProgress(bookId));

      if (isOnline) {
        // Clear existing debounce timer
        if (debounceRef.current) clearTimeout(debounceRef.current);

        // Store latest data for debounce
        pendingRef.current = data;

        setSyncStatusState('saving');

        // Debounced server save (10s or immediate on chapter change)
        if (progressData._immediate) {
          // Remove internal flag before sending
          const { _immediate, ...serverData } = data;
          saveToServer(serverData)
            .then(() => {
              if (!isUnmountedRef.current) {
                setSyncStatusState('idle');
                clearLocalProgress(bookId);
                pendingRef.current = null;
              }
            })
            .catch(() => {
              if (!isUnmountedRef.current) {
                setSyncStatusState('error');
                // Keep in localStorage for retry
                pendingRef.current = data;
              }
            });
        } else {
          const { _immediate, ...serverData } = data;
          debounceRef.current = setTimeout(() => {
            if (isUnmountedRef.current) return;
            saveToServer(serverData)
              .then(() => {
                if (!isUnmountedRef.current) {
                  setSyncStatusState('idle');
                  clearLocalProgress(bookId);
                  pendingRef.current = null;
                }
              })
              .catch(() => {
                if (!isUnmountedRef.current) {
                  setSyncStatusState('error');
                  pendingRef.current = data;
                }
              });
          }, DEBOUNCE_MS);
        }
      } else {
        // Offline: save to localStorage (current) + IndexedDB (new) + enqueue sync
        pendingRef.current = data;
        setSyncStatusState('error'); // indicates pending sync

        // Save progress to IndexedDB books store for durability (STORY-051)
        (async () => {
          try {
            const existingBook = await getBook(bookId);
            if (existingBook) {
              await putBook({
                ...existingBook,
                readingProgress: {
                  ...data,
                  timestamp: Date.now(),
                },
              });
            }
          } catch (err) {
            console.warn('[useProgressSync] Failed to save progress to IndexedDB:', err);
          }

          // Enqueue readingProgress.update in syncQueue for server sync on reconnect
          try {
            await queueSyncOp({
              type: 'readingProgress.update',
              bookId,
              payload: {
                lastChapterId: data.lastChapterId,
                lastPosition: data.lastPosition,
                percentage: data.percentage,
                finished: data.finished,
              },
            });
          } catch (err) {
            console.warn('[useProgressSync] Failed to enqueue progress sync:', err);
          }
        })();
      }
    },
    [bookId, isOnline, saveToServer],
  );

  return {
    saveProgress,
    localProgress: mergedProgress,
    syncStatus: _syncStatus,
  };
}