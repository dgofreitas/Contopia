// Contopia — useReadingProgressQuery Hook Tests (STORY-034)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useReadingProgressQuery from '../hooks/useReadingProgressQuery';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../lib/api-client', () => ({
  default: { get: vi.fn() },
}));

import { useQuery } from '@tanstack/react-query';

describe('useReadingProgressQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct queryKey including bookId', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useReadingProgressQuery('book-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['readingProgress', 'book-123'],
      })
    );
  });

  it('sets staleTime to 30 seconds', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useReadingProgressQuery('book-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 30 * 1000,
      })
    );
  });

  it('sets gcTime to 5 minutes', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useReadingProgressQuery('book-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        gcTime: 5 * 60 * 1000,
      })
    );
  });

  it('sets refetchOnWindowFocus to false', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useReadingProgressQuery('book-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchOnWindowFocus: false,
      })
    );
  });

  it('enables query when bookId is provided', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useReadingProgressQuery('book-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    );
  });

  it('disables query when bookId is null', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useReadingProgressQuery(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('disables query when bookId is empty string', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useReadingProgressQuery('');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('queryFn calls correct endpoint', async () => {
    let capturedOptions;
    useQuery.mockImplementation((opts) => {
      capturedOptions = opts;
      return { data: null, isLoading: true };
    });

    useReadingProgressQuery('book-456');

    const apiClient = (await import('../lib/api-client')).default;
    apiClient.get.mockResolvedValue({ data: { lastChapterId: 'c2', percentage: 50 } });

    const result = await capturedOptions.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/books/book-456/progress');
    expect(result).toEqual({ lastChapterId: 'c2', percentage: 50 });
  });

  it('returns useQuery result directly', () => {
    const mockResult = { data: { lastChapterId: 'c1' }, isLoading: false };
    useQuery.mockReturnValue(mockResult);

    const result = useReadingProgressQuery('book-123');
    expect(result).toBe(mockResult);
  });

  it('caches separate queries per bookId', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useReadingProgressQuery('book-1');
    useReadingProgressQuery('book-2');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['readingProgress', 'book-1'] })
    );
    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['readingProgress', 'book-2'] })
    );
  });
});