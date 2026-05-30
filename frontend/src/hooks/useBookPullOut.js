import { useState, useCallback, useRef } from 'react';
import { useReducedMotion } from '../lib/animation-engine/index.js';

const PULL_OUT_DURATION = 0.25;
const REVERSE_DURATION = 0.15;
const REDUCED_FADE_DURATION = 0.15;

const PULL_OUT_EASING = [0.34, 1.56, 0.64, 1];
const REVERSE_EASING = [0.25, 0.1, 0.25, 1];

const PULL_OUT_VARIANTS = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: {
      duration: REVERSE_DURATION,
      ease: REVERSE_EASING,
    },
  },
  pulled: {
    scale: 1.05,
    y: -8,
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    transition: {
      duration: PULL_OUT_DURATION,
      ease: PULL_OUT_EASING,
    },
  },
  reversing: {
    scale: 1,
    y: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: {
      duration: REVERSE_DURATION,
      ease: REVERSE_EASING,
    },
  },
  placeBack: {
    scale: 1,
    y: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    },
  },
};

const PULL_OUT_VARIANTS_REDUCED = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    opacity: 1,
    transition: {
      duration: 0,
    },
  },
  pulled: {
    scale: 1.05,
    y: -8,
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    opacity: 1,
    transition: {
      duration: REDUCED_FADE_DURATION,
      opacity: { duration: REDUCED_FADE_DURATION },
      scale: { duration: 0 },
      y: { duration: 0 },
      boxShadow: { duration: 0 },
    },
  },
  reversing: {
    scale: 1,
    y: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    opacity: 1,
    transition: {
      duration: 0,
    },
  },
  placeBack: {
    scale: 1,
    y: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    opacity: 1,
    transition: {
      duration: 0,
      opacity: { duration: 0.15 },
    },
  },
};

export { PULL_OUT_VARIANTS, PULL_OUT_VARIANTS_REDUCED, PULL_OUT_DURATION, REVERSE_DURATION, PULL_OUT_EASING, REVERSE_EASING };

export default function useBookPullOut({ onPullOutComplete } = {}) {
  const prefersReducedMotion = useReducedMotion();
  const [animatingBookId, setAnimatingBookId] = useState(null);
  const [isReversing, setIsReversing] = useState(false);
  const reverseTimeoutRef = useRef(null);
  const onCompleteRef = useRef(onPullOutComplete);
  onCompleteRef.current = onPullOutComplete;

  const startPullOut = useCallback((bookId) => {
    if (reverseTimeoutRef.current) {
      clearTimeout(reverseTimeoutRef.current);
      reverseTimeoutRef.current = null;
    }

    if (prefersReducedMotion) {
      setIsReversing(false);
      setAnimatingBookId(bookId);
      onCompleteRef.current?.();
      return;
    }

    if (animatingBookId && animatingBookId !== bookId) {
      setIsReversing(true);
      reverseTimeoutRef.current = setTimeout(() => {
        setIsReversing(false);
        setAnimatingBookId(bookId);
        reverseTimeoutRef.current = null;
      }, REVERSE_DURATION * 1000);
      return;
    }

    setIsReversing(false);
    setAnimatingBookId(bookId);
  }, [animatingBookId, prefersReducedMotion]);

  const reversePullOut = useCallback(() => {
    if (reverseTimeoutRef.current) {
      clearTimeout(reverseTimeoutRef.current);
      reverseTimeoutRef.current = null;
    }
    setIsReversing(true);
    setAnimatingBookId(null);
  }, []);

  const clearAnimating = useCallback(() => {
    setIsReversing(false);
    setAnimatingBookId(null);
  }, []);

  const getAnimationVariant = useCallback((bookId) => {
    if (prefersReducedMotion) {
      return PULL_OUT_VARIANTS_REDUCED;
    }
    return PULL_OUT_VARIANTS;
  }, [prefersReducedMotion]);

  const getVariantName = useCallback((bookId, pulledOutBookId) => {
    const isThisBookPulledOut = bookId === pulledOutBookId;

    if (isReversing && bookId === animatingBookId && !isThisBookPulledOut) {
      return 'reversing';
    }

    if (isThisBookPulledOut) {
      return 'pulled';
    }

    return 'rest';
  }, [isReversing, animatingBookId]);

  return {
    animatingBookId,
    isReversing,
    startPullOut,
    reversePullOut,
    clearAnimating,
    getAnimationVariant,
    getVariantName,
  };
}