// Contopia — useCreateChapter Hook Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useCreateChapter from '../hooks/useCreateChapter';

const mockPost = vi.fn();
vi.mock('../lib/api-client', () => ({
  default: { post: (...args) => mockPost(...args) },
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

describe('useCreateChapter', () => {
  const bookId = 'book123';

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('calls apiClient.post with /v1/books/:id/chapters', async () => {
    mockPost.mockResolvedValue({ data: { data: { _id: 'c1', title: 'Chapter 2' } } });

    const { result } = renderHook(() => useCreateChapter(bookId), { wrapper });

    await waitFor(async () => {
      const data = await result.current.mutateAsync({ title: 'Chapter 2' });
      expect(data).toEqual({ _id: 'c1', title: 'Chapter 2' });
    });

    expect(mockPost).toHaveBeenCalledWith(`/v1/books/${bookId}/chapters`, {
      title: 'Chapter 2',
    });
  });

  it('sends payload without title when omitted', async () => {
    mockPost.mockResolvedValue({ data: { data: { _id: 'c2' } } });

    const { result } = renderHook(() => useCreateChapter(bookId), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({});
    });

    expect(mockPost).toHaveBeenCalledWith(`/v1/books/${bookId}/chapters`, {});
  });

  it('invalidates chapters query on success', async () => {
    mockPost.mockResolvedValue({ data: { data: { _id: 'c3' } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateChapter(bookId), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ title: 'New Chapter' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['chapters', bookId] });
  });

  it('propagates error from apiClient', async () => {
    const apiError = new Error('Chapter limit reached');
    mockPost.mockRejectedValue(apiError);

    const { result } = renderHook(() => useCreateChapter(bookId), { wrapper });

    result.current.mutate({ title: 'Should fail' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
