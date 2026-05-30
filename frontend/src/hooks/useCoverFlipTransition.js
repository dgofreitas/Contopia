import { useState, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { supportsPreserve3d } from '../lib/css-3d-support.js';

const ANIMATION_CONFIG = {
  duration: 0.35,
  easing: [0.4, 0, 0.2, 1],
  perspective: 1200,
  reducedDuration: 0.15,
  fadeDuration: 0.2,
};

export default function useCoverFlipTransition({ onFlipComplete } = {}) {
  const [transitionState, setTransitionState] =useState('idle');
  const [bookData, setBookData] = useState(null);
  const prefersReducedMotion = useReducedMotion();
  const onCompleteRef = useRef(onFlipComplete);
  onCompleteRef.current = onFlipComplete;

  const is3DSupported = supportsPreserve3d();

  const startFlip = useCallback((book) => {
    setBookData(book);
    setTransitionState('flipping');
  }, []);

  const cancelFlip = useCallback(() => {
    setTransitionState('reversing');
  }, []);

  const completeFlip = useCallback(() => {
    setTransitionState('complete');
    onCompleteRef.current?.();
  }, []);

  const resetToIdle = useCallback(() => {
    setTransitionState('idle');
  }, []);

  return {
    transitionState,
    bookData,
    startFlip,
    cancelFlip,
    completeFlip,
    resetToIdle,
    is3DSupported,
    prefersReducedMotion: !!prefersReducedMotion,
    animationConfig: ANIMATION_CONFIG,
  };
}

export { ANIMATION_CONFIG };