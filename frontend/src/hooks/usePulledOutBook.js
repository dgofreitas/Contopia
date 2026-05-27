import { useState, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function usePulledOutBook() {
  const [pulledOutBookId, setPulledOutBookId] = useState(null);
  const [isPlacingBack, setIsPlacingBack] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? 0 : 0.3;
  const placeBackTimeoutRef = useRef(null);

  const pullOut = useCallback((bookId) => {
    setPulledOutBookId(bookId);
  }, []);

  const dismiss = useCallback(() => {
    setPulledOutBookId(null);
  }, []);

  const placeBack = useCallback(() => {
    setIsPlacingBack(true);
    placeBackTimeoutRef.current = setTimeout(() => {
      setPulledOutBookId(null);
      setIsPlacingBack(false);
    }, duration * 1000);
  }, [duration]);

  const toggle = useCallback((bookId) => {
    if (placeBackTimeoutRef.current) {
      clearTimeout(placeBackTimeoutRef.current);
      placeBackTimeoutRef.current = null;
    }
    setIsPlacingBack(false);
    setPulledOutBookId((prev) => (prev === bookId ? null : bookId));
  }, []);

  const isPulledOut = useCallback(
    (bookId) => pulledOutBookId === bookId,
    [pulledOutBookId],
  );

  const getReaderUrl = useCallback(
    (bookId, chapterId) => {
      const base = `/reader/${bookId}`;
      return chapterId ? `${base}?chapter=${chapterId}` : base;
    },
    [],
  );

  return { pulledOutBookId, pullOut, dismiss, placeBack, isPlacingBack, toggle, isPulledOut, duration, getReaderUrl };
}
