import useBookStore from '../stores/book-store';
import { useStagger } from '../lib/animation/stagger.js';
import { useReducedMotionConfig } from '../lib/animation/reduced-motion.js';

export default function useSortAnimation() {
  const sortGeneration = useBookStore((s) => s.sortGeneration);
  const { prefersReducedMotion } = useReducedMotionConfig();
  const { getTransition } = useStagger();

  return {
    sortGeneration,
    prefersReducedMotion,
    getTransition,
    isAnimating: true,
  };
}