// Contopia — useSwipeNavigation Hook Tests (STORY-043)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSwipeNavigation from '../hooks/useSwipeNavigation';

// Helper to create a mock element with pointer event methods
function createMockElement() {
  const listeners = {};
  return {
    addEventListener: vi.fn((event, handler) => {
      listeners[event] = handler;
    }),
    removeEventListener: vi.fn((event, handler) => {
      delete listeners[event];
    }),
    listeners,
    // Simulate pointer events
    simulatePointerDown: (clientX, clientY) => {
      if (listeners.pointerdown) listeners.pointerdown({ clientX, clientY, preventDefault: vi.fn() });
    },
    simulatePointerMove: (clientX, clientY) => {
      if (listeners.pointermove) listeners.pointermove({ clientX, clientY, preventDefault: vi.fn() });
    },
    simulatePointerUp: (clientX, clientY) => {
      if (listeners.pointerup) listeners.pointerup({ clientX, clientY, preventDefault: vi.fn() });
    },
  };
}

describe('useSwipeNavigation', () => {
  let mockElement;
  let onSwipeLeft;
  let onSwipeRight;

  beforeEach(() => {
    mockElement = createMockElement();
    onSwipeLeft = vi.fn();
    onSwipeRight = vi.fn();
  });

  // ── Hook setup ───────────────────────────────────────────────

  describe('setup', () => {
    it('attaches pointer event listeners to the ref element', () => {
      const ref = { current: mockElement };
      renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));

      expect(mockElement.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockElement.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockElement.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
    });

    it('removes event listeners on unmount', () => {
      const ref = { current: mockElement };
      const { unmount } = renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));

      unmount();

      expect(mockElement.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
    });

    it('handles null ref gracefully', () => {
      const ref = { current: null };
      expect(() => {
        renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));
      }).not.toThrow();
    });
  });

  // ── Swipe left (next page) ───────────────────────────────────

  describe('swipe left (next page)', () => {
    it('calls onSwipeLeft when swiping left beyond threshold', () => {
      const ref = { current: mockElement };
      renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));

      mockElement.simulatePointerDown(200, 100);
      mockElement.simulatePointerUp(100, 100); // deltaX = -100, beyond threshold

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('does not call onSwipeLeft below threshold', () => {
      const ref = { current: mockElement };
      renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight, minThreshold: 50 }));

      mockElement.simulatePointerDown(200, 100);
      mockElement.simulatePointerUp(170, 100); // deltaX = -30, below 50px threshold

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });
  });

  // ── Swipe right (previous page) ──────────────────────────────

  describe('swipe right (previous page)', () => {
    it('calls onSwipeRight when swiping right beyond threshold', () => {
      const ref = { current: mockElement };
      renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));

      mockElement.simulatePointerDown(100, 100);
      mockElement.simulatePointerUp(200, 100); // deltaX = +100, beyond threshold

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('does not call onSwipeRight below threshold', () => {
      const ref = { current: mockElement };
      renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight, minThreshold: 50 }));

      mockElement.simulatePointerDown(100, 100);
      mockElement.simulatePointerUp(130, 100); // deltaX = +30, below 50px threshold

      expect(onSwipeRight).not.toHaveBeenCalled();
    });
  });

  // ── Vertical swipe suppression ───────────────────────────────

  describe('vertical swipe suppression', () => {
    it('does not fire swipe for vertical movements (deltaY > deltaX * 1.5)', () => {
      const ref = { current: mockElement };
      renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));

      mockElement.simulatePointerDown(100, 100);
      mockElement.simulatePointerMove(110, 200); // deltaX=10, deltaY=100 → vertical
      mockElement.simulatePointerUp(110, 200);

      expect(onSwipeLeft).not.toHaveBeenCalled();
      expect(onSwipeRight).not.toHaveBeenCalled();
    });
  });

  // ── Tap vs Swipe distinction ─────────────────────────────────

  describe('tap vs swipe', () => {
    it('does not fire swipe for taps (<10px movement)', () => {
      const ref = { current: mockElement };
      renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));

      mockElement.simulatePointerDown(100, 100);
      mockElement.simulatePointerUp(103, 100); // deltaX = 3px (< 10px tap zone)

      expect(onSwipeLeft).not.toHaveBeenCalled();
      expect(onSwipeRight).not.toHaveBeenCalled();
    });
  });

  // ── Custom threshold ─────────────────────────────────────────

  describe('custom minThreshold', () => {
    it('respects custom minThreshold of 100px', () => {
      const ref = { current: mockElement };
      renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight, minThreshold: 100 }));

      mockElement.simulatePointerDown(200, 100);
      mockElement.simulatePointerUp(120, 100); // deltaX = -80, below 100px threshold

      expect(onSwipeLeft).not.toHaveBeenCalled();

      // Now beyond threshold
      mockElement.simulatePointerDown(200, 100);
      mockElement.simulatePointerUp(50, 100); // deltaX = -150, beyond 100px threshold

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });
  });

  // ── Return values ────────────────────────────────────────────

  describe('return values', () => {
    it('returns isSwiping state', () => {
      const ref = { current: mockElement };
      const { result } = renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));

      expect(result.current.isSwiping).toBe(false);
    });

    it('returns deltaX state', () => {
      const ref = { current: mockElement };
      const { result } = renderHook(() => useSwipeNavigation({ ref, onSwipeLeft, onSwipeRight }));

      expect(result.current.deltaX).toBe(0);
    });
  });
});