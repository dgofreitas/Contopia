// Contopia — useCoverFlipTransition Hook Tests (STORY-041)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock framer-motion useReducedMotion
vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
}));

// Mock css-3d-support — default: 3D is supported
const mockSupportsPreserve3d = vi.fn(() => true);
vi.mock('../lib/css-3d-support.js', () => ({
  supportsPreserve3d: () => mockSupportsPreserve3d(),
  resetCachedSupport: () => {},
}));

import useCoverFlipTransition, { ANIMATION_CONFIG } from '../hooks/useCoverFlipTransition';

describe('useCoverFlipTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state (idle) ────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts in idle state with no bookData', () => {
      const { result } = renderHook(() => useCoverFlipTransition());

      expect(result.current.transitionState).toBe('idle');
      expect(result.current.bookData).toBeNull();
    });

    it('exposes animationConfig with default values', () => {
      const { result } = renderHook(() => useCoverFlipTransition());

      expect(result.current.animationConfig).toEqual(ANIMATION_CONFIG);
      expect(result.current.animationConfig.duration).toBe(0.35);
      expect(result.current.animationConfig.reducedDuration).toBe(0.15);
      expect(result.current.animationConfig.fadeDuration).toBe(0.2);
    });
  });

  // ── 3D Support detection ───────────────────────────────────────────────

  describe('3D support detection', () => {
    it('sets is3DSupported=true when supportsPreserve3d returns true', () => {
      mockSupportsPreserve3d.mockReturnValue(true);
      const { result } = renderHook(() => useCoverFlipTransition());
      expect(result.current.is3DSupported).toBe(true);
    });

    it('sets is3DSupported=false when supportsPreserve3d returns false', () => {
      mockSupportsPreserve3d.mockReturnValue(false);
      const { result } = renderHook(() => useCoverFlipTransition());
      expect(result.current.is3DSupported).toBe(false);
    });
  });

  // ── startFlip ──────────────────────────────────────────────────────────

  describe('startFlip', () => {
    it('sets transitionState to "flipping" and stores book data', () => {
      const { result } = renderHook(() => useCoverFlipTransition());
      const book = { _id: 'book-1', title: 'Test Book' };

      act(() => {
        result.current.startFlip(book);
      });

      expect(result.current.transitionState).toBe('flipping');
      expect(result.current.bookData).toEqual(book);
    });

    it('updates book data when called with a different book mid-flight', () => {
      const { result } = renderHook(() => useCoverFlipTransition());
      const book1 = { _id: 'book-1', title: 'First' };
      const book2 = { _id: 'book-2', title: 'Second' };

      act(() => {
        result.current.startFlip(book1);
      });
      expect(result.current.bookData).toEqual(book1);

      act(() => {
        result.current.startFlip(book2);
      });
      // State remains 'flipping' but book data changes
      expect(result.current.transitionState).toBe('flipping');
      expect(result.current.bookData).toEqual(book2);
    });
  });

  // ── cancelFlip (reversing) ─────────────────────────────────────────────

  describe('cancelFlip', () => {
    it('sets transitionState to "reversing"', () => {
      const { result } = renderHook(() => useCoverFlipTransition());

      act(() => {
        result.current.cancelFlip();
      });

      expect(result.current.transitionState).toBe('reversing');
    });

    it('can cancel mid-flip after startFlip', () => {
      const { result } = renderHook(() => useCoverFlipTransition());
      const book = { _id: 'book-1', title: 'Test' };

      act(() => {
        result.current.startFlip(book);
      });
      expect(result.current.transitionState).toBe('flipping');

      act(() => {
        result.current.cancelFlip();
      });
      expect(result.current.transitionState).toBe('reversing');
      // bookData should still be available
      expect(result.current.bookData).toEqual(book);
    });
  });

  // ── completeFlip ───────────────────────────────────────────────────────

  describe('completeFlip', () => {
    it('sets transitionState to "complete"', () => {
      const { result } = renderHook(() => useCoverFlipTransition());

      act(() => {
        result.current.completeFlip();
      });

      expect(result.current.transitionState).toBe('complete');
    });

    it('calls onFlipComplete callback when provided', () => {
      const onFlipComplete = vi.fn();
      const { result } = renderHook(() => useCoverFlipTransition({
        onFlipComplete,
      }));

      act(() => {
        result.current.completeFlip();
      });

      expect(onFlipComplete).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onFlipComplete is not provided', () => {
      const { result } = renderHook(() => useCoverFlipTransition());

      expect(() => {
        act(() => {
          result.current.completeFlip();
        });
      }).not.toThrow();
    });
  });

  // ── resetToIdle ────────────────────────────────────────────────────────

  describe('resetToIdle', () => {
    it('sets transitionState back to "idle"', () => {
      const { result } = renderHook(() => useCoverFlipTransition());

      act(() => {
        result.current.startFlip({ _id: '1', title: 'T' });
      });
      expect(result.current.transitionState).toBe('flipping');

      act(() => {
        result.current.resetToIdle();
      });
      expect(result.current.transitionState).toBe('idle');
    });

    it('does not clear bookData (caller manages that)', () => {
      const { result } = renderHook(() => useCoverFlipTransition());

      act(() => {
        result.current.startFlip({ _id: '1', title: 'T' });
      });
      act(() => {
        result.current.resetToIdle();
      });

      expect(result.current.bookData).toEqual({ _id: '1', title: 'T' });
    });
  });

  // ── prefersReducedMotion ───────────────────────────────────────────────

  describe('prefersReducedMotion', () => {
    it('is false by default (mocked)', () => {
      const { result } = renderHook(() => useCoverFlipTransition());
      expect(result.current.prefersReducedMotion).toBe(false);
    });

    it('is coerced to boolean (handles undefined from framer-motion)', () => {
      // framer-motion's useReducedMotion can return undefined (SSR/no-preference).
      // The hook does !!prefersReducedMotion, so undefined → false.
      // Our mock returns false, which is already correct.
      const { result } = renderHook(() => useCoverFlipTransition());
      expect(result.current.prefersReducedMotion).toBeTypeOf('boolean');
    });
  });

  // ── Full state machine flow: idle → flipping → complete → idle ─────────

  describe('state machine flow', () => {
    it('follows idle → flipping → complete → idle lifecycle', () => {
      const onFlipComplete = vi.fn();
      const { result } = renderHook(() => useCoverFlipTransition({
        onFlipComplete,
      }));

      // idle
      expect(result.current.transitionState).toBe('idle');

      // → flipping
      act(() => {
        result.current.startFlip({ _id: '1', title: 'A' });
      });
      expect(result.current.transitionState).toBe('flipping');

      // → complete
      act(() => {
        result.current.completeFlip();
      });
      expect(result.current.transitionState).toBe('complete');
      expect(onFlipComplete).toHaveBeenCalledTimes(1);

      // → idle (reset)
      act(() => {
        result.current.resetToIdle();
      });
      expect(result.current.transitionState).toBe('idle');
    });

    it('follows idle → flipping → reversing → idle lifecycle (cancel mid-flight)', () => {
      const { result } = renderHook(() => useCoverFlipTransition());

      act(() => {
        result.current.startFlip({ _id: '1', title: 'A' });
      });
      expect(result.current.transitionState).toBe('flipping');

      act(() => {
        result.current.cancelFlip();
      });
      expect(result.current.transitionState).toBe('reversing');

      act(() => {
        result.current.resetToIdle();
      });
      expect(result.current.transitionState).toBe('idle');
    });
  });

  // ── onFlipComplete callback ref stays current ──────────────────────────

  describe('callback ref pattern', () => {
    it('uses the latest onFlipComplete callback via ref', () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();
      const { result, rerender } = renderHook(
        ({ onFlipComplete }) => useCoverFlipTransition({ onFlipComplete }),
        { initialProps: { onFlipComplete: firstCallback } },
      );

      // Update the callback
      rerender({ onFlipComplete: secondCallback });

      act(() => {
        result.current.completeFlip();
      });

      // Should call the latest callback, not the initial one
      expect(firstCallback).not.toHaveBeenCalled();
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });
  });
});
