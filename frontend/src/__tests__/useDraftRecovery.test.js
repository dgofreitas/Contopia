// Contopia — useDraftRecovery Hook Unit Tests (STORY-019)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useDraftRecovery from '../hooks/useDraftRecovery';

const mockGetDraft = vi.fn();
const mockDeleteDraft = vi.fn();

vi.mock('../services/autosave-service', () => ({
  default: {
    getDraft: (...args) => mockGetDraft(...args),
    deleteDraft: (...args) => mockDeleteDraft(...args),
  },
}));

describe('useDraftRecovery', () => {
  const bookId = 'book-1';
  const chapterId = 'chapter-1';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns hasDraft: false when no draft exists', async () => {
    mockGetDraft.mockResolvedValue(null);

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(false);
    });
    expect(result.current.draftContent).toBeNull();
    expect(result.current.shouldRestore).toBe(false);
    expect(result.current.conflictWarning).toBeNull();
  });

  it('returns hasDraft: true when draft exists and content is local-only', async () => {
    mockGetDraft.mockResolvedValue({
      content: '<p>Draft content</p>',
      timestamp: Date.now(),
      isLocalOnly: true,
    });

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(true);
    });
    expect(result.current.draftContent).toBe('<p>Draft content</p>');
    expect(result.current.shouldRestore).toBe(true);
  });

  it('shows conflict warning when draft timestamp diverges >5 min from server', async () => {
    const serverTs = new Date('2025-06-15T14:00:00Z').getTime();
    const draftTs = serverTs + 6 * 60 * 1000; // 6 minutes later

    mockGetDraft.mockResolvedValue({
      content: '<p>Divergent content</p>',
      timestamp: draftTs,
      isLocalOnly: true,
      serverVersion: null,
    });

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, new Date(serverTs).toISOString()));

    await waitFor(() => {
      expect(result.current.conflictWarning).toBeTruthy();
    });
    expect(result.current.conflictWarning).toContain('Your offline changes may differ from the server version');
  });

  it('no conflict when divergence is <= 5 minutes', async () => {
    const serverTs = new Date('2025-06-15T14:00:00Z').getTime();
    const draftTs = serverTs + 3 * 60 * 1000; // 3 minutes later

    mockGetDraft.mockResolvedValue({
      content: '<p>Recent content</p>',
      timestamp: draftTs,
      isLocalOnly: true,
    });

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, new Date(serverTs).toISOString()));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(true);
    });
    expect(result.current.conflictWarning).toBeNull();
  });

  it('restoreDraft returns saved content', async () => {
    mockGetDraft.mockResolvedValue({
      content: '<p>To restore</p>',
      timestamp: Date.now(),
    });

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(true);
    });

    let content;
    await act(async () => {
      content = await result.current.restoreDraft();
    });

    expect(content).toBe('<p>To restore</p>');
    expect(result.current.hasDraft).toBe(false);
  });

  it('restoreDraft returns null when no draft in IDB (fallback to localStorage)', async () => {
    mockGetDraft.mockResolvedValue(null);
    const emergencyKey = `autosave_emergency_${chapterId}`;
    localStorage.setItem(emergencyKey, JSON.stringify({
      content: '<p>Emergency content</p>',
      timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(true);
    });

    let content;
    await act(async () => {
      content = await result.current.restoreDraft();
    });

    expect(content).toBe('<p>Emergency content</p>');
  });

  it('restoreDraft handles localStorage with IndexedDB fallback chain', async () => {
    // IDB has a draft
    mockGetDraft.mockResolvedValue({
      content: '<p>IDB content</p>',
      timestamp: 2000,
    });

    const emergencyKey = `autosave_emergency_${chapterId}`;
    localStorage.setItem(emergencyKey, JSON.stringify({
      content: '<p>LocalStorage content</p>',
      timestamp: 1000,
    }));

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(true);
    });

    let content;
    await act(async () => {
      content = await result.current.restoreDraft();
    });

    // restoreDraft prioritizes IDB
    expect(content).toBe('<p>IDB content</p>');
  });

  it('discardDraft removes draft and clears state', async () => {
    mockGetDraft.mockResolvedValue({
      content: '<p>To discard</p>',
      timestamp: Date.now(),
    });

    const emergencyKey = `autosave_emergency_${chapterId}`;
    localStorage.setItem(emergencyKey, JSON.stringify({
      content: '<p>Emergency</p>',
      timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(true);
    });

    await act(async () => {
      await result.current.discardDraft();
    });

    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftContent).toBeNull();
    expect(result.current.shouldRestore).toBe(false);
    expect(result.current.conflictWarning).toBeNull();
    expect(mockDeleteDraft).toHaveBeenCalledWith(bookId, chapterId);
    expect(localStorage.getItem(emergencyKey)).toBeNull();
  });

  it('uses the latest draft when both IDB and localStorage have drafts', async () => {
    // IDB has older draft
    mockGetDraft.mockResolvedValue({
      content: '<p>IDB older content</p>',
      timestamp: 1000,
    });

    // localStorage has newer draft
    const emergencyKey = `autosave_emergency_${chapterId}`;
    localStorage.setItem(emergencyKey, JSON.stringify({
      content: '<p>LocalStorage newer content</p>',
      timestamp: 2000,
    }));

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(true);
      // should use the one with higher timestamp
      expect(result.current.draftContent).toBe('<p>LocalStorage newer content</p>');
    });
  });

  it('handles null bookId or chapterId gracefully', () => {
    const { result } = renderHook(() => useDraftRecovery(null, null, null));

    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftContent).toBeNull();
    expect(result.current.shouldRestore).toBe(false);
  });

  it('does not set state after unmount', async () => {
    mockGetDraft.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ content: '<p>Late</p>', timestamp: Date.now() }), 100);
    }));

    const { result, unmount } = renderHook(() => useDraftRecovery(bookId, chapterId, null));
    unmount();

    // Give it time to resolve, but should be cancelled
    await new Promise((r) => setTimeout(r, 150));

    // State should not have been set after unmount
    expect(result.current.hasDraft).toBe(false);
  });

  it('uses emergency localStorage draft when no IDB draft exists', async () => {
    mockGetDraft.mockResolvedValue(null);

    const emergencyKey = `autosave_emergency_${chapterId}`;
    localStorage.setItem(emergencyKey, JSON.stringify({
      content: '<p>Emergency only</p>',
      timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(true);
    });
    expect(result.current.draftContent).toBe('<p>Emergency only</p>');
  });

  it('cleans up corrupted emergency localStorage', async () => {
    mockGetDraft.mockResolvedValue(null);

    const emergencyKey = `autosave_emergency_${chapterId}`;
    localStorage.setItem(emergencyKey, 'not-json');

    const { result } = renderHook(() => useDraftRecovery(bookId, chapterId, null));

    await waitFor(() => {
      expect(result.current.hasDraft).toBe(false);
    });
    expect(localStorage.getItem(emergencyKey)).toBeNull();
  });
});
