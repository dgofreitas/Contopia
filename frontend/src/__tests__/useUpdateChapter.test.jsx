// Contopia — useUpdateChapter Hook Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useUpdateChapter from '../hooks/useUpdateChapter';

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

describe('useUpdateChapter', () => {
  const bookId = 'book123';

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('calls apiClient.put with /v1/chapters/:id and updates', async () => {
    mockPut.mockResolvedValue({ data: { data: { _id: 'c1', title: 'Renamed' } } });

    const { result } = renderHook(() => useUpdateChapter(bookId), { wrapper });

    await waitFor(async () => {
      const data = await result.current.mutateAsync({ chapterId: 'c1', title: 'Renamed' });
      expect(data).toEqual({ _id: 'c1', title: 'Renamed' });
    });

    expect(mockPut).toHaveBeenCalledWith('/v1/chapters/c1', { title: 'Renamed' });
  });

  it('invalidates chapters query on success', async () => {
    mockPut.mockResolvedValue({ data: { data: { _id: 'c1' } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateChapter(bookId), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ chapterId: 'c1', title: 'Updated' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chapters', bookId] });
  });

  it('invalidates books query on success (STORY-021)', async () => {
    mockPut.mockResolvedValue({ data: { data: { _id: 'c1' } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateChapter(bookId), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ chapterId: 'c1', title: 'Updated' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chapters', bookId] });
    // STORY-021: also invalidates ['books'] to refresh draft word counts
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['books'] });
  });

  it('propagates error from apiClient', async () => {
    const apiError = new Error('Not found');
    mockPut.mockRejectedValue(apiError);

    const { result } = renderHook(() => useUpdateChapter(bookId), { wrapper });

    result.current.mutate({ chapterId: 'nonexistent', title: 'Fail' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
