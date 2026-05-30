import { cancelAnimation, registerAnimation } from './interruptibility.js';
import { getDuration, getEasing } from './presets.js';
import { animate as motionAnimate } from 'framer-motion';

export function animate(element, options = {}) {
  const {
    from,
    to,
    duration: durationInput,
    easing: easingInput,
    onComplete,
    interruptible = true,
  } = options;

  if (interruptible) {
    cancelAnimation(element);
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    Object.assign(element.style, to);
    element.style.transition = 'opacity 150ms ease';
    element.style.opacity = '0';
    requestAnimationFrame(() => {
      element.style.opacity = '1';
    });

    const reducedHandle = {
      cancel() {},
      onComplete(cb) {
        cb();
      },
    };

    if (onComplete) {
      onComplete();
    }

    registerAnimation(element, reducedHandle);
    return reducedHandle;
  }

  const duration = getDuration(durationInput);
  const easing = getEasing(easingInput);

  if (from) {
    Object.assign(element.style, from);
  }

  const motionOptions = {
    duration: duration / 1000,
    ease: easing,
  };

  const motionHandle = motionAnimate(element, to, motionOptions);

  const handle = {
    cancel() {
      motionHandle.cancel();
    },
    onComplete(cb) {
      motionHandle.then(cb);
    },
  };

  if (onComplete) {
    motionHandle.then(() => {
      onComplete();
    });
  }

  registerAnimation(element, handle);
  return handle;
}