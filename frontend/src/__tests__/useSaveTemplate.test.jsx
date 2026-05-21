// Contopia — useSaveTemplate Hook Tests (STORY-022)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSaveTemplate } from '../hooks/useSaveTemplate';

const mockPatch = vi.fn();
vi.mock('../lib/api-client', () => ({
  default: { patch: (...args) => mockPatch(...args) },
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

describe('useSaveTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('calls apiClient.patch with /v1/books/{bookId} and templateId', async () => {
    // Arrange
    const bookId = 'book-123';
    const templateId = 'galaxy';
    mockPatch.mockResolvedValue({ data: { data: { _id: bookId, templateId } } });

    // Act
    const { result } = renderHook(() => useSaveTemplate(), { wrapper });
    await waitFor(async () => {
      await result.current.mutateAsync({ bookId, templateId });
    });

    // Assert
    expect(mockPatch).toHaveBeenCalledWith(`/v1/books/${bookId}`, { templateId });
  });

  it('calls apiClient.patch with templateId=null for skip', async () => {
    // Arrange
    const bookId = 'book-456';
    mockPatch.mockResolvedValue({ data: { data: { _id: bookId, templateId: null } } });

    // Act
    const { result } = renderHook(() => useSaveTemplate(), { wrapper });
    await waitFor(async () => {
      await result.current.mutateAsync({ bookId, templateId: null });
    });

    // Assert
    expect(mockPatch).toHaveBeenCalledWith(`/v1/books/${bookId}`, { templateId: null });
  });

  it('invalidates bookEdit query on success', async () => {
    // Arrange
    const bookId = 'book-789';
    const templateId = 'ocean';
    mockPatch.mockResolvedValue({ data: { data: { _id: bookId, templateId } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Act
    const { result } = renderHook(() => useSaveTemplate(), { wrapper });
    await waitFor(async () => {
      await result.current.mutateAsync({ bookId, templateId });
    });

    // Assert
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bookEdit', bookId] });
  });

  it('propagates save error', async () => {
    // Arrange
    const apiError = new Error('Failed to save template');
    mockPatch.mockRejectedValue(apiError);

    // Act
    const { result } = renderHook(() => useSaveTemplate(), { wrapper });
    result.current.mutate({ bookId: 'book-fail', templateId: 'nature' });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeDefined();
  });
});
