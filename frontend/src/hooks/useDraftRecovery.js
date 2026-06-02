import { useState, useEffect, useCallback, useRef } from 'react';
import autosaveService from '../services/autosave-service';
import useNetworkStatus from './useNetworkStatus';

export default function useDraftRecovery(bookId, chapterId, serverVersion) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftContent, setDraftContent] = useState(null);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [shouldRestore, setShouldRestore] = useState(false);
  const { wasOffline, isRealOnline } = useNetworkStatus();
  const syncTriggeredRef = useRef(false);

  useEffect(() => {
    if (!bookId || !chapterId) return;

    let cancelled = false;

    async function checkForDraft() {
      try {
        const emergencyKey = `autosave_emergency_${chapterId}`;
        const emergency = localStorage.getItem(emergencyKey);
        let localDraft = null;

        if (emergency) {
          try {
            localDraft = JSON.parse(emergency);
          } catch {
            localStorage.removeItem(emergencyKey);
          }
        }

        const idbDraft = await autosaveService.getDraft(bookId, chapterId);

        let bestDraft = null;
        if (localDraft && idbDraft) {
          bestDraft = localDraft.timestamp > idbDraft.timestamp ? localDraft : idbDraft;
        } else {
          bestDraft = idbDraft || localDraft;
        }

        if (cancelled) return;

        if (bestDraft) {
          const draftIsLocalOnly = bestDraft.isLocalOnly || bestDraft.isLocalOnly === undefined;
          const draftTimestamp = bestDraft.timestamp;
          const serverTs = serverVersion ? new Date(serverVersion).getTime() : 0;
          const divergence = Math.abs(draftTimestamp - serverTs);

          setHasDraft(true);
          setDraftContent(bestDraft.content);
          setShouldRestore(draftIsLocalOnly);

          if (draftIsLocalOnly && serverTs > 0 && divergence > 300000) {
            setConflictWarning('Your offline changes may differ from the server version. Your local changes have been kept.');
          } else {
            setConflictWarning(null);
          }
        } else {
          setHasDraft(false);
          setDraftContent(null);
          setShouldRestore(false);
          setConflictWarning(null);
        }
      } catch (err) {
        console.warn('[draftRecovery] Failed to check for draft:', err);
      }
    }

    checkForDraft();

    return () => {
      cancelled = true;
    };
  }, [bookId, chapterId, serverVersion]);

  useEffect(() => {
    if (!isRealOnline || !wasOffline) return;
    if (syncTriggeredRef.current) return;
    if (!bookId || !chapterId) return;

    let cancelled = false;

    async function syncAndClean() {
      syncTriggeredRef.current = true;

      try {
        const { syncOnReconnect } = await import('../services/sync-service.js');
        const result = await syncOnReconnect();

        if (result.synced > 0 && bookId && chapterId) {
          try {
            await autosaveService.deleteDraft(bookId, chapterId);
            localStorage.removeItem(`autosave_emergency_${chapterId}`);
          } catch (cleanErr) {
            console.warn('[draftRecovery] Failed to clear synced draft:', cleanErr);
          }
        }

        if (result.conflicts > 0) {
          setConflictWarning('Synced (local version kept)');
        } else if (result.synced > 0) {
          setConflictWarning(null);
          setHasDraft(false);
          setDraftContent(null);
          setShouldRestore(false);
        }
      } catch (syncErr) {
        console.warn('[draftRecovery] Sync on reconnect failed:', syncErr);
      }

      if (!cancelled) {
        try {
          const idbDraft = await autosaveService.getDraft(bookId, chapterId);
          if (idbDraft && !cancelled) {
            setHasDraft(true);
            setDraftContent(idbDraft.content);
          } else if (!cancelled) {
            setHasDraft(false);
            setDraftContent(null);
            setShouldRestore(false);
            setConflictWarning(null);
          }
        } catch {
          // Silently ignore — draft check is best-effort
        }
      }

      syncTriggeredRef.current = false;
    }

    syncAndClean();

    return () => {
      cancelled = true;
    };
  }, [isRealOnline, wasOffline, bookId, chapterId]);

  const restoreDraft = useCallback(async () => {
    if (!bookId || !chapterId) return null;
    try {
      const draft = await autosaveService.getDraft(bookId, chapterId);
      if (draft) {
        setHasDraft(false);
        return draft.content;
      }
      const emergencyKey = `autosave_emergency_${chapterId}`;
      const emergency = localStorage.getItem(emergencyKey);
      if (emergency) {
        try {
          const parsed = JSON.parse(emergency);
          setHasDraft(false);
          return parsed.content;
        } catch {
          localStorage.removeItem(emergencyKey);
        }
      }
    } catch (err) {
      console.warn('[draftRecovery] Failed to restore draft:', err);
    }
    return null;
  }, [bookId, chapterId]);

  const discardDraft = useCallback(async () => {
    if (!bookId || !chapterId) return;
    try {
      await autosaveService.deleteDraft(bookId, chapterId);
      localStorage.removeItem(`autosave_emergency_${chapterId}`);
      setHasDraft(false);
      setDraftContent(null);
      setShouldRestore(false);
      setConflictWarning(null);
    } catch (err) {
      console.warn('[draftRecovery] Failed to discard draft:', err);
    }
  }, [bookId, chapterId]);

  return {
    hasDraft,
    draftContent,
    shouldRestore,
    conflictWarning,
    restoreDraft,
    discardDraft,
  };
}