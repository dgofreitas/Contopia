import { useEffect, useRef, useCallback } from 'react';
import useReaderStore from '../stores/reader-store';
import useAuthStore from '../stores/auth-store';
import useNetworkStatus from './useNetworkStatus';

/**
 * Hook that syncs reader preferences between localStorage (Zustand persist)
 * and the backend API.
 *
 * - On mount (authenticated): GET /api/reader/preferences and merge with
 *   localStorage (localStorage wins on conflict, then syncs up).
 * - On preference change (authenticated): PUT /api/reader/preferences
 *   with 500ms debounce.
 * - Offline: localStorage is source of truth.
 */
export default function useReaderPreferences() {
  const { isOnline } = useNetworkStatus();
  const debounceRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Sync from backend on mount when authenticated
  useEffect(() => {
    if (!isOnline) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    let cancelled = false;

    const fetchPreferences = async () => {
      try {
        const { default: apiClient } = await import('../lib/api-client.js');
        const response = await apiClient.get('/reader/preferences');
        if (cancelled) return;

        const backendPrefs = response.data?.data;
        if (!backendPrefs) return;

        // Merge: localStorage wins on conflict, then we sync up
        const current = useReaderStore.getState();
        const merged = {
          fontSize: current.fontSize || backendPrefs.fontSize || 'medium',
          theme: current.theme || backendPrefs.theme || 'light',
          readingMode: current.readingMode || backendPrefs.readingMode || 'paginated',
        };

        // Only apply if different from current state (avoid unnecessary re-renders)
        const needsUpdate =
          merged.fontSize !== current.fontSize ||
          merged.theme !== current.theme ||
          merged.readingMode !== current.readingMode;

        if (needsUpdate) {
          useReaderStore.getState().setFontSize(merged.fontSize);
          // Use direct set to avoid marking hasManualThemeSelection during sync
          useReaderStore.setState({ theme: merged.theme });
          useReaderStore.getState().setReadingMode(merged.readingMode);
        }
      } catch (error) {
        // 401/403 — unauthenticated or session expired; ignore silently
        // Network errors — localStorage is source of truth, will sync later
        if (error.response?.status !== 401 && error.response?.status !== 403) {
          console.warn('Failed to fetch reader preferences:', error.message);
        }
      }
    };

    fetchPreferences();
    isInitializedRef.current = true;

    return () => { cancelled = true; };
  }, [isOnline]);

  // Debounced sync to backend on preference changes
  const syncToBackend = useCallback(async (fontSize, theme, readingMode) => {
    if (!isOnline) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const { default: apiClient } = await import('../lib/api-client.js');
      await apiClient.put('/reader/preferences', {
        fontSize,
        theme,
        readingMode,
      });
    } catch (error) {
      // Auth errors — don't retry; session expired
      if (error.response?.status === 401 || error.response?.status === 403) return;
      // Network errors — will retry on next change
      console.warn('Failed to sync reader preferences:', error.message);
    }
  }, [isOnline]);

  useEffect(() => {
    if (!isInitializedRef.current) return;

    const unsubscribe = useReaderStore.subscribe((state, prevState) => {
      // Only sync persisted fields
      if (
        state.fontSize !== prevState.fontSize ||
        state.theme !== prevState.theme ||
        state.readingMode !== prevState.readingMode
      ) {
        // Clear any pending debounce
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        // Debounce: 500ms
        debounceRef.current = setTimeout(() => {
          syncToBackend(state.fontSize, state.theme, state.readingMode);
        }, 500);
      }
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [syncToBackend]);
}