import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockUseReducedMotion = vi.hoisted(() => vi.fn(() => false));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

describe('animation/stagger', () => {
  let staggerConfig, staggerTransition, useStagger;

  beforeEach(async () => {
    mockUseReducedMotion.mockReturnValue(false);
      const mod = await import('../stagger.js');
      staggerConfig = mod.staggerConfig;
      staggerTransition = mod.staggerTransition;
      useStagger = mod.useStagger;
  });

  describe('staggerConfig', () => {
    it('returns staggerChildren with default perElementMs (30ms)', () => {
      const config = staggerConfig();
      expect(config.staggerChildren).toBe(0.03);
    });

    it('accepts custom perElementMs', () => {
      const config = staggerConfig({ perElementMs: 50 });
      expect(config.staggerChildren).toBe(0.05);
    });
  });

  describe('staggerTransition', () => {
    it('returns spring transition with delay for index 0', () => {
      const t = staggerTransition(0);
      expect(t.type).toBe('spring');
      expect(t.delay).toBe(0);
      expect(t.stiffness).toBe(300);
      expect(t.damping).toBe(20);
    });

    it('calculates delay as index * perElementMs / 1000', () => {
      const t = staggerTransition(5);
      expect(t.delay).toBe(0.15);
    });

    it('caps delay at maxMs (300ms)', () => {
      const t = staggerTransition(10);
      expect(t.delay).toBe(0.3);
    });

    it('caps delay even for very high indices', () => {
      const t = staggerTransition(50);
      expect(t.delay).toBe(0.3);
    });

    it('accepts custom stiffness and damping', () => {
      const t = staggerTransition(0, { stiffness: 400, damping: 25 });
      expect(t.stiffness).toBe(400);
      expect(t.damping).toBe(25);
    });

    it('accepts custom perElementMs and maxMs', () => {
      const t = staggerTransition(5, { perElementMs: 50, maxMs: 500 });
      // 5 * 50 = 250ms = 0.25s
      expect(t.delay).toBe(0.25);
    });
  });

  describe('useStagger', () => {
    describe('when prefersReducedMotion is false', () => {
      beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(false);
      });

      it('returns containerVariants with staggerChildren', () => {
        const { result } = renderHook(() => useStagger());
        const { containerVariants } = result.current;
        expect(containerVariants.visible.transition.staggerChildren).toBe(0.03);
      });

      it('returns itemVariants with hidden and visible states', () => {
        const { result } = renderHook(() => useStagger());
        const { itemVariants } = result.current;
        expect(itemVariants.hidden).toEqual({ opacity: 0, y: 10 });
        expect(itemVariants.visible).toEqual({ opacity: 1, y: 0 });
      });

      it('getTransition returns spring transition for index 0', () => {
        const { result } = renderHook(() => useStagger());
        const t = result.current.getTransition(0);
        expect(t.type).toBe('spring');
        expect(t.delay).toBe(0);
      });

      it('getTransition caps delay at maxMs', () => {
        const { result } = renderHook(() => useStagger());
        const t = result.current.getTransition(50);
        expect(t.delay).toBe(0.3);
      });
    });

    describe('when prefersReducedMotion is true', () => {
      beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(true);
      });

      it('returns empty containerVariants', () => {
        const { result } = renderHook(() => useStagger());
        expect(result.current.containerVariants).toEqual({});
      });

      it('returns empty itemVariants', () => {
        const { result } = renderHook(() => useStagger());
        expect(result.current.itemVariants).toEqual({});
      });

      it('getTransition returns tween config (reduced-motion fallback)', () => {
        const { result } = renderHook(() => useStagger());
        const t = result.current.getTransition(5);
        expect(t.type).toBe('tween');
        expect(t.duration).toBe(0.15);
        expect(t.ease).toBe('easeOut');
      });
    });
  });
});