// Contopia — useProgressSync Hook Tests (STORY-033)
// Tests: local save, debounce, merge logic, offline flush, finished state
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mock return containers (must be vi.hoisted for vi.mock factory closures) ──
const mockNetwork = vi.hoisted(() => ({ isOnline: true, wasOffline: false, data: null }));
const mockMutateAsync = vi.fn();
const mockReadingData = { data: null };
const mockSetLocalProgress = vi.fn();
const mockSetSyncStatus = vi.fn();

// Mock module references — hoisted by Vitest
vi.mock('../hooks/useUpdateReadingProgress', () => ({
  default: () => ({ mutateAsync: mockMutateAsync }),
}));

vi.mock('../hooks/useReadingProgressQuery', () => ({
  default: () => ({ data: mockReadingData.data }),
}));

vi.mock('../hooks/useNetworkStatus', () => ({
  default: () => ({ isOnline: mockNetwork.isOnline, wasOffline: mockNetwork.wasOffline }),
}));

vi.mock('../stores/reader-store', () => ({
  default: (selector) => {
    const state = {
      setLocalProgress: mockSetLocalProgress,
      setSyncStatus: mockSetSyncStatus,
    };
    return selector(state);
  },
}));

import useProgressSync from '../hooks/useProgressSync';

const BOOK_ID = '507f1f77bcf86cd799439011';
const LOCAL_KEY = `progress:${BOOK_ID}`;

function setLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getLocalStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; }
}

describe('useProgressSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    mockMutateAsync.mockReset().mockResolvedValue({ updatedAt: new Date().toISOString() });
    mockSetLocalProgress.mockReset();
    mockSetSyncStatus.mockReset();
    mockReadingData.data = null;
    mockNetwork.isOnline = true;
    mockNetwork.wasOffline = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  // ── Initial state ─────────────────────────────────────────────

  describe('initial state', () => {
    it('returns idle syncStatus initially', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(result.current.syncStatus).toBe('idle');
    });

    it('returns null localProgress when no data exists', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(result.current.localProgress).toBeNull();
    });

    it('returns a saveProgress function', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(typeof result.current.saveProgress).toBe('function');
    });
  });

  // ── Local save (NFR-PERF-06: < 100ms) ────────────────────────

  describe('local save', () => {
    it('saves progress to localStorage immediately on saveProgress call', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => {
        result.current.saveProgress({ percentage: 25, lastChapterId: 'ch1', lastPosition: 100 });
      });
      const stored = getLocalStorage(LOCAL_KEY);
      expect(stored).not.toBeNull();
      expect(stored.percentage).toBe(25);
      expect(stored.lastChapterId).toBe('ch1');
      expect(stored.lastPosition).toBe(100);
      expect(stored.timestamp).toBeGreaterThan(0);
    });

    it('updates localProgress state after saving', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => {
        result.current.saveProgress({ percentage: 50 });
      });
      expect(result.current.localProgress).not.toBeNull();
      expect(result.current.localProgress.percentage).toBe(50);
    });

    it('calls setLocalProgress on reader-store with merged data', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => {
        result.current.saveProgress({ percentage: 75 });
      });
      expect(mockSetLocalProgress).toHaveBeenCalled();
    });

    it('handles localStorage quota error gracefully (NFR-AVL-04)', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(() => {
        act(() => { result.current.saveProgress({ percentage: 10 }); });
      }).not.toThrow();
      setItemSpy.mockRestore();
    });
  });

  // ── Debounced server sync (AC1: every 10s) ─────────────────────

  describe('debounced server save', () => {
    it('does NOT call server immediately for normal saves', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => { result.current.saveProgress({ percentage: 30 }); });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('calls server after 10s debounce period', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => { result.current.saveProgress({ percentage: 40, lastChapterId: 'ch1' }); });
      act(() => { vi.advanceTimersByTime(10000); });
      expect(mockMutateAsync).toHaveBeenCalled();
      const serverArg = mockMutateAsync.mock.calls[0][0];
      expect(serverArg.percentage).toBe(40);
    });

    it('resets debounce timer on subsequent saves', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => { result.current.saveProgress({ percentage: 10 }); });
      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { result.current.saveProgress({ percentage: 20 }); });
      act(() => { vi.advanceTimersByTime(5000); });
      expect(mockMutateAsync).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(5000); });
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('immediate flag triggers server save immediately', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => { result.current.saveProgress({ percentage: 60, _immediate: true }); });
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync.mock.calls[0][0]._immediate).toBeUndefined();
    });
  });

  // ── Merge logic (AC2: most recent wins) ────────────────────────

  describe('merge logic — local vs server', () => {
    it('returns server progress when no local progress exists', () => {
      mockReadingData.data = { percentage: 50, updatedAt: '2026-05-15T10:00:00Z' };
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(result.current.localProgress).not.toBeNull();
      expect(result.current.localProgress.percentage).toBe(50);
    });

    it('returns local progress when no server progress exists', () => {
      setLocalStorage(LOCAL_KEY, { percentage: 80, timestamp: Date.now() });
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(result.current.localProgress).not.toBeNull();
      expect(result.current.localProgress.percentage).toBe(80);
    });

    it('uses local when local timestamp is newer than server', () => {
      setLocalStorage(LOCAL_KEY, { percentage: 90, timestamp: Date.now() + 100000 });
      mockReadingData.data = { percentage: 30, updatedAt: '2026-01-01T00:00:00Z' };
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(result.current.localProgress.percentage).toBe(90);
    });

    it('uses server when server updatedAt is newer', () => {
      setLocalStorage(LOCAL_KEY, { percentage: 10, timestamp: 1000000 });
      mockReadingData.data = { percentage: 70, updatedAt: '2026-06-01T00:00:00Z' };
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(result.current.localProgress.percentage).toBe(70);
    });

    it('returns null when both local and server are null', () => {
      mockReadingData.data = null;
      localStorage.removeItem(LOCAL_KEY);
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(result.current.localProgress).toBeNull();
    });

    it('handles local timestamp of 0 gracefully', () => {
      setLocalStorage(LOCAL_KEY, { percentage: 50, timestamp: 0 });
      mockReadingData.data = { percentage: 60, updatedAt: '2026-05-01T00:00:00Z' };
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      expect(result.current.localProgress.percentage).toBe(60);
    });
  });

  // ── Offline support (AC5) ──────────────────────────────────────

  describe('offline support', () => {
    it('saves locally when offline but does not call server', () => {
      mockNetwork.isOnline = false;
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => { result.current.saveProgress({ percentage: 45 }); });
      const stored = getLocalStorage(LOCAL_KEY);
      expect(stored.percentage).toBe(45);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('sets syncStatus to error when offline (pending sync)', () => {
      mockNetwork.isOnline = false;
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => { result.current.saveProgress({ percentage: 55 }); });
      expect(mockSetSyncStatus).toHaveBeenCalledWith('error');
    });
  });

  // ── Cleanup ────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('does not throw on unmount', () => {
      const { unmount } = renderHook(() => useProgressSync(BOOK_ID));
      expect(() => unmount()).not.toThrow();
    });

    it('calls mutateAsync when immediate save is triggered', () => {
      const { result } = renderHook(() => useProgressSync(BOOK_ID));
      act(() => { result.current.saveProgress({ percentage: 50, _immediate: true }); });
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });
  });
});
