// Contopia — useCreateBook Hook Tests (STORY-016)
// Covers: hooks/useCreateBook.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useCreateBook from '../hooks/useCreateBook';

// Mock api-client
const mockPost = vi.fn();
vi.mock('../lib/api-client', () => ({
  default: {
    post: (...args) => mockPost(...args),
  },
}));

// Mock sanitize — passthrough by default
vi.mock('../lib/sanitize', () => ({
  sanitizeText: vi.fn((text) => text),
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

describe('useCreateBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('calls apiClient.post with /v1/books and sanitized payload', async () => {
    mockPost.mockResolvedValue({ data: { data: { _id: 'book123', title: 'My Book' } } });

    const { result } = renderHook(() => useCreateBook(), { wrapper });

    let data;
    await waitFor(async () => {
      data = await result.current.mutateAsync({ title: 'My Book', summary: 'A story' });
    });

    expect(mockPost).toHaveBeenCalledWith('/v1/books', {
      title: 'My Book',
      summary: 'A story',
    });
    expect(data).toEqual({ _id: 'book123', title: 'My Book' });
  });

  it('calls apiClient.post without summary when summary is empty', async () => {
    mockPost.mockResolvedValue({ data: { data: { _id: 'book456', title: 'No Summary Book' } } });

    const { result } = renderHook(() => useCreateBook(), { wrapper });

    let data;
    await waitFor(async () => {
      data = await result.current.mutateAsync({ title: 'No Summary Book', summary: undefined });
    });

    expect(mockPost).toHaveBeenCalledWith('/v1/books', {
      title: 'No Summary Book',
      // summary should be undefined (omitted)
    });
    expect(data).toEqual({ _id: 'book456', title: 'No Summary Book' });
  });

  it('invalidates books query on success', async () => {
    mockPost.mockResolvedValue({ data: { data: { _id: 'book789' } } });

    // Spy on invalidateQueries
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateBook(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ title: 'Test', summary: '' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['books'] });
  });

  it('propagates error from apiClient', async () => {
    const apiError = new Error('Network error');
    apiError.response = { data: { error: { message: 'Book limit reached' } } };
    mockPost.mockRejectedValue(apiError);

    const { result } = renderHook(() => useCreateBook(), { wrapper });

    // Use mutate (not mutateAsync) and wait for the state to flush
    result.current.mutate({ title: 'Test', summary: '' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
