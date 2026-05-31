import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import usePulledOutBook from '../hooks/usePulledOutBook';

const mockUseReducedMotion = vi.fn();
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// The fallback timeout is PULL_OUT_DURATION_MS + 100 = 250 + 100 = 350ms
const PLACE_BACK_FALLBACK_MS = 350;

describe('usePulledOutBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pullOut', () => {
    it('sets pulledOutBookId when pullOut is called', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });

      expect(result.current.pulledOutBookId).toBe('book-123');
    });

    it('replaces previous pulledOutBookId when pullOut is called with different id', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-1');
      });
      expect(result.current.pulledOutBookId).toBe('book-1');

      act(() => {
        result.current.pullOut('book-2');
      });
      expect(result.current.pulledOutBookId).toBe('book-2');
    });
  });

  describe('dismiss', () => {
    it('clears pulledOutBookId when dismiss is called', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });
      expect(result.current.pulledOutBookId).toBe('book-123');

      act(() => {
        result.current.dismiss();
      });
      expect(result.current.pulledOutBookId).toBeNull();
    });

    it('is safe to call dismiss when no book is pulled out', () => {
      const { result } = renderHook(() => usePulledOutBook());

      expect(() => {
        act(() => {
          result.current.dismiss();
        });
      }).not.toThrow();

      expect(result.current.pulledOutBookId).toBeNull();
    });
  });

  describe('toggle', () => {
    it('sets pulledOutBookId when toggling a non-pulled-out book', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.toggle('book-123');
      });

      expect(result.current.pulledOutBookId).toBe('book-123');
    });

    it('clears pulledOutBookId when toggling the already-pulled-out book', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.toggle('book-123');
      });
      expect(result.current.pulledOutBookId).toBe('book-123');

      act(() => {
        result.current.toggle('book-123');
      });
      expect(result.current.pulledOutBookId).toBeNull();
    });

    it('switches to new book id when toggling a different book', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.toggle('book-1');
      });
      expect(result.current.pulledOutBookId).toBe('book-1');

      act(() => {
        result.current.toggle('book-2');
      });
      expect(result.current.pulledOutBookId).toBe('book-2');
    });
  });

  describe('isPulledOut', () => {
    it('returns true for the pulled-out book id', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });

      expect(result.current.isPulledOut('book-123')).toBe(true);
    });

    it('returns false for a different book id', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });

      expect(result.current.isPulledOut('book-456')).toBe(false);
    });

    it('returns false when no book is pulled out', () => {
      const { result } = renderHook(() => usePulledOutBook());

      expect(result.current.isPulledOut('book-123')).toBe(false);
    });

    it('updates correctly after pulling out a different book', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-1');
      });
      expect(result.current.isPulledOut('book-1')).toBe(true);
      expect(result.current.isPulledOut('book-2')).toBe(false);

      act(() => {
        result.current.pullOut('book-2');
      });
      expect(result.current.isPulledOut('book-1')).toBe(false);
      expect(result.current.isPulledOut('book-2')).toBe(true);
    });
  });

  describe('duration (reduced motion)', () => {
    it('returns 0.25 when prefers-reduced-motion is false', async () => {
      mockUseReducedMotion.mockReturnValue(false);

      const { result } = renderHook(() => usePulledOutBook());

      expect(result.current.duration).toBe(0.25);
    });

    it('returns micro duration when prefers-reduced-motion is true', async () => {
      mockUseReducedMotion.mockReturnValue(true);

      const { result } = renderHook(() => usePulledOutBook());

      expect(result.current.duration).toBe(0.15);
    });
  });

  describe('onPullOutComplete callback', () => {
    it('calls onPullOutComplete when toggling to a new book', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => usePulledOutBook({ onPullOutComplete: onComplete }));

      act(() => {
        result.current.toggle('book-123');
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does not call onPullOutComplete when toggling same book off', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => usePulledOutBook({ onPullOutComplete: onComplete }));

      act(() => {
        result.current.toggle('book-123');
      });
      expect(onComplete).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.toggle('book-123');
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onPullOutComplete when switching to a different book', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => usePulledOutBook({ onPullOutComplete: onComplete }));

      act(() => {
        result.current.toggle('book-1');
      });
      expect(onComplete).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.toggle('book-2');
      });
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('placeBack', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockUseReducedMotion.mockReturnValue(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      mockUseReducedMotion.mockReset();
    });

    it('sets isPlacingBack to true when placeBack is called', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });

      expect(result.current.isPlacingBack).toBe(false);

      act(() => {
        result.current.placeBack();
      });

      expect(result.current.isPlacingBack).toBe(true);
    });

    it('sets animationPhase to placeBack when placeBack is called', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });
      expect(result.current.animationPhase).toBe('idle');

      act(() => {
        result.current.placeBack();
      });

      expect(result.current.animationPhase).toBe('placeBack');
    });

    it('clears pulledOutBookId after fallback timeout (350ms)', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });
      expect(result.current.pulledOutBookId).toBe('book-123');

      act(() => {
        result.current.placeBack();
      });

      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);
    });

    it('clears isPlacingBack after fallback timeout (350ms)', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      expect(result.current.isPlacingBack).toBe(true);

      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      expect(result.current.isPlacingBack).toBe(false);
    });

    it('uses micro duration when reduced motion is enabled', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      expect(result.current.isPlacingBack).toBe(true);

      // Even with reduced motion, the timeout fallback still fires at 350ms
      // because the timeout duration is not affected by prefersReducedMotion
      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);
    });

    // === STORY-042: NEW TESTS ===

    it('resets animationPhase to idle after fallback timeout', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      expect(result.current.animationPhase).toBe('placeBack');

      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      expect(result.current.animationPhase).toBe('idle');
    });

    it('duration is 0.25 (not 0.3)', () => {
      mockUseReducedMotion.mockReturnValue(false);
      const { result } = renderHook(() => usePulledOutBook());
      expect(result.current.duration).toBe(0.25);
    });
  });

  describe('toggle clears placeBack timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockUseReducedMotion.mockReturnValue(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      mockUseReducedMotion.mockReset();
    });

    it('clears timeout when toggle is called during place-back animation', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      expect(result.current.isPlacingBack).toBe(true);

      act(() => {
        result.current.toggle('book-456');
      });

      expect(result.current.isPlacingBack).toBe(false);
      expect(result.current.pulledOutBookId).toBe('book-456');

      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      expect(result.current.pulledOutBookId).toBe('book-456');
      expect(result.current.isPlacingBack).toBe(false);
    });

    it('clears isPlacingBack when toggle is called', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      expect(result.current.isPlacingBack).toBe(true);

      act(() => {
        result.current.toggle('book-123');
      });

      expect(result.current.isPlacingBack).toBe(false);
    });

    it('handles rapid place-back then toggle without state corruption', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-1');
        result.current.placeBack();
        result.current.toggle('book-2');
      });

      expect(result.current.pulledOutBookId).toBe('book-2');
      expect(result.current.isPlacingBack).toBe(false);
    });
  });

  describe('rapid toggling (race condition safety)', () => {
    it('handles rapid toggle calls without state corruption', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.toggle('book-1');
        result.current.toggle('book-2');
        result.current.toggle('book-1');
        result.current.toggle('book-3');
      });

      expect(result.current.pulledOutBookId).toBe('book-3');
      expect(result.current.isPulledOut('book-3')).toBe(true);
      expect(result.current.isPulledOut('book-1')).toBe(false);
      expect(result.current.isPulledOut('book-2')).toBe(false);
    });

    it('handles rapid pullOut calls without state corruption', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-1');
        result.current.pullOut('book-2');
        result.current.pullOut('book-3');
      });

      expect(result.current.pulledOutBookId).toBe('book-3');
    });

    it('handles mixed rapid operations', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.toggle('book-1');
        result.current.dismiss();
        result.current.pullOut('book-2');
        result.current.toggle('book-2');
        result.current.pullOut('book-3');
      });

      expect(result.current.pulledOutBookId).toBe('book-3');
    });

    it('handles rapid place-back cycles without animation stacking', () => {
      mockUseReducedMotion.mockReturnValue(false);
      vi.useFakeTimers();

      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-1');
        result.current.placeBack();
        result.current.placeBack();
        result.current.placeBack();
      });

      expect(result.current.isPlacingBack).toBe(true);

      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);

      vi.useRealTimers();
    });
  });

  // ============================================================
  // STORY-042: New test sections
  // ============================================================

  describe('cancelPlaceBack (STORY-042)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockUseReducedMotion.mockReturnValue(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      mockUseReducedMotion.mockReset();
    });

    it('clears isPlacingBack and sets animationPhase to idle', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      expect(result.current.isPlacingBack).toBe(true);
      expect(result.current.animationPhase).toBe('placeBack');

      act(() => {
        result.current.cancelPlaceBack();
      });

      expect(result.current.isPlacingBack).toBe(false);
      expect(result.current.animationPhase).toBe('idle');
    });

    it('keeps pulledOutBookId set after cancel (book returns to pulled-out)', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      act(() => {
        result.current.cancelPlaceBack();
      });

      expect(result.current.pulledOutBookId).toBe('book-123');
    });

    it('clears the fallback timeout so state does not change after cancel', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      act(() => {
        result.current.cancelPlaceBack();
      });

      // Advance past the fallback — state should NOT have changed
      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      expect(result.current.pulledOutBookId).toBe('book-123');
      expect(result.current.isPlacingBack).toBe(false);
      expect(result.current.animationPhase).toBe('idle');
    });

    it('is safe to call cancelPlaceBack when not placing back', () => {
      const { result } = renderHook(() => usePulledOutBook());

      expect(() => {
        act(() => {
          result.current.cancelPlaceBack();
        });
      }).not.toThrow();

      expect(result.current.animationPhase).toBe('idle');
    });
  });

  describe('onPlaceBackComplete callback (STORY-042)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockUseReducedMotion.mockReturnValue(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      mockUseReducedMotion.mockReset();
    });

    it('clears pulledOutBookId, isPlacingBack, sets animationPhase to idle', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      act(() => {
        result.current.onPlaceBackComplete();
      });

      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);
      expect(result.current.animationPhase).toBe('idle');
    });

    it('clears the fallback timeout so it does not double-fire', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      // Call onPlaceBackComplete before timeout fires
      act(() => {
        result.current.onPlaceBackComplete();
      });

      // Advance past fallback — should still be null (no double-fire)
      act(() => {
        vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
      });

      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);
    });
  });

  describe('re-tap during place-back (STORY-042)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockUseReducedMotion.mockReturnValue(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      mockUseReducedMotion.mockReset();
    });

    it('toggle of same book during place-back cancels place-back and returns to pulled-out', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      expect(result.current.animationPhase).toBe('placeBack');
      expect(result.current.isPlacingBack).toBe(true);

      // Re-tap same book during place-back
      act(() => {
        result.current.toggle('book-123');
      });

      // Should cancel place-back, keep pulledOutBookId
      expect(result.current.isPlacingBack).toBe(false);
      expect(result.current.animationPhase).toBe('idle');
      expect(result.current.pulledOutBookId).toBe('book-123');
    });

    it('toggle of different book during place-back switches to new book', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      act(() => {
        result.current.toggle('book-456');
      });

      expect(result.current.pulledOutBookId).toBe('book-456');
      expect(result.current.isPlacingBack).toBe(false);
    });

    it('calling cancelPlaceBack then pullOut restores pull-out state', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });
      expect(result.current.animationPhase).toBe('idle');

      act(() => {
        result.current.placeBack();
      });
      expect(result.current.animationPhase).toBe('placeBack');

      act(() => {
        result.current.cancelPlaceBack();
      });
      expect(result.current.animationPhase).toBe('idle');
      expect(result.current.pulledOutBookId).toBe('book-123');
    });
  });

  describe('timeout fallback (STORY-042)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockUseReducedMotion.mockReturnValue(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      mockUseReducedMotion.mockReset();
    });

    it('fallback timeout fires at 350ms if onPlaceBackComplete never called', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      // At 250ms, state should still be placing back
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current.pulledOutBookId).toBe('book-123');
      expect(result.current.isPlacingBack).toBe(true);

      // At 350ms, fallback fires
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);
    });
  });

  describe('rapid place-back cycles (STORY-042)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockUseReducedMotion.mockReturnValue(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      mockUseReducedMotion.mockReset();
    });

    it('rapid 5x place-back then cancel does not corrupt state', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-1');
      });

      // Rapid cycle: placeBack → cancelPlaceBack × 5
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.placeBack();
          result.current.cancelPlaceBack();
        });
      }

      expect(result.current.pulledOutBookId).toBe('book-1');
      expect(result.current.isPlacingBack).toBe(false);
      expect(result.current.animationPhase).toBe('idle');
    });

    it('rapid 5x full place-back cycles complete cleanly', () => {
      const { result } = renderHook(() => usePulledOutBook());

      for (let cycle = 0; cycle < 5; cycle++) {
        const bookId = `book-${cycle}`;

        act(() => {
          result.current.pullOut(bookId);
        });
        expect(result.current.pulledOutBookId).toBe(bookId);

        act(() => {
          result.current.placeBack();
        });
        expect(result.current.animationPhase).toBe('placeBack');

        act(() => {
          vi.advanceTimersByTime(PLACE_BACK_FALLBACK_MS);
        });

        expect(result.current.pulledOutBookId).toBeNull();
        expect(result.current.isPlacingBack).toBe(false);
        expect(result.current.animationPhase).toBe('idle');
      }
    });
  });

  describe('animationPhase state tracking (STORY-042)', () => {
    it('starts with idle phase', () => {
      const { result } = renderHook(() => usePulledOutBook());
      expect(result.current.animationPhase).toBe('idle');
    });

    it('stays idle after pullOut (pullOut does not change phase)', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });

      expect(result.current.animationPhase).toBe('idle');
    });

    it('changes to placeBack when placeBack is called', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });

      act(() => {
        result.current.placeBack();
      });

      expect(result.current.animationPhase).toBe('placeBack');
    });

    it('returns to idle after onPlaceBackComplete', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });
      expect(result.current.animationPhase).toBe('placeBack');

      act(() => {
        result.current.onPlaceBackComplete();
      });
      expect(result.current.animationPhase).toBe('idle');
    });
  });
});
