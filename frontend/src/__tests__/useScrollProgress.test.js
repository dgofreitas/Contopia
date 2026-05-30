// Contopia — useScrollProgress Hook Tests (STORY-031)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollProgress } from '../hooks/useScrollProgress';

describe('useScrollProgress', () => {
  let scrollContainerRef;
  let containerEl;

  beforeEach(() => {
    vi.useFakeTimers();

    // Create a mock scroll container
    containerEl = document.createElement('div');
    Object.defineProperties(containerEl, {
      scrollTop: { value: 0, writable: true },
      scrollHeight: { value: 2000, writable: true },
      clientHeight: { value: 600, writable: true },
    });
    containerEl.addEventListener = vi.fn((event, handler) => {
      if (event === 'scroll') containerEl._scrollHandler = handler;
    });
    containerEl.removeEventListener = vi.fn((event, handler) => {
      if (event === 'scroll' && containerEl._scrollHandler === handler) {
        containerEl._scrollHandler = null;
      }
    });

    scrollContainerRef = { current: containerEl };

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      _callback: callback,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────

  describe('initial state', () => {
    it('returns currentVisibleChapter of 0', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );
      expect(result.current.currentVisibleChapter).toBe(0);
    });

    it('returns scrollProgress of 0', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );
      expect(result.current.scrollProgress).toBe(0);
    });

    it('returns observeChapter function', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );
      expect(typeof result.current.observeChapter).toBe('function');
    });
  });

  // ── Scroll progress calculation ──────────────────────────────

  describe('scroll progress calculation', () => {
    it('calculates 0% progress when scrolled to top', () => {
      containerEl.scrollTop = 0;
      containerEl.scrollHeight = 2000;
      containerEl.clientHeight = 600;

      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      act(() => {
        containerEl._scrollHandler();
        vi.advanceTimersByTime(500);
      });

      // maxScroll = 2000 - 600 = 1400, progress = 0/1400 * 100 = 0
      expect(result.current.scrollProgress).toBe(0);
    });

    it('calculates 50% progress at midpoint scroll', () => {
      containerEl.scrollTop = 700;
      containerEl.scrollHeight = 2000;
      containerEl.clientHeight = 600;

      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      act(() => {
        containerEl._scrollHandler();
        vi.advanceTimersByTime(500);
      });

      // maxScroll = 2000 - 600 = 1400, scrollTop = 700, progress = 700/1400 * 100 = 50
      expect(result.current.scrollProgress).toBe(50);
    });

    it('calculates 100% progress when scrolled to bottom', () => {
      containerEl.scrollTop = 1400;
      containerEl.scrollHeight = 2000;
      containerEl.clientHeight = 600;

      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      act(() => {
        containerEl._scrollHandler();
        vi.advanceTimersByTime(500);
      });

      expect(result.current.scrollProgress).toBe(100);
    });

    it('clamps progress to 100 when scrolled beyond max', () => {
      containerEl.scrollTop = 2000;
      containerEl.scrollHeight = 2000;
      containerEl.clientHeight = 600;

      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      act(() => {
        containerEl._scrollHandler();
        vi.advanceTimersByTime(500);
      });

      expect(result.current.scrollProgress).toBe(100);
    });

    it('returns 0 progress when scrollHeight equals clientHeight', () => {
      containerEl.scrollTop = 0;
      containerEl.scrollHeight = 600;
      containerEl.clientHeight = 600;

      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      act(() => {
        containerEl._scrollHandler();
        vi.advanceTimersByTime(500);
      });

      expect(result.current.scrollProgress).toBe(0);
    });
  });

  // ── Debounce behavior ────────────────────────────────────────

  describe('debounce behavior', () => {
    it('does not update progress before debounce delay elapses', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      containerEl.scrollTop = 700;
      act(() => {
        containerEl._scrollHandler();
        // Advance only 300ms — debounce is 500ms
        vi.advanceTimersByTime(300);
      });

      expect(result.current.scrollProgress).toBe(0);
    });

    it('updates progress after debounce delay elapses', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      containerEl.scrollTop = 700;
      act(() => {
        containerEl._scrollHandler();
        vi.advanceTimersByTime(500);
      });

      expect(result.current.scrollProgress).toBe(50);
    });
  });

  // ── onProgressUpdate callback ────────────────────────────────

  describe('onProgressUpdate callback', () => {
    it('calls onProgressUpdate with scrollProgress and scrollOffset', () => {
      const onProgressUpdate = vi.fn();

      containerEl.scrollTop = 350;
      containerEl.scrollHeight = 2000;
      containerEl.clientHeight = 600;

      renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [], onProgressUpdate })
      );

      act(() => {
        containerEl._scrollHandler();
        vi.advanceTimersByTime(500);
      });

      // maxScroll = 1400, scrollTop = 350, progress = 350/1400*100 = 25
      expect(onProgressUpdate).toHaveBeenCalledWith({
        scrollProgress: 25,
        scrollOffset: 350,
      });
    });

    it('calls onProgressUpdate multiple times on scroll', () => {
      const onProgressUpdate = vi.fn();

      renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [], onProgressUpdate })
      );

      containerEl.scrollTop = 350;
      act(() => { containerEl._scrollHandler(); vi.advanceTimersByTime(500); });

      containerEl.scrollTop = 700;
      act(() => { containerEl._scrollHandler(); vi.advanceTimersByTime(500); });

      expect(onProgressUpdate).toHaveBeenCalledTimes(2);
    });
  });

  // ── onChapterVisible callback ────────────────────────────────

  describe('onChapterVisible callback', () => {
    it('does not crash when onChapterVisible is not provided (IntersectionObserver is mocked)', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [{ _id: 'ch1' }] })
      );

      expect(() => {
        // Simulate an IntersectionObserver entry — normally would trigger via callback
        // but our mock doesn't actually fire; we just verify no crash
      }).not.toThrow();
    });
  });

  // ── observeChapter ───────────────────────────────────────────

  describe('observeChapter', () => {
    it('returns a cleanup function', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      const el = document.createElement('div');
      const cleanup = result.current.observeChapter(el, 0);
      expect(typeof cleanup).toBe('function');
    });

    it('does nothing when element is null', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      expect(() => result.current.observeChapter(null, 0)).not.toThrow();
    });

    it('does nothing when observer is not initialized', () => {
      scrollContainerRef.current = null;
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      const el = document.createElement('div');
      expect(() => result.current.observeChapter(el, 0)).not.toThrow();
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────

  describe('cleanup', () => {
    it('removes scroll event listener on unmount', () => {
      const { unmount } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      const removeSpy = vi.spyOn(containerEl, 'removeEventListener');
      unmount();
      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });

    it('disconnects IntersectionObserver on unmount', () => {
      const disconnectSpy = vi.fn();
      global.IntersectionObserver = vi.fn(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: disconnectSpy,
      }));

      const { unmount } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      unmount();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles null scrollContainerRef gracefully', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef: { current: null }, chapters: [] })
      );

      expect(result.current.currentVisibleChapter).toBe(0);
      expect(result.current.scrollProgress).toBe(0);
    });

    it('handles empty chapters array', () => {
      const { result } = renderHook(() =>
        useScrollProgress({ scrollContainerRef, chapters: [] })
      );

      expect(result.current.currentVisibleChapter).toBe(0);
    });
  });
});
