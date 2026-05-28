// Contopia — useFullscreen Hook Tests (STORY-029)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useFullscreen from '../hooks/useFullscreen';

/**
 * jsdom's Document.prototype has a non-configurable fullscreenElement
 * getter that always returns null. We cannot mock it via Object.defineProperty.
 * Instead of mocking the DOM property, we test the hook's behavior:
 * - API calls (requestFullscreen, exitFullscreen, webkit variants)
 * - CSS fallback path (body.classList.add/remove)
 * - Event listener registration/cleanup
 * - Toggle delegating to enter/exit
 * - Error handling and edge cases
 */

describe('useFullscreen', () => {
  let originalRequestFS;
  let originalExitFS;
  let originalWebkitRequestFS;
  let originalWebkitExitFS;
  let originalBodyAdd;
  let originalBodyRemove;

  beforeEach(() => {
    originalRequestFS = document.documentElement.requestFullscreen;
    originalExitFS = document.exitFullscreen;
    originalWebkitRequestFS = document.documentElement.webkitRequestFullscreen;
    originalWebkitExitFS = document.webkitExitFullscreen;
    originalBodyAdd = document.body.classList.add;
    originalBodyRemove = document.body.classList.remove;

    document.documentElement.requestFullscreen = vi.fn();
    document.exitFullscreen = vi.fn();
    document.body.classList.add = vi.fn();
    document.body.classList.remove = vi.fn();
  });

  afterEach(() => {
    document.documentElement.requestFullscreen = originalRequestFS;
    document.exitFullscreen = originalExitFS;
    document.documentElement.webkitRequestFullscreen = originalWebkitRequestFS;
    document.webkitExitFullscreen = originalWebkitExitFS;
    document.body.classList.add = originalBodyAdd;
    document.body.classList.remove = originalBodyRemove;
  });

  // ── Initial state ────────────────────────────────────────────

  describe('initial state', () => {
    it('returns isFullscreen as false', () => {
      const { result } = renderHook(() => useFullscreen());
      expect(result.current.isFullscreen).toBe(false);
    });

    it('returns all functions', () => {
      const { result } = renderHook(() => useFullscreen());
      expect(result.current.enterFullscreen).toBeInstanceOf(Function);
      expect(result.current.exitFullscreen).toBeInstanceOf(Function);
      expect(result.current.toggleFullscreen).toBeInstanceOf(Function);
    });
  });

  // ── enterFullscreen: standard API ────────────────────────────

  describe('enterFullscreen -> standard API', () => {
    it('calls requestFullscreen on documentElement', async () => {
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    });

    it('does not add fallback class when API resolves', async () => {
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(document.body.classList.add).not.toHaveBeenCalled();
    });
  });

  // ── enterFullscreen: webkit prefix ───────────────────────────

  describe('enterFullscreen -> webkit prefix', () => {
    it('calls webkitRequestFullscreen when standard missing', async () => {
      document.documentElement.requestFullscreen = undefined;
      document.documentElement.webkitRequestFullscreen = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(document.documentElement.webkitRequestFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  // ── enterFullscreen: CSS fallback ────────────────────────────

  describe('enterFullscreen -> CSS fallback', () => {
    it('adds fallback class when API rejects', async () => {
      document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(document.body.classList.add).toHaveBeenCalledWith('reader-fullscreen-fallback');
      expect(result.current.isFullscreen).toBe(true);
    });

    it('adds fallback class when both APIs undefined', async () => {
      document.documentElement.requestFullscreen = undefined;
      document.documentElement.webkitRequestFullscreen = undefined;
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(document.body.classList.add).toHaveBeenCalledWith('reader-fullscreen-fallback');
      expect(result.current.isFullscreen).toBe(true);
    });

    it('adds fallback class on TypeError', async () => {
      document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new TypeError('Failed'));
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(document.body.classList.add).toHaveBeenCalledWith('reader-fullscreen-fallback');
      expect(result.current.isFullscreen).toBe(true);
    });

    it('adds fallback class when webkit also rejects', async () => {
      document.documentElement.requestFullscreen = undefined;
      document.documentElement.webkitRequestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(document.body.classList.add).toHaveBeenCalledWith('reader-fullscreen-fallback');
      expect(result.current.isFullscreen).toBe(true);
    });
  });

  // ── exitFullscreen: standard API ─────────────────────────────

  describe('exitFullscreen -> standard API', () => {
    it('calls document.exitFullscreen', async () => {
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.exitFullscreen(); });
      expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    });

    it('does not remove fallback class (not in fallback mode)', async () => {
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.exitFullscreen(); });
      expect(document.body.classList.remove).not.toHaveBeenCalled();
    });
  });

  // ── exitFullscreen: webkit prefix ────────────────────────────

  describe('exitFullscreen -> webkit prefix', () => {
    it('calls webkitExitFullscreen when standard missing', async () => {
      document.exitFullscreen = undefined;
      document.webkitExitFullscreen = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.exitFullscreen(); });
      expect(document.webkitExitFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  // ── exitFullscreen: CSS fallback ─────────────────────────────

  describe('exitFullscreen -> CSS fallback', () => {
    it('removes fallback and sets false when in fallback mode', async () => {
      document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(document.body.classList.add).toHaveBeenCalledWith('reader-fullscreen-fallback');

      await act(async () => { await result.current.exitFullscreen(); });
      expect(document.body.classList.remove).toHaveBeenCalledWith('reader-fullscreen-fallback');
      expect(result.current.isFullscreen).toBe(false);
    });

    it('handles exit API rejection gracefully', async () => {
      document.exitFullscreen = vi.fn().mockRejectedValue(new Error('failed'));
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.exitFullscreen(); });
      expect(result.current.isFullscreen).toBe(false);
    });
  });

  // ── toggleFullscreen ─────────────────────────────────────────

  describe('toggleFullscreen', () => {
    it('calls enterFullscreen when not in fullscreen', async () => {
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.toggleFullscreen(); });
      expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    });

    it('calls exitFullscreen when isFullscreen is true', async () => {
      // We cannot set isFullscreen via event in jsdom (fullscreenElement is locked).
      // Instead, manually invoke enterFullscreen in fallback mode to set state true.
      document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(result.current.isFullscreen).toBe(true);

      const exitSpy = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = exitSpy;
      await act(async () => { await result.current.toggleFullscreen(); });
      // Exit in fallback mode removes class (doesn't call exitFullscreen API)
      expect(document.body.classList.remove).toHaveBeenCalledWith('reader-fullscreen-fallback');
      expect(result.current.isFullscreen).toBe(false);
    });
  });

  // ── fullscreenchange event ───────────────────────────────────

  describe('fullscreenchange event', () => {
    it('subscribes to fullscreenchange on mount', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      renderHook(() => useFullscreen());
      expect(addSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
      addSpy.mockRestore();
    });

    it('subscribes to webkitfullscreenchange on mount', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      renderHook(() => useFullscreen());
      expect(addSpy).toHaveBeenCalledWith('webkitfullscreenchange', expect.any(Function));
      addSpy.mockRestore();
    });

    it('does NOT clear fullscreen when fallbackRef is active (browser fullscreen not involved)', async () => {
      // Enter via fallback — fallbackRef.current = true
      document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
      const { result } = renderHook(() => useFullscreen());
      await act(async () => { await result.current.enterFullscreen(); });
      expect(result.current.isFullscreen).toBe(true);

      // Fire fullscreenchange — handler checks fallbackRef; should stay true
      act(() => { window.dispatchEvent(new Event('fullscreenchange')); });
      expect(result.current.isFullscreen).toBe(true);
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────

  describe('cleanup', () => {
    it('removes fallback class on unmount', () => {
      const { unmount } = renderHook(() => useFullscreen());
      unmount();
      expect(document.body.classList.remove).toHaveBeenCalledWith('reader-fullscreen-fallback');
    });

    it('removes event listeners on unmount', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = renderHook(() => useFullscreen());

      unmount();

      const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
      expect(removedEvents).toContain('fullscreenchange');
      expect(removedEvents).toContain('webkitfullscreenchange');
      removeSpy.mockRestore();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────

  describe('edge cases', () => {
    it('does not throw when requestFullscreen is undefined', async () => {
      document.documentElement.requestFullscreen = undefined;
      document.documentElement.webkitRequestFullscreen = undefined;
      const { result } = renderHook(() => useFullscreen());
      await expect(
        act(async () => { await result.current.enterFullscreen(); })
      ).resolves.not.toThrow();
    });

    it('does not throw when exitFullscreen is undefined', async () => {
      document.exitFullscreen = undefined;
      const { result } = renderHook(() => useFullscreen());
      await expect(
        act(async () => { await result.current.exitFullscreen(); })
      ).resolves.not.toThrow();
    });
  });
});
