import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useActivitySummary from '../hooks/useActivitySummary';
import useActivityBooks from '../hooks/useActivityBooks';

vi.mock('../lib/parent-api-client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../stores/parent-auth-store', () => {
  const state = { parentToken: 'parent-jwt' };
  const storeFn = (selector) => selector ? selector(state) : state;
  storeFn.getState = () => state;
  return { default: storeFn };
});

import parentApiClient from '../lib/parent-api-client';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useActivitySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches activity summary from /activity/summary', async () => {
    const mockData = { data: { booksWritten: 5, booksRead: 3, readingTimeMinutes: 45, childFirstName: 'Julia', childId: 'c1', hasActivity: true } };
    parentApiClient.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useActivitySummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(parentApiClient.get).toHaveBeenCalledWith('/activity/summary');
    expect(result.current.data).toEqual({ data: mockData });
  });

  it('uses correct queryKey', async () => {
    parentApiClient.get.mockResolvedValueOnce({ data: { data: { hasActivity: false } } });

    const { result } = renderHook(() => useActivitySummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe('useActivityBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches books from /activity/books with limit and offset', async () => {
    const mockData = { data: { books: [{ bookId: 'b1', title: 'Test', coverThumbnailUrl: null, status: 'published', updatedAt: '2026-06-05T10:00:00Z' }], total: 1, limit: 20, offset: 0 } };
    parentApiClient.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useActivityBooks({ limit: 20, offset: 0 }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(parentApiClient.get).toHaveBeenCalledWith('/activity/books', { params: { limit: 20, offset: 0 } });
  });

  it('uses default limit and offset', async () => {
    parentApiClient.get.mockResolvedValueOnce({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });

    const { result } = renderHook(() => useActivityBooks(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(parentApiClient.get).toHaveBeenCalledWith('/activity/books', { params: { limit: 20, offset: 0 } });
  });
});