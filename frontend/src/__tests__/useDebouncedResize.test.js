import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDebouncedResize from '../hooks/useDebouncedResize';

describe('useDebouncedResize', () => {
  beforeEach(() => {
    // Reset window dimensions to default
    if (typeof window !== 'undefined') {
      window.innerWidth = 1024;
      window.innerHeight = 768;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns initial dimensions with default delay', () => {
      const { result } = renderHook(() => useDebouncedResize());
      expect(result.current).toEqual({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });

    it('returns initial dimensions with custom delay', () => {
      const { result } = renderHook(() => useDebouncedResize(300));
      expect(result.current).toEqual({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });
  });

  describe('resize behavior', () => {
    it('debounces resize events with default delay (150ms)', () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useDebouncedResize());

      // Trigger resize
      act(() => {
        window.innerWidth = 500;
        window.innerHeight = 800;
        window.dispatchEvent(new Event('resize'));
      });

      // Dimensions should not update immediately (debounced)
      expect(result.current.width).toBe(1024);

      // Fast-forward past debounce delay
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Dimensions should now be updated
      expect(result.current.width).toBe(500);
      expect(result.current.height).toBe(800);

      vi.useRealTimers();
    });

    it('debounces resize events with custom delay', () => {
      vi.useFakeTimers();

      const customDelay = 300;
      const { result } = renderHook(() => useDebouncedResize(customDelay));

      // Trigger resize
      act(() => {
        window.innerWidth = 375;
        window.innerHeight = 667;
        window.dispatchEvent(new Event('resize'));
      });

      // Fast-forward but not enough
      act(() => {
        vi.advanceTimersByTime(299);
      });

      // Dimensions should not update yet
      expect(result.current.width).toBe(1024);

      // Fast-forward past custom delay
      act(() => {
        vi.advanceTimersByTime(1);
      });

      // Dimensions should now be updated
      expect(result.current.width).toBe(375);
      expect(result.current.height).toBe(667);

      vi.useRealTimers();
    });

    it('clears previous timeout on rapid resize events', () => {
      vi.useFakeTimers();

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const { result } = renderHook(() => useDebouncedResize(100));

      // Trigger multiple rapid resizes
      act(() => {
        window.innerWidth = 900;
        window.dispatchEvent(new Event('resize'));

        window.innerWidth = 800;
        window.dispatchEvent(new Event('resize'));

        window.innerWidth = 700;
        window.dispatchEvent(new Event('resize'));
      });

      // Should have cleared timeout multiple times
      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('updates dimensions after debounce delay', () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useDebouncedResize(150));

      act(() => {
        window.innerWidth = 1200;
        window.innerHeight = 900;
        window.dispatchEvent(new Event('resize'));
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.width).toBe(1200);
      expect(result.current.height).toBe(900);

      vi.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('removes event listener and clears timeout on unmount', () => {
      vi.useFakeTimers();

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useDebouncedResize(150));

      // Trigger resize to create timeout
      act(() => {
        window.innerWidth = 800;
        window.dispatchEvent(new Event('resize'));
      });

      unmount();

      // Should have removed resize listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );

      vi.useRealTimers();
    });

    it('cleans up timeout on unmount', () => {
      vi.useFakeTimers();

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const { unmount } = renderHook(() => useDebouncedResize(150));

      // Trigger resize
      act(() => {
        window.innerWidth = 800;
        window.dispatchEvent(new Event('resize'));
      });

      unmount();

      // Should have cleared timeout
      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('responsive breakpoints', () => {
    it('detects mobile viewport (375px)', () => {
      window.innerWidth = 375;
      window.innerHeight = 667;

      const { result } = renderHook(() => useDebouncedResize());

      expect(result.current.width).toBe(375);
      expect(result.current.height).toBe(667);
    });

    it('detects tablet viewport (768px)', () => {
      window.innerWidth = 768;
      window.innerHeight = 1024;

      const { result } = renderHook(() => useDebouncedResize());

      expect(result.current.width).toBe(768);
      expect(result.current.height).toBe(1024);
    });

    it('detects desktop viewport (1200px)', () => {
      window.innerWidth = 1200;
      window.innerHeight = 800;

      const { result } = renderHook(() => useDebouncedResize());

      expect(result.current.width).toBe(1200);
      expect(result.current.height).toBe(800);
    });
  });
});
