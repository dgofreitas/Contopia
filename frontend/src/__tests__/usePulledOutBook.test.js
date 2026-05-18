// Contopia — usePulledOutBook Hook Tests (STORY-011)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import usePulledOutBook from '../hooks/usePulledOutBook';

// Mock framer-motion's useReducedMotion hook
vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(),
}));

describe('usePulledOutBook', () => {
  beforeEach(() => {
    // Reset mock before each test
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
    it('returns 0.3 when prefers-reduced-motion is false', async () => {
      const { useReducedMotion } = await import('framer-motion');
      useReducedMotion.mockReturnValue(false);

      const { result } = renderHook(() => usePulledOutBook());

      expect(result.current.duration).toBe(0.3);
    });

    it('returns 0 when prefers-reduced-motion is true', async () => {
      const { useReducedMotion } = await import('framer-motion');
      useReducedMotion.mockReturnValue(true);

      const { result } = renderHook(() => usePulledOutBook());

      expect(result.current.duration).toBe(0);
    });
  });

  describe('rapid toggling (race condition safety)', () => {
    it('handles rapid toggle calls without state corruption', () => {
      const { result } = renderHook(() => usePulledOutBook());

      // Simulate rapid toggling
      act(() => {
        result.current.toggle('book-1');
        result.current.toggle('book-2');
        result.current.toggle('book-1');
        result.current.toggle('book-3');
      });

      // Final state should be stable (book-3)
      expect(result.current.pulledOutBookId).toBe('book-3');
      expect(result.current.isPulledOut('book-3')).toBe(true);
      expect(result.current.isPulledOut('book-1')).toBe(false);
      expect(result.current.isPulledOut('book-2')).toBe(false);
    });

    it('handles rapid pullOut calls without state corruption', () => {
      const { result } = renderHook(() => usePulledOutBook());

      // Simulate rapid pullOut calls
      act(() => {
        result.current.pullOut('book-1');
        result.current.pullOut('book-2');
        result.current.pullOut('book-3');
      });

      // Final state should be stable (book-3)
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

      // Final state should be stable (book-3)
      expect(result.current.pulledOutBookId).toBe('book-3');
    });
  });
});
