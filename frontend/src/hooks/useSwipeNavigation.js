import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useSwipeNavigation — Pointer-based swipe detection hook.
 *
 * Uses unified pointer events (mouse, touch, pen) to detect horizontal swipes.
 * Vertical swipes are ignored (passed through for native scroll).
 * Swipe threshold: configurable, default 50px.
 *
 * @param {Object} options
 * @param {React.RefObject} options.ref — Ref to the container element
 * @param {Function} options.onSwipeLeft — Callback for left swipe (deltaX < -threshold)
 * @param {Function} options.onSwipeRight — Callback for right swipe (deltaX > threshold)
 * @param {number} options.minThreshold — Minimum px to trigger swipe (default 50)
 * @returns {{ isSwiping: boolean, deltaX: number }}
 */
export default function useSwipeNavigation({
  ref,
  onSwipeLeft,
  onSwipeRight,
  minThreshold = 50,
}) {
  const [isSwiping, setIsSwiping] = useState(false);
  const [deltaX, setDeltaX] = useState(0);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedRef = useRef(false); // true once direction is determined

  const handlePointerDown = useCallback((e) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lockedRef.current = false;
    setIsSwiping(true);
    setDeltaX(0);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!startXRef.current && !startYRef.current) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    setDeltaX(dx);

    // Vertical swipe dominance: if |dy| > |dx| * 1.5, ignore horizontal
    if (absDy > absDx * 1.5) {
      lockedRef.current = false;
      return;
    }

    // Horizontal movement detected — prevent horizontal scroll/rubber-banding
    if (absDx > absDy && absDx > 5) {
      lockedRef.current = true;
      e.preventDefault();
    }
  }, []);

  const handlePointerUp = useCallback((e) => {
    const dx = e.clientX - startXRef.current;
    const absDx = Math.abs(dx);

    // Distinguish swipe (>threshold) from tap (<10px)
    if (absDx >= minThreshold) {
      if (dx < -minThreshold && onSwipeLeft) {
        onSwipeLeft();
      } else if (dx > minThreshold && onSwipeRight) {
        onSwipeRight();
      }
    }

    startXRef.current = 0;
    startYRef.current = 0;
    lockedRef.current = false;
    setIsSwiping(false);
    setDeltaX(0);
  }, [minThreshold, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
    };
  }, [ref, handlePointerDown, handlePointerMove, handlePointerUp]);

  return { isSwiping, deltaX };
}