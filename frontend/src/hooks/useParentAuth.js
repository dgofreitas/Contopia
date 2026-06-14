// Contopia — useParentAuth Hook
// Idle timer for parent session: tracks last activity via mouse move / keypress
// NFR-SEC-03: 25min idle → show warning; 30min idle → auto logout
import { useState, useEffect, useCallback, useRef } from 'react';
import useParentAuthStore from '../stores/parent-auth-store';

const IDLE_WARNING_MS = 25 * 60 * 1000; // 25 minutes
const IDLE_EXPIRE_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_DEBOUNCE_MS = 5000; // 5 seconds

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'touchstart'];

export default function useParentAuth() {
  const parentToken = useParentAuthStore((s) => s.parentToken);
  const parentLastActivity = useParentAuthStore((s) => s.parentLastActivity);
  const parentSessionExpiresAt = useParentAuthStore((s) => s.parentSessionExpiresAt);
  const updateParentActivity = useParentAuthStore((s) => s.updateParentActivity);
  const parentLogout = useParentAuthStore((s) => s.parentLogout);
  const sessionExpiring = useParentAuthStore((s) => s.sessionExpiring);
  const sessionExpiringSeconds = useParentAuthStore((s) => s.sessionExpiringSeconds);
  const clearSessionExpiring = useParentAuthStore((s) => s.clearSessionExpiring);

  const isAuthenticated = !!parentToken;

  const [isIdle, setIsIdle] = useState(false);
  const [idleTime, setIdleTime] = useState(0);

  const warningTimerRef = useRef(null);
  const expireTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const idleIntervalRef = useRef(null);

  const handleAutoLogout = useCallback(async () => {
    await parentLogout();
    window.location.href = '/parent/login';
  }, [parentLogout]);

  // Start idle timers (25m warning, 30m expire)
  const startIdleTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);

    warningTimerRef.current = setTimeout(() => {
      if (!useParentAuthStore.getState().parentToken) return;
      setIsIdle(true);
      // Start tracking idle time in minutes
      const idleStart = Date.now();
      idleIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - idleStart) / 60000);
        setIdleTime(elapsed);
      }, 60000);
    }, IDLE_WARNING_MS);

    expireTimerRef.current = setTimeout(() => {
      if (!useParentAuthStore.getState().parentToken) return;
      handleAutoLogout();
    }, IDLE_EXPIRE_MS);
  }, [handleAutoLogout]);

  // Debounced activity handler
  const handleActivity = useCallback(() => {
    if (debounceTimerRef.current) return;
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (!isAuthenticated) return;

      updateParentActivity();
      setIsIdle(false);
      setIdleTime(0);
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);

      startIdleTimers();
    }, ACTIVITY_DEBOUNCE_MS);
  }, [isAuthenticated, updateParentActivity, startIdleTimers]);

  // Continue session (called when user dismisses idle warning)
  const continueParentSession = useCallback(() => {
    updateParentActivity();
    useParentAuthStore.getState().clearSessionExpiring();
    setIsIdle(false);
    setIdleTime(0);
    if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    startIdleTimers();
  }, [updateParentActivity, startIdleTimers]);

  // STORY-060: When server signals session expiring, trigger idle warning UI
  useEffect(() => {
    if (sessionExpiring && isAuthenticated) {
      setIsIdle(true);
      // Start tracking idle time from current moment
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
      const idleStart = Date.now();
      idleIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - idleStart) / 60000);
        setIdleTime(elapsed);
      }, 60000);
    }
  }, [sessionExpiring, isAuthenticated]);

  // Setup activity listeners and timers when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
      warningTimerRef.current = null;
      expireTimerRef.current = null;
      debounceTimerRef.current = null;
      idleIntervalRef.current = null;
      setIsIdle(false);
      setIdleTime(0);
      return;
    }

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start timers from current lastActivity or fresh
    if (parentLastActivity) {
      const elapsed = Date.now() - parentLastActivity;
      const remainingWarning = IDLE_WARNING_MS - elapsed;
      const remainingExpire = IDLE_EXPIRE_MS - elapsed;

      if (remainingExpire <= 0) {
        handleAutoLogout();
        return;
      }

      if (remainingWarning <= 0 && remainingExpire > 0) {
        setIsIdle(true);
        warningTimerRef.current = null;
        expireTimerRef.current = setTimeout(handleAutoLogout, remainingExpire);
      } else {
        warningTimerRef.current = setTimeout(() => setIsIdle(true), remainingWarning);
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
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
    };
  }, [isAuthenticated, parentLastActivity]);

  const logout = useCallback(async () => {
    await parentLogout();
    window.location.href = '/parent/login';
  }, [parentLogout]);

  return {
    isAuthenticated,
    isIdle,
    idleTime,
    parentSessionExpiresAt,
    continueParentSession,
    logout,
    sessionExpiring,
    sessionExpiringSeconds,
  };
}