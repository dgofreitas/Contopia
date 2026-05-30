import { animate } from 'framer-motion';
import { useCallback } from 'react';
import { useReducedMotionConfig } from './reduced-motion.js';

const activeAnimations = new WeakMap();

export function animateElement(element, keyframes, options = {}) {
  const existing = activeAnimations?.get(element);
  if (existing) existing.cancel();

  const { onComplete, ...rest } = options;
  const animation = animate(element, keyframes, {
    ...rest,
    onComplete: () => {
      activeAnimations?.delete(element);
      onComplete?.();
    },
  });

  activeAnimations.set(element, animation);
  return animation;
}

export function useAnimateElement() {
  const { prefersReducedMotion } = useReducedMotionConfig();

  return useCallback(
    (element, keyframes, options = {}) => {
      if (prefersReducedMotion) {
        const finalState = {};
        for (const [key, value] of Object.entries(keyframes)) {
          finalState[key] = Array.isArray(value) ? value[value.length - 1] : value;
        }
        Object.assign(element.style ?? element, finalState);
        options.onComplete?.();
        return null;
      }
      return animateElement(element, keyframes, options);
    },
    [prefersReducedMotion],
  );
}