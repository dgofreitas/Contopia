// Contopia — useNetworkStatus Hook Unit Tests (STORY-019)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useNetworkStatus from '../hooks/useNetworkStatus';

// navigator.onLine is set to true in setup.js

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // Reset to online
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial isOnline = true when navigator.onLine is true', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('returns initial isOnline = false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('sets isOnline to true and wasOffline to true on online event', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // After going online, wasOffline becomes true
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it('sets isOnline to false on offline event', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('wasOffline resets to false when going offline again', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Go offline
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.wasOffline).toBe(false);

    // Go online
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current.wasOffline).toBe(true);

    // Go offline again
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.wasOffline).toBe(false);
  });

  it('cleans up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());

    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('does not crash when navigator is undefined (SSR)', () => {
    const origNavigator = globalThis.navigator;
    delete globalThis.navigator;

    try {
      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current.isOnline).toBe(true);
    } finally {
      globalThis.navigator = origNavigator;
    }
  });
});
