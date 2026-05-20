// Contopia — useChaptersQuery Hook Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import useChaptersQuery from '../hooks/useChaptersQuery';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../lib/api-client', () => ({
  default: { get: vi.fn() },
}));

describe('useChaptersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with chapters queryKey and bookId', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });
    useChaptersQuery('book123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['chapters', 'book123'],
        enabled: true,
      })
    );
  });

  it('sets enabled=false when bookId is falsy', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });
    useChaptersQuery(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['chapters', null],
        enabled: false,
      })
    );
  });

  it('has correct staleTime and gcTime', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });
    useChaptersQuery('book123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      })
    );
  });

  it('returns the result from useQuery', () => {
    const mockResult = { data: { data: [{ _id: 'c1' }] }, isLoading: false };
    useQuery.mockReturnValue(mockResult);

    const result = useChaptersQuery('book123');
    expect(result).toBe(mockResult);
  });
});
