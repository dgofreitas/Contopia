import { describe, it, expect, vi, beforeEach } from 'vitest';
import { animate } from '../animate.js';

vi.mock('framer-motion', () => ({
  animate: vi.fn(() => ({
    cancel: vi.fn(),
    then: vi.fn((cb) => {
      cb();
      return Promise.resolve();
    }),
  })),
}));

import { animate as motionAnimate } from 'framer-motion';

describe('animate', () => {
  let element;
  let originalMatchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    element = {
      style: {},
    };
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('calls motion animate with duration converted to seconds and correct easing', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    animate(element, {
      to: { opacity: 1 },
      duration: 'entrance',
      easing: 'easeOut',
    });

    expect(motionAnimate).toHaveBeenCalledWith(element, { opacity: 1 }, {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    });
  });

  it('calls motion animate with numeric duration converted to seconds', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    animate(element, {
      to: { x: 100 },
      duration: 500,
      easing: [0.1, 0.2, 0.3, 0.4],
    });

    expect(motionAnimate).toHaveBeenCalledWith(element, { x: 100 }, {
      duration: 0.5,
      ease: [0.1, 0.2, 0.3, 0.4],
    });
  });

  it('cancels previous animation on same element when interruptible', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const firstHandle = animate(element, {
      to: { opacity: 1 },
      duration: 300,
      easing: 'easeOut',
      interruptible: true,
    });

    const cancelSpy = vi.spyOn(firstHandle, 'cancel');

    animate(element, {
      to: { opacity: 0 },
      duration: 200,
      easing: 'easeOut',
      interruptible: true,
    });

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('applies styles instantly under reduced-motion and does not call motion animate', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    const handle = animate(element, {
      to: { opacity: 1, transform: 'scale(1)' },
      duration: 300,
      easing: 'easeOut',
      onComplete: vi.fn(),
    });

    expect(motionAnimate).not.toHaveBeenCalled();
    expect(element.style.transform).toBe('scale(1)');
    expect(element.style.transition).toBe('opacity 150ms ease');
    expect(element.style.opacity).toBe('0');
    expect(handle.cancel).toBeDefined();
    expect(handle.onComplete).toBeTypeOf('function');
  });

  it('calls onComplete callback immediately under reduced-motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const onComplete = vi.fn();

    animate(element, {
      to: { opacity: 1 },
      duration: 300,
      easing: 'easeOut',
      onComplete,
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('does not cancel previous animation when interruptible is false', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const firstHandle = animate(element, {
      to: { opacity: 1 },
      duration: 300,
      easing: 'easeOut',
      interruptible: false,
    });

    const cancelSpy = vi.spyOn(firstHandle, 'cancel');

    animate(element, {
      to: { opacity: 0 },
      duration: 200,
      easing: 'easeOut',
      interruptible: false,
    });

    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('applies from styles before animating', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    animate(element, {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: 300,
      easing: 'easeOut',
    });

    expect(element.style.opacity).toBe(0);
  });

  it('returns handle with cancel and onComplete methods', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const handle = animate(element, {
      to: { opacity: 1 },
      duration: 300,
      easing: 'easeOut',
    });

    expect(handle.cancel).toBeTypeOf('function');
    expect(handle.onComplete).toBeTypeOf('function');
  });
});