import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockUseReducedMotion = vi.hoisted(() => vi.fn(() => false));
const mockAnimate = vi.hoisted(() => vi.fn(() => ({ cancel: vi.fn() })));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
  animate: mockAnimate,
}));

import { animateElement, useAnimateElement } from '../animate.js';

describe('animation/animate', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    mockAnimate.mockReturnValue({ cancel: vi.fn() });
  });

  describe('animateElement', () => {
    it('returns an animation object', () => {
      const element = { style: {} };
      const animation = animateElement(element, { opacity: [0, 1] }, {});
      expect(animation).toBeDefined();
    });

    it('cancels in-flight animation before starting new one (WeakMap interruptibility)', () => {
      const element = { style: {} };
      const cancelSpy = vi.fn();
      mockAnimate.mockReturnValueOnce({ cancel: cancelSpy });

      animateElement(element, { opacity: [0, 1] }, {});
      animateElement(element, { x: [0, 100] }, {});

      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete callback after animation finishes', () => {
      const element = { style: {} };
      const onComplete = vi.fn();

      mockAnimate.mockImplementation((_el, _kf, opts) => {
        opts.onComplete();
        return { cancel: vi.fn() };
      });

      animateElement(element, { opacity: [0, 1] }, { onComplete });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('removes animation from WeakMap on complete', () => {
      const element = { style: {} };

      mockAnimate.mockImplementation((_el, _kf, opts) => {
        opts.onComplete();
        return { cancel: vi.fn() };
      });

      animateElement(element, { opacity: [0, 1] }, {});
      const cancelSpy2 = vi.fn();
      mockAnimate.mockReturnValueOnce({ cancel: cancelSpy2 });
      animateElement(element, { x: [0, 100] }, {});
      expect(cancelSpy2).not.toHaveBeenCalled();
    });
  });

  describe('useAnimateElement', () => {
    it('returns a callable function', () => {
      const { result } = renderHook(() => useAnimateElement());
      expect(typeof result.current).toBe('function');
    });

    describe('when reduced motion is preferred', () => {
      beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(true);
      });

      it('instantly applies final keyframe state and calls onComplete', () => {
        const { result } = renderHook(() => useAnimateElement());
        const element = { style: {} };
        const onComplete = vi.fn();

        result.current(element, { opacity: [0, 1], x: [0, 100] }, { onComplete });

        expect(element.style.opacity).toBe(1);
        expect(element.style.x).toBe(100);
        expect(onComplete).toHaveBeenCalledTimes(1);
      });

      it('returns null (no animation) when reduced motion is on', () => {
        const { result } = renderHook(() => useAnimateElement());
        const element = { style: {} };
        const ret = result.current(element, { opacity: [0, 1] }, {});
        expect(ret).toBeNull();
      });

      it('handles single-value (non-array) keyframes', () => {
        const { result } = renderHook(() => useAnimateElement());
        const element = { style: {} };
        result.current(element, { opacity: 0.5 }, {});
        expect(element.style.opacity).toBe(0.5);
      });
    });

    describe('when reduced motion is not preferred', () => {
      beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(false);
      });

      it('delegates to animateElement', () => {
        const { result } = renderHook(() => useAnimateElement());
        const element = { style: {} };
        const ret = result.current(element, { opacity: [0, 1] }, {});
        expect(ret).toBeDefined();
      });
    });
  });
});