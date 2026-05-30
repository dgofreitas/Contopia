// Contopia — useSortAnimation hook tests (STORY-037)
// Tests: stagger delay formula (capped 300ms), sortGeneration increment,
//        reduced-motion guard returning tween instead of spring

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Use vi.hoisted for mock variables accessible in vi.mock factories
const mockUseReducedMotion = vi.hoisted(() => vi.fn(() => false));
const mockSortGeneration = vi.hoisted(() => ({ value: 0 }));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

vi.mock('../stores/book-store', () => ({
  default: (selector) => selector({ sortGeneration: mockSortGeneration.value }),
}));

// Re-import needed for beforeEach — dynamic import to pick up mocks
let useSortAnimation;

describe('useSortAnimation (STORY-037)', () => {
  beforeEach(async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockSortGeneration.value = 0;
    useSortAnimation = (await import('../hooks/useSortAnimation')).default;
  });

  describe('sortGeneration', () => {
    it('returns sortGeneration from the book store', () => {
      const { result } = renderHook(() => useSortAnimation());
      expect(result.current.sortGeneration).toBe(0);
    });

    it('reflects incremented sortGeneration from store', () => {
      mockSortGeneration.value = 5;
      const { result } = renderHook(() => useSortAnimation());
      expect(result.current.sortGeneration).toBe(5);
    });
  });

  it('returns prefersReducedMotion as false by default', () => {
    const { result } = renderHook(() => useSortAnimation());
    expect(result.current.prefersReducedMotion).toBe(false);
  });

  it('returns isAnimating as true', () => {
    const { result } = renderHook(() => useSortAnimation());
    expect(result.current.isAnimating).toBe(true);
  });

  describe('getTransition — positive / spring path', () => {
    it('returns spring config with delay = 0s for index 0', () => {
      const { result } = renderHook(() => useSortAnimation());
      const transition = result.current.getTransition(0);
      expect(transition).toEqual({
        type: 'spring',
        stiffness: 300,
        damping: 20,
        delay: 0,
      });
    });

    it('returns spring config with delay = 0.15s for index 5', () => {
      const { result } = renderHook(() => useSortAnimation());
      const transition = result.current.getTransition(5);
      // 5 * 30 = 150ms → 0.15s
      expect(transition.delay).toBe(0.15);
      expect(transition.type).toBe('spring');
    });

    it('caps stagger delay at 300ms for index >= 10', () => {
      const { result } = renderHook(() => useSortAnimation());
      // index 10 → 10 * 30 = 300ms → capped at 300ms
      const transitionAt10 = result.current.getTransition(10);
      expect(transitionAt10.delay).toBe(0.3);

      // index 50 → 50 * 30 = 1500ms → capped at 300ms
      const transitionAt50 = result.current.getTransition(50);
      expect(transitionAt50.delay).toBe(0.3);
    });

    it('all indices produce spring type when reduced-motion is off', () => {
      const { result } = renderHook(() => useSortAnimation());
      for (let i = 0; i < 50; i++) {
        const t = result.current.getTransition(i);
        expect(t.type).toBe('spring');
        expect(t.stiffness).toBe(300);
        expect(t.damping).toBe(20);
      }
    });
  });

  describe('getTransition — negative / reduced-motion path', () => {
    beforeEach(() => {
      mockUseReducedMotion.mockReturnValue(true);
    });

    it('returns tween config (not spring) when prefersReducedMotion is true', () => {
      const { result } = renderHook(() => useSortAnimation());
      const transition = result.current.getTransition(3);
      expect(transition.type).toBe('tween');
      expect(transition.type).not.toBe('spring');
    });

    it('reduced-motion tween has duration 0.15s and ease easeOut', () => {
      const { result } = renderHook(() => useSortAnimation());
      const transition = result.current.getTransition(7);
      expect(transition).toEqual({
        type: 'tween',
        duration: 0.15,
        ease: 'easeOut',
      });
    });

    it('reduced-motion tween has no delay regardless of index', () => {
      const { result } = renderHook(() => useSortAnimation());
      // Even at high index, reduced motion has no delay
      const transition = result.current.getTransition(99);
      expect(transition.delay).toBeUndefined();
    });

    it('returns prefersReducedMotion as true when reduced motion active', () => {
      const { result } = renderHook(() => useSortAnimation());
      expect(result.current.prefersReducedMotion).toBe(true);
    });
  });
});
