// Contopia — useReorderChapters Hook Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useReorderChapters from '../hooks/useReorderChapters';

const mockPatch = vi.fn();
vi.mock('../lib/api-client', () => ({
  default: { patch: (...args) => mockPatch(...args) },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const initialChapters = {
  data: [
    { _id: 'c1', title: 'Ch 1', order: 0 },
    { _id: 'c2', title: 'Ch 2', order: 1 },
    { _id: 'c3', title: 'Ch 3', order: 2 },
  ],
};

function wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useReorderChapters', () => {
  const bookId = 'book123';

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    queryClient.setQueryData(['chapters', bookId], initialChapters);
  });

  it('calls apiClient.patch with reorder payload', async () => {
    mockPatch.mockResolvedValue({ data: { data: initialChapters.data } });

    const { result } = renderHook(() => useReorderChapters(bookId), { wrapper });

    const payload = [
      { id: 'c3', order: 0 },
      { id: 'c2', order: 1 },
      { id: 'c1', order: 2 },
    ];

    await waitFor(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockPatch).toHaveBeenCalledWith(
      `/v1/books/${bookId}/chapters/reorder`,
      { chapters: payload }
    );
  });

  it('performs optimistic update on mutate', async () => {
    mockPatch.mockResolvedValue({ data: { data: initialChapters.data } });

    const { result } = renderHook(() => useReorderChapters(bookId), { wrapper });

    const payload = [
      { id: 'c3', order: 0 },
      { id: 'c2', order: 1 },
      { id: 'c1', order: 2 },
    ];

    await act(async () => {
      result.current.mutate(payload);
    });

    // Optimistic update should reorder chapters immediately
    const cached = queryClient.getQueryData(['chapters', bookId]);
    expect(cached.data[0]._id).toBe('c3');
    expect(cached.data[0].order).toBe(0);
    expect(cached.data[1]._id).toBe('c2');
    expect(cached.data[1].order).toBe(1);
    expect(cached.data[2]._id).toBe('c1');
    expect(cached.data[2].order).toBe(2);
  });

  it('rolls back on error', async () => {
    mockPatch.mockRejectedValue(new Error('Reorder failed'));

    const { result } = renderHook(() => useReorderChapters(bookId), { wrapper });

    const payload = [
      { id: 'c3', order: 0 },
      { id: 'c2', order: 1 },
      { id: 'c1', order: 2 },
    ];

    result.current.mutate(payload);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache should be rolled back to original order
    const cached = queryClient.getQueryData(['chapters', bookId]);
    expect(cached.data[0]._id).toBe('c1');
    expect(cached.data[0].order).toBe(0);
  });

  it('invalidates chapters query on settle', async () => {
    mockPatch.mockResolvedValue({ data: { data: initialChapters.data } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReorderChapters(bookId), { wrapper });

    const payload = [{ id: 'c1', order: 0 }];

    await waitFor(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chapters', bookId] });
  });
});
