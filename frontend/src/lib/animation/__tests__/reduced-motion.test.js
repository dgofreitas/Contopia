import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockUseReducedMotion = vi.hoisted(() => vi.fn(() => false));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import { useReducedMotionConfig } from '../reduced-motion.js';

describe('animation/reduced-motion', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  describe('when prefersReducedMotion is false', () => {
    it('returns prefersReducedMotion as false', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      expect(result.current.prefersReducedMotion).toBe(false);
    });

    it('returns shouldAnimate as true', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      expect(result.current.shouldAnimate).toBe(true);
    });

    it('duration() returns the passed ms value', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      expect(result.current.duration(0.3)).toBe(0.3);
    });

    it('duration() returns passed value even for 0', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      expect(result.current.duration(0)).toBe(0);
    });

    it('transition("tween", 0.5) returns tween config', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      const t = result.current.transition('tween', 0.5);
      expect(t.type).toBe('tween');
      expect(t.duration).toBe(0.5);
    });

    it('transition("spring") returns spring config', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      const t = result.current.transition('spring');
      expect(t.type).toBe('spring');
    });

    it('transition("spring", 0.3) includes duration', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      const t = result.current.transition('spring', 0.3);
      expect(t.type).toBe('spring');
      expect(t.duration).toBe(0.3);
    });

    it('transition() with no type defaults to tween with normal duration', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      const t = result.current.transition('tween');
      expect(t.duration).toBe(0.2);
    });
  });

  describe('when prefersReducedMotion is true', () => {
    beforeEach(() => {
      mockUseReducedMotion.mockReturnValue(true);
    });

    it('returns prefersReducedMotion as true', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('returns shouldAnimate as false', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      expect(result.current.shouldAnimate).toBe(false);
    });

    it('duration() returns 0 (instant)', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      expect(result.current.duration(0.5)).toBe(0);
    });

    it('transition() returns reduced-motion tween fallback', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      const t = result.current.transition('spring');
      expect(t.type).toBe('tween');
      expect(t.duration).toBe(0.15);
      expect(t.ease).toBe('easeOut');
    });

    it('transition("tween") also returns reduced-motion fallback', () => {
      const { result } = renderHook(() => useReducedMotionConfig());
      const t = result.current.transition('tween', 0.5);
      expect(t.type).toBe('tween');
      expect(t.duration).toBe(0.15);
    });
  });
});