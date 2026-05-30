import { useReducedMotion } from 'framer-motion';
import { useVisibilityPause } from './use-visibility-pause.js';
import { animate } from './animate.js';
import { stagger } from './stagger.js';

export function useAnimationEngine() {
  const prefersReducedMotion = useReducedMotion();
  const { isPaused } = useVisibilityPause();

  return {
    animate,
    stagger,
    prefersReducedMotion,
    isPaused,
  };
}