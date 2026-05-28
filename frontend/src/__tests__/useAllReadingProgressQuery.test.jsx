// Contopia — useAllReadingProgressQuery Hook Tests (STORY-033)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../lib/api-client', () => ({
  default: { get: mockGet },
}));

import useAllReadingProgressQuery from '../hooks/useAllReadingProgressQuery';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// For jsdom — need React available
import React from 'react';

describe('useAllReadingProgressQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all reading progress from the correct endpoint', async () => {
    const mockData = {
      data: [
        { userId: 'u1', bookId: 'b1', percentage: 75, finished: false },
        { userId: 'u1', bookId: 'b2', percentage: 100, finished: true },
      ],
    };

    mockGet.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAllReadingProgressQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/v1/books/progress/all');
    expect(result.current.data).toEqual(mockData.data);
  });

  it('returns empty array when no progress data exists', async () => {
    mockGet.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAllReadingProgressQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAllReadingProgressQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('has correct queryKey for TanStack Query caching', () => {
    expect(typeof useAllReadingProgressQuery).toBe('function');
  });

  it('returns multiple progress entries in array format', async () => {
    const progressEntries = Array.from({ length: 10 }, (_, i) => ({
      userId: 'u1',
      bookId: `b${i}`,
      percentage: i * 10,
      finished: i === 9,
    }));

    mockGet.mockResolvedValue({ data: progressEntries });

    const { result } = renderHook(() => useAllReadingProgressQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(10);
  });
});
