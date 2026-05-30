import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBookPullOut, {
  PULL_OUT_VARIANTS,
  PULL_OUT_VARIANTS_REDUCED,
  PULL_OUT_DURATION,
  REVERSE_DURATION,
  PULL_OUT_EASING,
  REVERSE_EASING,
} from '../hooks/useBookPullOut';

const mockUseReducedMotion = vi.fn();
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

describe('useBookPullOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  describe('initial state', () => {
    it('starts with null animatingBookId', () => {
      const { result } = renderHook(() => useBookPullOut());
      expect(result.current.animatingBookId).toBeNull();
    });

    it('starts with isReversing false', () => {
      const { result } = renderHook(() => useBookPullOut());
      expect(result.current.isReversing).toBe(false);
    });
  });

  describe('startPullOut', () => {
    it('sets animatingBookId when starting pull-out', () => {
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      expect(result.current.animatingBookId).toBe('book-1');
      expect(result.current.isReversing).toBe(false);
    });

    it('calls onPullOutComplete callback in reduced motion mode', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = vi.fn();
      const { result } = renderHook(() => useBookPullOut({ onPullOutComplete: onComplete }));

      act(() => {
        result.current.startPullOut('book-1');
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('sets isReversing to false when starting a new pull-out', () => {
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      expect(result.current.isReversing).toBe(false);
    });
  });

  describe('interruptibility', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('sets isReversing when starting pull-out on different book while one animates', () => {
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      act(() => {
        result.current.startPullOut('book-2');
      });

      expect(result.current.isReversing).toBe(true);
    });

    it('starts new pull-out after reverse duration when interrupting', () => {
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      act(() => {
        result.current.startPullOut('book-2');
      });

      expect(result.current.isReversing).toBe(true);
      expect(result.current.animatingBookId).toBe('book-1');

      act(() => {
        vi.advanceTimersByTime(REVERSE_DURATION * 1000);
      });

      expect(result.current.isReversing).toBe(false);
      expect(result.current.animatingBookId).toBe('book-2');
    });

    it('cancels previous reverse timeout when rapidly tapping 3 different spines', () => {
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      act(() => {
        result.current.startPullOut('book-2');
      });

      act(() => {
        vi.advanceTimersByTime(REVERSE_DURATION * 1000 / 2);
      });

      act(() => {
        result.current.startPullOut('book-3');
      });

      expect(result.current.isReversing).toBe(true);

      act(() => {
        vi.advanceTimersByTime(REVERSE_DURATION * 1000);
      });

      expect(result.current.isReversing).toBe(false);
      expect(result.current.animatingBookId).toBe('book-3');
    });
  });

  describe('reversePullOut', () => {
    it('sets isReversing to true and clears animatingBookId', () => {
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      expect(result.current.animatingBookId).toBe('book-1');

      act(() => {
        result.current.reversePullOut();
      });

      expect(result.current.isReversing).toBe(true);
      expect(result.current.animatingBookId).toBeNull();
    });
  });

  describe('clearAnimating', () => {
    it('resets animatingBookId and isReversing', () => {
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      act(() => {
        result.current.clearAnimating();
      });

      expect(result.current.animatingBookId).toBeNull();
      expect(result.current.isReversing).toBe(false);
    });
  });

  describe('getAnimationVariant', () => {
    it('returns reduced motion variants when prefersReducedMotion is true', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { result } = renderHook(() => useBookPullOut());

      const variants = result.current.getAnimationVariant('book-1');
      expect(variants).toBe(PULL_OUT_VARIANTS_REDUCED);
    });

    it('returns standard variants when prefersReducedMotion is false', () => {
      mockUseReducedMotion.mockReturnValue(false);
      const { result } = renderHook(() => useBookPullOut());

      const variants = result.current.getAnimationVariant('book-1');
      expect(variants).toBe(PULL_OUT_VARIANTS);
    });
  });

  describe('getVariantName', () => {
    it('returns "pulled" when book is pulled out and not reversing', () => {
      const { result } = renderHook(() => useBookPullOut());

      const variant = result.current.getVariantName('book-1', 'book-1');
      expect(variant).toBe('pulled');
    });

    it('returns "rest" when book is not pulled out and not reversing', () => {
      const { result } = renderHook(() => useBookPullOut());

      const variant = result.current.getVariantName('book-1', 'book-2');
      expect(variant).toBe('rest');
    });

    it('returns "reversing" when book was animating and is now reversing', () => {
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      act(() => {
        result.current.startPullOut('book-2');
      });

      const variant = result.current.getVariantName('book-1', 'book-2');
      expect(variant).toBe('reversing');
    });
  });

  describe('exported constants', () => {
    it('PULL_OUT_DURATION is 0.25', () => {
      expect(PULL_OUT_DURATION).toBe(0.25);
    });

    it('REVERSE_DURATION is 0.15', () => {
      expect(REVERSE_DURATION).toBe(0.15);
    });

    it('PULL_OUT_EASING is bouncy', () => {
      expect(PULL_OUT_EASING).toEqual([0.34, 1.56, 0.64, 1]);
    });

    it('REVERSE_EASING is ease-out', () => {
      expect(REVERSE_EASING).toEqual([0.25, 0.1, 0.25, 1]);
    });

    it('PULL_OUT_VARIANTS has rest, pulled, reversing keys', () => {
      expect(PULL_OUT_VARIANTS).toHaveProperty('rest');
      expect(PULL_OUT_VARIANTS).toHaveProperty('pulled');
      expect(PULL_OUT_VARIANTS).toHaveProperty('reversing');
    });

    it('PULL_OUT_VARIANTS.pulled has correct scale and y', () => {
      expect(PULL_OUT_VARIANTS.pulled.scale).toBe(1.05);
      expect(PULL_OUT_VARIANTS.pulled.y).toBe(-8);
      expect(PULL_OUT_VARIANTS.pulled.boxShadow).toContain('0 8px 16px');
      expect(PULL_OUT_VARIANTS.pulled.transition.duration).toBe(0.25);
      expect(PULL_OUT_VARIANTS.pulled.transition.ease).toEqual([0.34, 1.56, 0.64, 1]);
    });

    it('PULL_OUT_VARIANTS.rest has correct default values', () => {
      expect(PULL_OUT_VARIANTS.rest.scale).toBe(1);
      expect(PULL_OUT_VARIANTS.rest.y).toBe(0);
      expect(PULL_OUT_VARIANTS.rest.boxShadow).toContain('0 2px 4px');
      expect(PULL_OUT_VARIANTS.rest.transition.duration).toBe(0.15);
    });

    it('PULL_OUT_VARIANTS_REDUCED.pulled has instant scale/y and opacity fade', () => {
      expect(PULL_OUT_VARIANTS_REDUCED.pulled.scale).toBe(1.05);
      expect(PULL_OUT_VARIANTS_REDUCED.pulled.y).toBe(-8);
      expect(PULL_OUT_VARIANTS_REDUCED.pulled.opacity).toBe(1);
      expect(PULL_OUT_VARIANTS_REDUCED.pulled.transition.duration).toBe(0.15);
      expect(PULL_OUT_VARIANTS_REDUCED.pulled.transition.opacity.duration).toBe(0.15);
      expect(PULL_OUT_VARIANTS_REDUCED.pulled.transition.scale.duration).toBe(0);
      expect(PULL_OUT_VARIANTS_REDUCED.pulled.transition.y.duration).toBe(0);
    });
  });

  describe('reduced motion path', () => {
    it('sets animatingBookId instantly in reduced motion mode (no reverse delay)', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      expect(result.current.animatingBookId).toBe('book-1');
      expect(result.current.isReversing).toBe(false);
    });

    it('switches books instantly in reduced motion mode (no reverse delay)', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { result } = renderHook(() => useBookPullOut());

      act(() => {
        result.current.startPullOut('book-1');
      });

      act(() => {
        result.current.startPullOut('book-2');
      });

      expect(result.current.animatingBookId).toBe('book-2');
      expect(result.current.isReversing).toBe(false);
    });
  });
});