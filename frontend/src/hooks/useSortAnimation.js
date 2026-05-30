import { useMemo } from 'react';
import { useReducedMotion, getDuration } from '../lib/animation-engine/index.js';
import useBookStore from '../stores/book-store';
import { STAGGER_PER_INDEX_MS, MAX_STAGGER_MS } from '../lib/animation-engine/index.js';

export default function useSortAnimation() {
  const sortGeneration = useBookStore((s) => s.sortGeneration);
  const prefersReducedMotion = useReducedMotion();

  const getTransition = useMemo(() => {
    return (index) => {
      const delay = Math.min(index * STAGGER_PER_INDEX_MS, MAX_STAGGER_MS) / 1000;

      if (prefersReducedMotion) {
        return { type: 'tween', duration: getDuration('micro') / 1000, ease: 'easeOut' };
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