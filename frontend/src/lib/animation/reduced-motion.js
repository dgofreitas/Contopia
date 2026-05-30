import { useReducedMotion } from 'framer-motion';
import { DURATIONS } from './config.js';

export function useReducedMotionConfig() {
  const prefersReducedMotion = useReducedMotion();

  const duration = (ms) => (prefersReducedMotion ? DURATIONS.instant : ms);

  const transition = (type, ms) => {
    if (prefersReducedMotion) {
      return { type: 'tween', duration: DURATIONS.fast, ease: 'easeOut' };
    }
    if (type === 'spring') {
      return { type: 'spring', ...(ms ? { duration: ms } : {}) };
    }
    return { type: 'tween', duration: ms ?? DURATIONS.normal };
  };

  return {
    prefersReducedMotion,
    duration,
    transition,
    shouldAnimate: !prefersReducedMotion,
  };
}