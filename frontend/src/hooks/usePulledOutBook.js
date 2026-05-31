import { useState, useCallback, useRef } from 'react';
import { useReducedMotion, getDuration } from '../lib/animation-engine/index.js';

const PULL_OUT_DURATION_MS = 250;
const PLACE_BACK_FALLBACK_MS = PULL_OUT_DURATION_MS + 100;

export default function usePulledOutBook({ onPullOutComplete } = {}) {
  const [pulledOutBookId, setPulledOutBookId] = useState(null);
  const [isPlacingBack, setIsPlacingBack] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('idle');
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? getDuration('micro') / 1000 : PULL_OUT_DURATION_MS / 1000;
  const placeBackTimeoutRef = useRef(null);
  const onCompleteRef = useRef(onPullOutComplete);
  onCompleteRef.current = onPullOutComplete;

  const cancelPlaceBack = useCallback(() => {
    if (placeBackTimeoutRef.current) {
      clearTimeout(placeBackTimeoutRef.current);
      placeBackTimeoutRef.current = null;
    }
    setIsPlacingBack(false);
    setAnimationPhase('idle');
  }, []);

  const onPlaceBackComplete = useCallback(() => {
    if (placeBackTimeoutRef.current) {
      clearTimeout(placeBackTimeoutRef.current);
      placeBackTimeoutRef.current = null;
    }
    setPulledOutBookId(null);
    setIsPlacingBack(false);
    setAnimationPhase('idle');
  }, []);

  const pullOut = useCallback((bookId) => {
    setPulledOutBookId(bookId);
  }, []);

  const dismiss = useCallback(() => {
    setPulledOutBookId(null);
  }, []);

  const placeBack = useCallback(() => {
    setIsPlacingBack(true);
    setAnimationPhase('placeBack');
    placeBackTimeoutRef.current = setTimeout(() => {
      setPulledOutBookId(null);
      setIsPlacingBack(false);
      setAnimationPhase('idle');
      placeBackTimeoutRef.current = null;
    }, PLACE_BACK_FALLBACK_MS);
  }, []);

  const toggle = useCallback((bookId) => {
    if (animationPhase === 'placeBack' && bookId === pulledOutBookId) {
      cancelPlaceBack();
      return;
    }
    if (placeBackTimeoutRef.current) {
      clearTimeout(placeBackTimeoutRef.current);
      placeBackTimeoutRef.current = null;
    }
    setIsPlacingBack(false);
    setPulledOutBookId((prev) => {
      const next = prev === bookId ? null : bookId;
      if (next && next !== prev) {
        onCompleteRef.current?.();
      }
      return next;
    });
  }, [animationPhase, pulledOutBookId, cancelPlaceBack]);

  const isPulledOut = useCallback(
    (bookId) => pulledOutBookId === bookId,
    [pulledOutBookId],
  );

  const getReaderUrl = useCallback(
    (bookId, chapterId) => {
      const base = `/reader/${bookId}`;
      return chapterId ? `${base}?chapter=${chapterId}` : base;
    },
    [],
  );

  return { pulledOutBookId, pullOut, dismiss, placeBack, isPlacingBack, animationPhase, cancelPlaceBack, onPlaceBackComplete, toggle, isPulledOut, duration, getReaderUrl };
}