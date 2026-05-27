// Contopia — useUpdateReadingProgress Hook Tests (STORY-034)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import useUpdateReadingProgress from '../hooks/useUpdateReadingProgress';

const mockPut = vi.fn();
vi.mock('../lib/api-client', () => ({
  default: { put: (...args) => mockPut(...args) },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useUpdateReadingProgress', () => {
  const bookId = 'book-123';

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls apiClient.put with correct endpoint', async () => {
    mockPut.mockResolvedValue({ data: { lastChapterId: 'c2', percentage: 50 } });

    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ lastChapterId: 'c2', percentage: 50 });
    });

    expect(mockPut).toHaveBeenCalledWith('/v1/books/book-123/progress', {
      lastChapterId: 'c2',
      percentage: 50,
    });
  });

  it('returns mutate function', () => {
    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });
    expect(typeof result.current.mutate).toBe('function');
  });

  it('returns mutateAsync function', () => {
    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });
    expect(typeof result.current.mutateAsync).toBe('function');
  });

  it('returns debouncedMutate function', () => {
    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });
    expect(typeof result.current.debouncedMutate).toBe('function');
  });

  it('debouncedMutate delays execution by 1000ms', async () => {
    mockPut.mockResolvedValue({ data: { lastChapterId: 'c2', percentage: 50 } });

    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });

    act(() => {
      result.current.debouncedMutate({ lastChapterId: 'c2', percentage: 50 });
    });

    expect(mockPut).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockPut).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledTimes(1);
    });
  });

  it('debouncedMutate resets timer on rapid calls', async () => {
    mockPut.mockResolvedValue({ data: { lastChapterId: 'c2', percentage: 50 } });

    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });

    act(() => {
      result.current.debouncedMutate({ lastChapterId: 'c2', percentage: 30 });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.debouncedMutate({ lastChapterId: 'c2', percentage: 50 });
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(mockPut).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    expect(mockPut).toHaveBeenCalledWith('/v1/books/book-123/progress', {
      lastChapterId: 'c2',
      percentage: 50,
    });
  });

  it('invalidates readingProgress queries on success', async () => {
    mockPut.mockResolvedValue({ data: { lastChapterId: 'c2', percentage: 50 } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ lastChapterId: 'c2', percentage: 50 });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['readingProgress', bookId],
    });
  });

  it('propagates error from apiClient', async () => {
    mockPut.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });

    act(() => {
      result.current.mutate({ lastChapterId: 'c2', percentage: 50 });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('reports isLoading state as false initially', () => {
    const { result } = renderHook(() => useUpdateReadingProgress(bookId), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});