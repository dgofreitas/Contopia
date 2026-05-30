import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisibilityPause } from '../use-visibility-pause.js';

describe('useVisibilityPause', () => {
  let originalHidden;

  beforeEach(() => {
    originalHidden = document.hidden;
  });

  afterEach(() => {
    Object.defineProperty(document, 'hidden', {
      value: originalHidden,
      writable: true,
    });
  });

  it('returns isPaused as false when document is visible', () => {
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useVisibilityPause());
    expect(result.current.isPaused).toBe(false);
  });

  it('returns isPaused as true when document becomes hidden', () => {
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useVisibilityPause());

    act(() => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isPaused).toBe(true);
  });

  it('returns isPaused as false when document becomes visible again', () => {
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true,
    });

    const { result } = renderHook(() => useVisibilityPause());

    act(() => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isPaused).toBe(false);
  });

  it('pause() sets isPaused to true', () => {
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useVisibilityPause());

    act(() => {
      result.current.pause();
    });

    expect(result.current.isPaused).toBe(true);
  });

  it('resume() sets isPaused to false', () => {
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true,
    });

    const { result } = renderHook(() => useVisibilityPause());

    act(() => {
      result.current.resume();
    });

    expect(result.current.isPaused).toBe(false);
  });
});