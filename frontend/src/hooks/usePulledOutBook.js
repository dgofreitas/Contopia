import { useState, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function usePulledOutBook() {
  const [pulledOutBookId, setPulledOutBookId] = useState(null);
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? 0 : 0.3;

  const pullOut = useCallback((bookId) => {
    setPulledOutBookId(bookId);
  }, []);

  const dismiss = useCallback(() => {
    setPulledOutBookId(null);
  }, []);

  const toggle = useCallback((bookId) => {
    setPulledOutBookId((prev) => (prev === bookId ? null : bookId));
  }, []);

  const isPulledOut = useCallback(
    (bookId) => pulledOutBookId === bookId,
    [pulledOutBookId],
  );

  return { pulledOutBookId, pullOut, dismiss, toggle, isPulledOut, duration };
}
