import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import useBookStore from '../stores/book-store';

const MAX_STAGGER_MS = 300;
const STAGGER_PER_INDEX_MS = 30;

export default function useSortAnimation() {
  const prefersReducedMotion = useReducedMotion();
  const sortGeneration = useBookStore((s) => s.sortGeneration);

  const getTransition = useMemo(() => {
    return (index) => {
      const delay = Math.min(index * STAGGER_PER_INDEX_MS, MAX_STAGGER_MS) / 1000;

      if (prefersReducedMotion) {
        return { type: 'tween', duration: 0.15, ease: 'easeOut' };
      }

      return { type: 'spring', stiffness: 300, damping: 20, delay };
    };
  }, [prefersReducedMotion]);

  return {
    sortGeneration,
    prefersReducedMotion,
    getTransition,
    isAnimating: true,
  };
}