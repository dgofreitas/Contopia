import { useState, useCallback, useRef } from 'react';
import useBookStore from '../stores/book-store';

export default function useSortPreference() {
  const sortMode = useBookStore((s) => s.sortMode);
  const setSortMode = useBookStore((s) => s.setSortMode);
  const sortGeneration = useBookStore((s) => s.sortGeneration);

  const [isSortTransitioning, setIsSortTransitioning] = useState(false);
  const transitionTimerRef = useRef(null);

  const setSortModeWithAnimation = useCallback((newSortMode) => {
    setIsSortTransitioning(true);

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    setSortMode(newSortMode);

    transitionTimerRef.current = setTimeout(() => {
      setIsSortTransitioning(false);
      transitionTimerRef.current = null;
    }, 500);

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [setSortMode]);

  return {
    sortMode,
    setSortMode: setSortModeWithAnimation,
    sortGeneration,
    isSortTransitioning,
  };
}