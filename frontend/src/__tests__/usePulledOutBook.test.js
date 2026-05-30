import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import usePulledOutBook from '../hooks/usePulledOutBook';

const mockUseReducedMotion = vi.fn();
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

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

    it('clears pulledOutBookId after animation duration (250ms)', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
      });
      expect(result.current.pulledOutBookId).toBe('book-123');

      act(() => {
        result.current.placeBack();
      });

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);
    });

    it('clears isPlacingBack after animation duration (250ms)', () => {
      const { result } = renderHook(() => usePulledOutBook());

      act(() => {
        result.current.pullOut('book-123');
        result.current.placeBack();
      });

      expect(result.current.isPlacingBack).toBe(true);

      act(() => {
        vi.advanceTimersByTime(250);
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

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);
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
        vi.advanceTimersByTime(250);
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
        vi.advanceTimersByTime(250);
      });

      expect(result.current.pulledOutBookId).toBeNull();
      expect(result.current.isPlacingBack).toBe(false);

      vi.useRealTimers();
    });
  });
});