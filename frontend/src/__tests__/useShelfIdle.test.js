import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockUseReducedMotion = vi.fn();
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import useShelfIdle from '../hooks/useShelfIdle';

describe('useShelfIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts not idle, becomes idle after 3s inactivity', () => {
    const { result } = renderHook(() => useShelfIdle());
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.isIdle).toBe(true);
  });

  it('resets to not idle on interaction', () => {
    const { result } = renderHook(() => useShelfIdle());

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.isIdle).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });

    expect(result.current.isIdle).toBe(false);
  });

  it('prefersReducedMotion active → isIdle is always false', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useShelfIdle());

    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isIdle).toBe(false);
  });

  it('prefersReducedMotion active → shelfActive is always true', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useShelfIdle());

    expect(result.current.shelfActive).toBe(true);
  });

  it('document.hidden → isIdle becomes false', () => {
    const { result } = renderHook(() => useShelfIdle());

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.isIdle).toBe(true);

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isIdle).toBe(false);
  });

  it('tab becomes visible again → idle timer restarts', () => {
    const { result } = renderHook(() => useShelfIdle());

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.isIdle).toBe(true);

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.isIdle).toBe(false);

    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.isIdle).toBe(true);
  });

  it('multiple interactions reset the idle timer', () => {
    const { result } = renderHook(() => useShelfIdle());

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isIdle).toBe(true);
  });

  it('shelfActive is true during interaction, false after fade-out', () => {
    const { result } = renderHook(() => useShelfIdle());

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });

    expect(result.current.shelfActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.shelfActive).toBe(false);
  });

  it('cleans up timers on unmount', () => {
    const { result, unmount } = renderHook(() => useShelfIdle());
    unmount();
    expect(result.current.isIdle).toBe(false);
  });
});