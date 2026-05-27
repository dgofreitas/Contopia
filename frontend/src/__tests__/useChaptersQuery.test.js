// Contopia — useChaptersQuery Hook Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api-client';
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

  it('executes queryFn which calls apiClient.get with correct URL', async () => {
    const chaptersData = [{ _id: 'c1', title: 'Chapter 1' }];
    const responseData = { data: chaptersData };
    apiClient.get.mockResolvedValue(responseData);

    useChaptersQuery('book123');
    const config = useQuery.mock.calls[0][0];

    const result = await config.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith('/v1/reader/book123/chapters');
    expect(result).toBe(chaptersData);
  });

  it('returns the result from useQuery', () => {
    const mockResult = { data: { data: [{ _id: 'c1' }] }, isLoading: false };
    useQuery.mockReturnValue(mockResult);

    const result = useChaptersQuery('book123');
    expect(result).toBe(mockResult);
  });
});
