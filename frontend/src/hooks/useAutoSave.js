import { useState, useRef, useCallback, useEffect } from 'react';
import autosaveService from '../services/autosave-service';
import useNetworkStatus from './useNetworkStatus';
import syncService from '../services/sync-service';

const LOCAL_DEBOUNCE_MS = 5000;
const SERVER_DEBOUNCE_MS = 30000;
const SERVER_MAX_INTERVAL_MS = 30000;
const LOCAL_CHANGE_THRESHOLD = 100;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_ATTEMPTS = 5;
const RETRY_MULTIPLIER = 2;
const RETRY_JITTER_MS = 200;
const SAVED_FADE_MS = 2000;

export {
  LOCAL_DEBOUNCE_MS,
  SERVER_DEBOUNCE_MS,
  SERVER_MAX_INTERVAL_MS,
  LOCAL_CHANGE_THRESHOLD,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_ATTEMPTS,
  RETRY_MULTIPLIER,
  RETRY_JITTER_MS,
  SAVED_FADE_MS,
};

function requestIdleCallbackShim(fn) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn);
  } else {
    setTimeout(fn, 0);
  }
}

export default function useAutoSave({
  bookId,
  chapterId,
  content,
  serverVersion,
  onServerSave,
  enabled = true,
  onReconnect,
}) {
  const { wasOffline, isRealOnline } = useNetworkStatus();

  const [isSaving, setIsSaving] = useState(false);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [conflictInfo, setConflictInfo] = useState(null);

  const contentRef = useRef(content);
  const dirtyContentRef = useRef(null);
  const localDebounceRef = useRef(null);
  const serverDebounceRef = useRef(null);
  const maxIntervalRef = useRef(null);
  const lastServerSaveRef = useRef(null);
  const savedFadeRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);
  const charCountRef = useRef(0);
  const prevContentRef = useRef(content);
  const serverVersionRef = useRef(serverVersion);
  const isLocalSavingRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (localDebounceRef.current) clearTimeout(localDebounceRef.current);
    if (serverDebounceRef.current) clearTimeout(serverDebounceRef.current);
    if (maxIntervalRef.current) clearTimeout(maxIntervalRef.current);
    if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    localDebounceRef.current = null;
    serverDebounceRef.current = null;
    maxIntervalRef.current = null;
    savedFadeRef.current = null;
    retryTimerRef.current = null;
  }, []);

  const doLocalSave = useCallback(async (html) => {
    if (!bookId || !chapterId || !html) return;
    setIsLocalSaving(true);
    isLocalSavingRef.current = true;
    try {
      await autosaveService.saveDraft(bookId, chapterId, {
        content: html,
        wordCount: html.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length,
        timestamp: Date.now(),
        serverVersion: serverVersionRef.current ? new Date(serverVersionRef.current).getTime() : null,
        isLocalOnly: !isRealOnline,
      });

      if (!isRealOnline) {
        try {
          await syncService.queueSyncOp({
            type: 'chapter.update',
            chapterId,
            content: html,
            baseVersion: serverVersionRef.current,
            clientTimestamp: new Date().toISOString(),
          });
        } catch (syncErr) {
          console.warn('[autosave] Failed to queue sync op:', syncErr);
        }
      }
    } catch (err) {
      console.warn('[autosave] Local save failed:', err);
    } finally {
      setIsLocalSaving(false);
      isLocalSavingRef.current = false;
    }
  }, [bookId, chapterId, isRealOnline]);

  const doServerSave = useCallback(async (html) => {
    if (!bookId || !chapterId || !html || !onServerSave) return;

    if (!isRealOnline) {
      setIsOffline(true);
      setSaveStatus('offline');
      await doLocalSave(html);
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const result = await onServerSave({ chapterId, content: html });
      serverVersionRef.current = result?.updatedAt || serverVersionRef.current;
      lastServerSaveRef.current = Date.now();

      setIsDirty(false);
      setLastSavedAt(Date.now());
      setSaveStatus('saved');
      setConflictInfo(null);
      setIsOffline(false);
      dirtyContentRef.current = null;
      retryAttemptRef.current = 0;

      await autosaveService.deleteDraft(bookId, chapterId);

      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      savedFadeRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          setSaveStatus('idle');
        }
      }, SAVED_FADE_MS);
    } catch (err) {
      setIsOffline(true);
      setSaveStatus('offline');
      await doLocalSave(html);
    } finally {
      setIsSaving(false);
    }
  }, [bookId, chapterId, onServerSave, isRealOnline, doLocalSave]);

  const retryServerSave = useCallback(async () => {
    if (retryAttemptRef.current >= RETRY_MAX_ATTEMPTS) {
      setSaveStatus('error');
      return;
    }

    const html = dirtyContentRef.current || contentRef.current;
    if (!html) return;

    const attempt = retryAttemptRef.current;
    const baseDelay = Math.min(RETRY_BASE_DELAY_MS * Math.pow(RETRY_MULTIPLIER, attempt), 30000);
    const jitter = (Math.random() - 0.5) * 2 * RETRY_JITTER_MS;
    const delay = baseDelay + jitter;

    retryTimerRef.current = setTimeout(async () => {
      if (isUnmountedRef.current) return;
      setIsSaving(true);
      setSaveStatus('saving');

      try {
        const result = await onServerSave({ chapterId, content: html });
        serverVersionRef.current = result?.updatedAt || serverVersionRef.current;
        lastServerSaveRef.current = Date.now();

        setIsDirty(false);
        setLastSavedAt(Date.now());
        setSaveStatus('saved');
        setConflictInfo(null);
        setIsOffline(false);
        retryAttemptRef.current = 0;
        dirtyContentRef.current = null;

        await autosaveService.deleteDraft(bookId, chapterId);

        if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
        savedFadeRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            setSaveStatus('idle');
          }
        }, SAVED_FADE_MS);
      } catch (err) {
        retryAttemptRef.current = attempt + 1;
        if (retryAttemptRef.current >= RETRY_MAX_ATTEMPTS) {
          setSaveStatus('error');
          setIsOffline(true);
        } else {
          retryServerSave();
        }
      } finally {
        setIsSaving(false);
      }
    }, delay);
  }, [chapterId, onServerSave, bookId]);

  useEffect(() => {
    if (isRealOnline && wasOffline && dirtyContentRef.current && !isUnmountedRef.current) {
      retryAttemptRef.current = 0;
      if (onReconnect) {
        onReconnect();
      }
      doServerSave(dirtyContentRef.current);
    }
  }, [isRealOnline, wasOffline, onReconnect, doServerSave]);

  useEffect(() => {
    serverVersionRef.current = serverVersion;
  }, [serverVersion]);

  useEffect(() => {
    if (!enabled || !chapterId || content === prevContentRef.current) return;

    const prevLength = (prevContentRef.current || '').length;
    const currLength = (content || '').length;
    charCountRef.current += Math.abs(currLength - prevLength);
    prevContentRef.current = content;
    contentRef.current = content;

    setIsDirty(true);
    dirtyContentRef.current = content;

    if (localDebounceRef.current) clearTimeout(localDebounceRef.current);
    localDebounceRef.current = setTimeout(() => {
      if (isUnmountedRef.current) return;
      requestIdleCallbackShim(() => {
        if (!isUnmountedRef.current && contentRef.current) {
          doLocalSave(contentRef.current);
        }
      });
    }, LOCAL_DEBOUNCE_MS);

    if (charCountRef.current >= LOCAL_CHANGE_THRESHOLD) {
      requestIdleCallbackShim(() => {
        if (!isUnmountedRef.current && contentRef.current) {
          doLocalSave(contentRef.current);
          charCountRef.current = 0;
        }
      });
    }

    if (serverDebounceRef.current) clearTimeout(serverDebounceRef.current);

    if (isRealOnline) {
      serverDebounceRef.current = setTimeout(() => {
        if (isUnmountedRef.current) return;
        doServerSave(contentRef.current);
      }, SERVER_DEBOUNCE_MS);
    }

    if (isRealOnline && (!lastServerSaveRef.current || (Date.now() - lastServerSaveRef.current) >= SERVER_MAX_INTERVAL_MS)) {
      if (maxIntervalRef.current) clearTimeout(maxIntervalRef.current);
      maxIntervalRef.current = setTimeout(() => {
        if (isUnmountedRef.current) return;
        doServerSave(contentRef.current);
      }, SERVER_MAX_INTERVAL_MS);
    }
  }, [content, chapterId, enabled, doLocalSave, doServerSave, isRealOnline]);

  useEffect(() => {
    if (!chapterId) return;
    clearAllTimers();
    setIsDirty(false);
    setIsSaving(false);
    setIsLocalSaving(false);
    setSaveStatus('idle');
    setLastSavedAt(null);
    setConflictInfo(null);
    setIsOffline(false);
    dirtyContentRef.current = null;
    charCountRef.current = 0;
    prevContentRef.current = content;
    contentRef.current = content;
    retryAttemptRef.current = 0;
    lastServerSaveRef.current = null;
  }, [chapterId, clearAllTimers]);

  useEffect(() => {
    isUnmountedRef.current = false;

    const handleBeforeUnload = () => {
      if (dirtyContentRef.current && chapterId && bookId) {
        try {
          const emergencyKey = `autosave_emergency_${chapterId}`;
          localStorage.setItem(emergencyKey, JSON.stringify({
            content: dirtyContentRef.current,
            timestamp: Date.now(),
          }));
        } catch (e) {
          // localStorage may be full, ignore
        }
        try {
          autosaveService.saveDraft(bookId, chapterId, {
            content: dirtyContentRef.current,
            wordCount: dirtyContentRef.current.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length,
            timestamp: Date.now(),
            serverVersion: serverVersionRef.current ? new Date(serverVersionRef.current).getTime() : null,
            isLocalOnly: true,
          });
        } catch (e) {
          // best effort
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isUnmountedRef.current = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearAllTimers();
    };
  }, [chapterId, bookId, clearAllTimers]);

  const saveNow = useCallback(() => {
    clearAllTimers();
    const html = contentRef.current;
    if (html) {
      doServerSave(html);
    }
  }, [clearAllTimers, doServerSave]);

  return {
    isSaving,
    isLocalSaving,
    isDirty,
    isOffline,
    lastSavedAt,
    saveStatus,
    conflictInfo,
    saveNow,
    isRealOnline,
  };
}