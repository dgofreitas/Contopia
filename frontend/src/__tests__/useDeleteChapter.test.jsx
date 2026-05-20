// Contopia — useDeleteChapter Hook Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useDeleteChapter from '../hooks/useDeleteChapter';

const mockDelete = vi.fn();
vi.mock('../lib/api-client', () => ({
  default: { delete: (...args) => mockDelete(...args) },
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

describe('useDeleteChapter', () => {
  const bookId = 'book123';

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('calls apiClient.delete with correct URL', async () => {
    mockDelete.mockResolvedValue({});

    const { result } = renderHook(() => useDeleteChapter(bookId), { wrapper });

    await waitFor(async () => {
      const id = await result.current.mutateAsync({ chapterId: 'c1' });
      expect(id).toBe('c1');
    });

    expect(mockDelete).toHaveBeenCalledWith(`/v1/books/${bookId}/chapters/c1`);
  });

  it('invalidates chapters query on success', async () => {
    mockDelete.mockResolvedValue({});
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteChapter(bookId), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ chapterId: 'c1' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chapters', bookId] });
  });

  it('propagates error from apiClient', async () => {
    const apiError = new Error('Forbidden');
    mockDelete.mockRejectedValue(apiError);

    const { result } = renderHook(() => useDeleteChapter(bookId), { wrapper });

    result.current.mutate({ chapterId: 'c1' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
