import { useMemo } from 'react';
import { useReducedMotionConfig } from './reduced-motion.js';
import { STAGGER, SPRINGS, DURATIONS, EASINGS } from './config.js';

export function staggerConfig(options = {}) {
  const perElementMs = options.perElementMs ?? STAGGER.perElementMs;
  return { staggerChildren: perElementMs / 1000 };
}

export function staggerTransition(index, options = {}) {
  const perElementMs = options.perElementMs ?? STAGGER.perElementMs;
  const maxMs = options.maxMs ?? STAGGER.maxMs;
  const delay = Math.min(index * perElementMs, maxMs) / 1000;

  return {
    type: 'spring',
    stiffness: options.stiffness ?? SPRINGS.bouncy.stiffness,
    damping: options.damping ?? SPRINGS.bouncy.damping,
    delay,
  };
}

export function useStagger(options = {}) {
  const { prefersReducedMotion } = useReducedMotionConfig();
  const perElementMs = options.perElementMs ?? STAGGER.perElementMs;

  const containerVariants = useMemo(() => {
    if (prefersReducedMotion) return {};
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: perElementMs / 1000 },
      },
    };
  }, [prefersReducedMotion, perElementMs]);

  const itemVariants = useMemo(() => {
    if (prefersReducedMotion) return {};
    return {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 },
    };
  }, [prefersReducedMotion]);

  const getTransition = useMemo(() => {
    return (index) => {
      if (prefersReducedMotion) {
        return { type: 'tween', duration: DURATIONS.fast, ease: 'easeOut' };
      }
      return staggerTransition(index, options);
    };
  }, [prefersReducedMotion, options.perElementMs, options.maxMs, options.stiffness, options.damping]);

  return { containerVariants, itemVariants, getTransition };
}