import { describe, it, expect, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  animate: vi.fn(() => ({
    cancel: vi.fn(),
    then: vi.fn((cb) => {
      cb();
      return Promise.resolve();
    }),
  })),
  useReducedMotion: vi.fn(() => false),
}));

describe('animation-engine integration', () => {
  it('re-exports all modules from index', async () => {
    const index = await import('../index.js');

    expect(index.DURATION).toBeDefined();
    expect(index.EASING).toBeDefined();
    expect(index.getDuration).toBeTypeOf('function');
    expect(index.getEasing).toBeTypeOf('function');
    expect(index.registerAnimation).toBeTypeOf('function');
    expect(index.cancelAnimation).toBeTypeOf('function');
    expect(index.isAnimating).toBeTypeOf('function');
    expect(index.useVisibilityPause).toBeTypeOf('function');
    expect(index.animate).toBeTypeOf('function');
    expect(index.stagger).toBeTypeOf('function');
    expect(index.useAnimationEngine).toBeTypeOf('function');
    expect(index.useReducedMotion).toBeTypeOf('function');
  });

  it('presets return correct values', async () => {
    const { getDuration, getEasing, DURATION, EASING } = await import('../presets.js');

    expect(getDuration('entrance')).toBe(DURATION.entrance);
    expect(getDuration('exit')).toBe(DURATION.exit);
    expect(getDuration('micro')).toBe(DURATION.micro);
    expect(getDuration(500)).toBe(500);

    expect(getEasing('easeOut')).toBe(EASING.easeOut);
    expect(getEasing('anticipate')).toBe(EASING.anticipate);
    expect(getEasing('spring')).toBe(EASING.spring);
    expect(getEasing([0.1, 0.2, 0.3, 0.4])).toEqual([0.1, 0.2, 0.3, 0.4]);
  });

  it('interruptibility tracks animations', async () => {
    const { registerAnimation, cancelAnimation, isAnimating } = await import('../interruptibility.js');

    const element = {};
    const handle = { cancel: vi.fn() };

    expect(isAnimating(element)).toBe(false);

    registerAnimation(element, handle);
    expect(isAnimating(element)).toBe(true);

    cancelAnimation(element);
    expect(handle.cancel).toHaveBeenCalled();
    expect(isAnimating(element)).toBe(false);
  });

  it('animate + interruptibility work together', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const { animate } = await import('../animate.js');
    const { isAnimating } = await import('../interruptibility.js');

    const element = { style: {} };

    animate(element, {
      to: { opacity: 1 },
      duration: 300,
      easing: 'easeOut',
    });

    expect(isAnimating(element)).toBe(true);
  });

  it('LazyMotion compatibility — engine exports work alongside framer-motion', async () => {
    const index = await import('../index.js');

    expect(index.animate).toBeDefined();
    expect(index.stagger).toBeDefined();
    expect(index.useReducedMotion).toBeDefined();
    expect(index.useAnimationEngine).toBeDefined();
  });
});