import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('animation/visibility', () => {
  let useVisibilityGuard;
  let useIsBackgrounded;

  beforeEach(async () => {
    vi.useFakeTimers();
      useVisibilityGuard = (await import('../visibility.js')).useVisibilityGuard;
      useIsBackgrounded = (await import('../visibility.js')).useIsBackgrounded;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useVisibilityGuard', () => {
    it('calls onPause when document becomes hidden', () => {
      const onPause = vi.fn();
      const onResume = vi.fn();

      renderHook(() => useVisibilityGuard(onPause, onResume));

      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(100);
      });

      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('calls onResume when document becomes visible', () => {
      const onPause = vi.fn();
      const onResume = vi.fn();

      // Start hidden
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });

      renderHook(() => useVisibilityGuard(onPause, onResume));

      // Then become visible
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(100);
      });

      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('debounces rapid visibility changes (100ms)', () => {
      const onPause = vi.fn();
      const onResume = vi.fn();

      renderHook(() => useVisibilityGuard(onPause, onResume));

      // First change to hidden
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Rapidly change back before debounce
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(100);
      });

      // Only the last state should be reported
      expect(onPause).not.toHaveBeenCalled();
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('cleans up event listener on unmount', () => {
      const onPause = vi.fn();
      const onResume = vi.fn();

      const { unmount } = renderHook(() => useVisibilityGuard(onPause, onResume));
      unmount();

      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(100);
      });

      expect(onPause).not.toHaveBeenCalled();
    });
  });

  describe('useIsBackgrounded', () => {
    it('returns false when document is visible', () => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      const { result } = renderHook(() => useIsBackgrounded());
      expect(result.current).toBe(false);
    });

    it('returns true when document is hidden', () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      const { result } = renderHook(() => useIsBackgrounded());
      expect(result.current).toBe(true);
    });

    it('updates state when visibility changes', () => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      const { result } = renderHook(() => useIsBackgrounded());
      expect(result.current).toBe(false);

      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);
    });
  });
});