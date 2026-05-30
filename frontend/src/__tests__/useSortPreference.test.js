// Contopia — useSortPreference Hook Tests (STORY-035)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSortPreference from '../hooks/useSortPreference';
import useBookStore from '../stores/book-store';

// Mock react-i18next is already global in setup.js

describe('useSortPreference', () => {
  beforeEach(() => {
    // Clear localStorage between tests to avoid persist contamination
    localStorage.clear();
    // Reset store to defaults
    useBookStore.getState().clearAll();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns default sortMode as "recently-read"', () => {
    const { result } = renderHook(() => useSortPreference());
    expect(result.current.sortMode).toBe('recently-read');
  });

  it('setSortMode updates sortMode in the store', () => {
    const { result } = renderHook(() => useSortPreference());

    act(() => {
      result.current.setSortMode('alphabetical');
    });

    expect(result.current.sortMode).toBe('alphabetical');
  });

  it('setSortMode can change to "favorites"', () => {
    const { result } = renderHook(() => useSortPreference());

    act(() => {
      result.current.setSortMode('favorites');
    });

    expect(result.current.sortMode).toBe('favorites');
  });

  it('setSortMode can change to "recently-read"', () => {
    const { result } = renderHook(() => useSortPreference());

    act(() => {
      result.current.setSortMode('alphabetical');
    });

    expect(result.current.sortMode).toBe('alphabetical');

    act(() => {
      result.current.setSortMode('recently-read');
    });

    expect(result.current.sortMode).toBe('recently-read');
  });

  it('persists sortMode to localStorage under key "contopia-sort-preference"', () => {
    const { result } = renderHook(() => useSortPreference());

    act(() => {
      result.current.setSortMode('alphabetical');
    });

    const stored = JSON.parse(localStorage.getItem('contopia-sort-preference'));
    expect(stored.state.sortMode).toBe('alphabetical');
  });

  it('reads persisted sortMode from localStorage on initialization', () => {
    // Pre-populate localStorage
    localStorage.setItem(
      'contopia-sort-preference',
      JSON.stringify({ state: { sortMode: 'alphabetical' }, version: 0 })
    );

    const { result } = renderHook(() => useSortPreference());
    expect(result.current.sortMode).toBe('alphabetical');
  });

  it('does NOT persist other store fields (partialize)', () => {
    const { result } = renderHook(() => useSortPreference());

    act(() => {
      result.current.setSortMode('favorites');
      useBookStore.getState().setBooks([{ _id: '1', title: 'Should Not Persist' }]);
    });

    const stored = JSON.parse(localStorage.getItem('contopia-sort-preference'));
    expect(stored.state.sortMode).toBe('favorites');
    expect(stored.state.books).toBeUndefined();
  });

  it('two calls to useSortPreference return the same values (single store)', () => {
    const { result: hook1 } = renderHook(() => useSortPreference());
    const { result: hook2 } = renderHook(() => useSortPreference());

    expect(hook1.current.sortMode).toBe(hook2.current.sortMode);

    act(() => {
      hook1.current.setSortMode('alphabetical');
    });

    expect(hook1.current.sortMode).toBe('alphabetical');
    expect(hook2.current.sortMode).toBe('alphabetical');
  });

  it('setSortMode is a stable reference (memo-safe)', () => {
    const { result, rerender } = renderHook(() => useSortPreference());
    const firstSetSortMode = result.current.setSortMode;

    rerender();

    expect(result.current.setSortMode).toBe(firstSetSortMode);
  });

  // Negative: invalid values
  it('allows setting arbitrary strings (no validation in store)', () => {
    const { result } = renderHook(() => useSortPreference());

    act(() => {
      result.current.setSortMode('invalid-mode');
    });

    expect(result.current.sortMode).toBe('invalid-mode');
  });

  it('allows setting empty string', () => {
    const { result } = renderHook(() => useSortPreference());

    act(() => {
      result.current.setSortMode('');
    });

    expect(result.current.sortMode).toBe('');
  });

  it('allows setting null (store does not validate)', () => {
    const { result } = renderHook(() => useSortPreference());

    act(() => {
      result.current.setSortMode(null);
    });

    expect(result.current.sortMode).toBeNull();
  });
});
