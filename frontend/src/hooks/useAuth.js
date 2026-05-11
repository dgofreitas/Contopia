// Contopia — useAuth Hook
// Auth state + idle timer + session timeout management
import { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../stores/auth-store';
import apiClient from '../lib/api-client';

const IDLE_WARNING_MS = 25 * 60 * 1000; // 25 minutes
const IDLE_EXPIRE_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_DEBOUNCE_MS = 5000; // 5 seconds

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'touchstart'];

export default function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const sessionExpiresAt = useAuthStore((s) => s.sessionExpiresAt);
  const sessionTimeoutWarning = useAuthStore((s) => s.sessionTimeoutWarning);
  const lastActivity = useAuthStore((s) => s.lastActivity);
  const updateActivity = useAuthStore((s) => s.updateActivity);
  const setSessionTimeoutWarning = useAuthStore((s) => s.setSessionTimeoutWarning);
  const clearAll = useAuthStore((s) => s.clearAll);

  const isAuthenticated = !!token;
  const [extendingSession, setExtendingSession] = useState(false);

  const warningTimerRef = useRef(null);
  const expireTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Debounced activity handler
  const handleActivity = useCallback(() => {
    if (debounceTimerRef.current) return; // debounce in progress
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (!isAuthenticated) return;

      updateActivity();
      setSessionTimeoutWarning(false);

      // Reset timers
      startIdleTimers();
    }, ACTIVITY_DEBOUNCE_MS);
  }, [isAuthenticated, updateActivity, setSessionTimeoutWarning]);

  // Start idle timers (25m warning, 30m expire)
  const startIdleTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      if (!useAuthStore.getState().token) return;
      setSessionTimeoutWarning(true);
    }, IDLE_WARNING_MS);

    expireTimerRef.current = setTimeout(() => {
      if (!useAuthStore.getState().token) return;
      handleAutoLogout();
    }, IDLE_EXPIRE_MS);
  }, [setSessionTimeoutWarning]);

  const handleAutoLogout = useCallback(() => {
    clearAll();
    window.location.href = '/login';
  }, [clearAll]);

  // Continue session (called when user clicks "Continue" in timeout modal)
  const continueSession = useCallback(async () => {
    setExtendingSession(true);
    try {
      await apiClient.get('/auth/me');
      updateActivity();
      setSessionTimeoutWarning(false);
      startIdleTimers();
    } catch {
      // If /me fails, session is gone — logout
      handleAutoLogout();
    } finally {
      setExtendingSession(false);
    }
  }, [updateActivity, setSessionTimeoutWarning, startIdleTimers, handleAutoLogout]);

  // Setup activity listeners and timers when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up timers if no longer authenticated
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      warningTimerRef.current = null;
      expireTimerRef.current = null;
      debounceTimerRef.current = null;
      return;
    }

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start idle timers from current lastActivity
    if (lastActivity) {
      const elapsed = Date.now() - lastActivity;
      const remainingWarning = IDLE_WARNING_MS - elapsed;
      const remainingExpire = IDLE_EXPIRE_MS - elapsed;

      if (remainingExpire <= 0) {
        handleAutoLogout();
        return;
      }

      if (remainingWarning <= 0 && remainingExpire > 0) {
        setSessionTimeoutWarning(true);
        warningTimerRef.current = null;
        expireTimerRef.current = setTimeout(handleAutoLogout, remainingExpire);
      } else {
        warningTimerRef.current = setTimeout(() => {
          setSessionTimeoutWarning(true);
        }, remainingWarning);
        expireTimerRef.current = setTimeout(handleAutoLogout, remainingExpire);
      }
    } else {
      startIdleTimers();
    }

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isAuthenticated, lastActivity]); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    await useAuthStore.getState().logout();
    window.location.href = '/login';
  }, []);

  return {
    isAuthenticated,
    user,
    sessionExpiresAt,
    showTimeoutModal: sessionTimeoutWarning,
    continueSession,
    logout,
    extendingSession,
  };
}