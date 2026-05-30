import { EASINGS, DURATIONS } from './config.js';

export function overlayVariants(reducedMotion) {
  if (reducedMotion) {
    return {
      backdrop: {},
      panel: {},
    };
  }

  return {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: DURATIONS.fast },
    },
    panel: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: DURATIONS.normal, ease: EASINGS.easeOut },
    },
  };
}

export function slideVariants(direction, reducedMotion) {
  if (reducedMotion) {
    return {
      initial: {},
      animate: {},
      exit: {},
    };
  }

  return {
    initial: {
      x: direction > 0 ? '100%' : '-100%',
      opacity: 1,
    },
    animate: {
      x: 0,
      opacity: 1,
    },
    exit: {
      x: direction > 0 ? '-100%' : '100%',
      opacity: 1,
    },
    transition: {
      duration: DURATIONS.moderate,
      ease: EASINGS.easeOut,
    },
  };
}

export function fadeVariants(reducedMotion) {
  if (reducedMotion) {
    return {};
  }

  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 16 },
    transition: { duration: DURATIONS.normal, ease: EASINGS.easeOut },
  };
}