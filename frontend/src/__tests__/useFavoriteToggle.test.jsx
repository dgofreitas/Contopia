// Contopia — useFavoriteToggle Hook Tests (STORY-036)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useFavoriteToggle from '../hooks/useFavoriteToggle';

// Mock api-client
vi.mock('../lib/api-client', () => ({
  default: {
    patch: vi.fn(),
  },
}));

import apiClient from '../lib/api-client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useFavoriteToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Happy path: mutate success ──────────────────────────────────

  it('sends PATCH request with isFavorited=true', async () => {
    apiClient.patch.mockResolvedValue({ data: { isFavorited: true } });

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b1', isFavorited: true });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/books/b1', {
      isFavorited: true,
    });
  });

  it('sends PATCH request with isFavorited=false', async () => {
    apiClient.patch.mockResolvedValue({ data: { isFavorited: false } });

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b2', isFavorited: false });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/books/b2', {
      isFavorited: false,
    });
  });

  // ── Optimistic update ───────────────────────────────────────────

  it('performs optimistic update for array books cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed the cache with an array of books
    queryClient.setQueryData(['books'], [
      { _id: 'b1', title: 'Book A', isFavorited: false },
      { _id: 'b2', title: 'Book B', isFavorited: false },
    ]);

    apiClient.patch.mockResolvedValue({ data: { isFavorited: true } });

    function Wrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b1', isFavorited: true });
    });

    const books = queryClient.getQueryData(['books']);
    expect(books[0].isFavorited).toBe(true);
    expect(books[1].isFavorited).toBe(false);
  });

  it('performs optimistic update for paginated books cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed cache with paginated shape { data: [...] }
    queryClient.setQueryData(['books'], {
      data: [
        { _id: 'b1', title: 'A', isFavorited: false },
        { _id: 'b2', title: 'B', isFavorited: false },
      ],
    });

    apiClient.patch.mockResolvedValue({ data: { isFavorited: true } });

    function Wrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b1', isFavorited: true });
    });

    const cached = queryClient.getQueryData(['books']);
    expect(cached.data[0].isFavorited).toBe(true);
  });

  it('performs optimistic update for infinite query cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed cache with infinite query shape { pages: [{ data: [...] }] }
    queryClient.setQueryData(['books'], {
      pages: [{ data: [{ _id: 'b1', title: 'A', isFavorited: false }] }],
      pageParams: [undefined],
    });

    apiClient.patch.mockResolvedValue({ data: { isFavorited: true } });

    function Wrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b1', isFavorited: true });
    });

    const cached = queryClient.getQueryData(['books']);
    expect(cached.pages[0].data[0].isFavorited).toBe(true);
  });

  // ── Rollback on error ───────────────────────────────────────────

  it('rolls back optimistic update when PATCH fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const previous = [
      { _id: 'b1', title: 'A', isFavorited: false },
    ];
    queryClient.setQueryData(['books'], [...previous]);

    apiClient.patch.mockRejectedValue(new Error('Network error'));

    function Wrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: Wrapper,
    });

    // Optimistic update fires before the mutation — then mutation fails, rollback restores
    await act(async () => {
      try {
        await result.current.mutateAsync({ bookId: 'b1', isFavorited: true });
      } catch {
        // Expected error
      }
    });

    // After rollback, cache should be restored to previous value
    const books = queryClient.getQueryData(['books']);
    expect(books[0].isFavorited).toBe(false);
  });

  it('rolls back paginated cache when PATCH fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(['books'], {
      data: [{ _id: 'b1', title: 'A', isFavorited: true }],
    });

    apiClient.patch.mockRejectedValue(new Error('Server error'));

    function Wrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ bookId: 'b1', isFavorited: false });
      } catch {
        // Expected
      }
    });

    const cached = queryClient.getQueryData(['books']);
    expect(cached.data[0].isFavorited).toBe(true);
  });

  // ── onSuccess invalidates queries ───────────────────────────────

  it('invalidates books query on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(['books'], [{ _id: 'b1', title: 'A', isFavorited: false }]);

    // Spy on invalidateQueries
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    apiClient.patch.mockResolvedValue({ data: { isFavorited: true } });

    function Wrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ bookId: 'b1', isFavorited: true });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['books'] });
  });

  // ── Negative / edge cases ───────────────────────────────────────

  it('handles empty cache gracefully (no data to update)', async () => {
    apiClient.patch.mockResolvedValue({ data: { isFavorited: true } });

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: createWrapper(),
    });

    // mutateAsync should resolve without throwing, even with empty cache
    await expect(
      act(async () => {
        await result.current.mutateAsync({ bookId: 'b1', isFavorited: true });
      })
    ).resolves.toBeUndefined();
  });

  it('handles malformed cache (null data, no pages) gracefully', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Seed with weird shapes
    queryClient.setQueryData(['books'], { data: null });
    queryClient.setQueryData(['other-key'], { pages: null });

    apiClient.patch.mockResolvedValue({ data: { isFavorited: true } });

    function Wrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: Wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ bookId: 'b1', isFavorited: true });
      })
    ).resolves.toBeUndefined();
  });

  it('does not crash when context.previousBooks is undefined on error', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    apiClient.patch.mockRejectedValue(new Error('Fail'));

    function Wrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useFavoriteToggle(), {
      wrapper: Wrapper,
    });

    // Should throw without crashing (rollback handles undefined previousBooks)
    await expect(
      act(async () => {
        await expect(
          result.current.mutateAsync({ bookId: 'b1', isFavorited: true })
        ).rejects.toThrow('Fail');
      })
    ).resolves.toBeUndefined();
  });
});
