import { useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

const IDLE_TIMEOUT_MS = 3000;
const FADE_OUT_MS = 200;

export default function useShelfIdle(containerRef) {
  const prefersReducedMotion = useReducedMotion();
  const [isIdle, setIsIdle] = useState(false);
  const [shelfActive, setShelfActive] = useState(false);
  const timerRef = useRef(null);
  const activeTimerRef = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (prefersReducedMotion) {
      setIsIdle(false);
      setShelfActive(true);
      return;
    }

    setShelfActive(true);
    setIsIdle(false);
    clearTimeout(timerRef.current);
    clearTimeout(activeTimerRef.current);

    activeTimerRef.current = setTimeout(() => {
      setShelfActive(false);
    }, FADE_OUT_MS);

    timerRef.current = setTimeout(() => {
      setIsIdle(true);
      setShelfActive(false);
    }, IDLE_TIMEOUT_MS);
  }, [prefersReducedMotion]);

  useEffect(() => {
    const el = containerRef?.current || window;
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((evt) => el.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((evt) => el.removeEventListener(evt, resetIdleTimer));
      clearTimeout(timerRef.current);
      clearTimeout(activeTimerRef.current);
    };
  }, [containerRef, resetIdleTimer]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timerRef.current);
        setIsIdle(false);
      } else {
        resetIdleTimer();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [resetIdleTimer]);

  return { isIdle, shelfActive, prefersReducedMotion };
}