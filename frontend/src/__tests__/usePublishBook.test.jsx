// Contopia — usePublishBook Hook Tests (STORY-020)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import usePublishBook from '../hooks/usePublishBook';

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

describe('usePublishBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('calls apiClient.post with /v1/books/{id}/publish', async () => {
    // Arrange
    const bookId = 'book123';
    mockPost.mockResolvedValue({ data: { data: { _id: bookId, status: 'published' } } });

    // Act
    const { result } = renderHook(() => usePublishBook(), { wrapper });
    let data;
    await waitFor(async () => {
      data = await result.current.mutateAsync(bookId);
    });

    // Assert
    expect(mockPost).toHaveBeenCalledWith(`/v1/books/${bookId}/publish`);
    expect(data).toEqual({ _id: bookId, status: 'published' });
  });

  it('invalidates books query on success', async () => {
    // Arrange
    mockPost.mockResolvedValue({ data: { data: { _id: 'book456', status: 'published' } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Act
    const { result } = renderHook(() => usePublishBook(), { wrapper });
    await waitFor(async () => {
      await result.current.mutateAsync('book456');
    });

    // Assert
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['books'] });
  });

  it('propagates publish error', async () => {
    // Arrange
    const apiError = new Error('Publish failed');
    apiError.response = { data: { error: { code: 'EMPTY_CONTENT' } } };
    mockPost.mockRejectedValue(apiError);

    // Act
    const { result } = renderHook(() => usePublishBook(), { wrapper });
    result.current.mutate('book789');

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeDefined();
  });
});
