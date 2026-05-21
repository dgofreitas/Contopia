// Contopia — useBookEditQuery Hook Tests (STORY-021)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import useBookEditQuery from '../hooks/useBookEditQuery';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

const mockGet = vi.fn();
vi.mock('../lib/api-client', () => ({
  default: { get: (...args) => mockGet(...args) },
}));

describe('useBookEditQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct queryKey and bookId param', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useBookEditQuery('book123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['bookEdit', 'book123'],
        enabled: true,
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
      })
    );
  });

  it('sets enabled to false when bookId is falsy', () => {
    useQuery.mockReturnValue({ data: null, isLoading: false });

    useBookEditQuery(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('returns query result from useQuery', () => {
    const mockResult = { data: { data: { book: { _id: 'b1' }, chapters: [] } }, isLoading: false };
    useQuery.mockReturnValue(mockResult);

    const result = useBookEditQuery('b1');

    expect(result).toBe(mockResult);
  });

  it('queryFn calls apiClient.get and returns data.data', async () => {
    // Capture the queryFn
    let capturedFn;
    useQuery.mockImplementation((opts) => {
      capturedFn = opts.queryFn;
      return { data: null };
    });

    useBookEditQuery('b1');
    expect(capturedFn).toBeDefined();

    mockGet.mockResolvedValue({ data: { data: { book: { _id: 'b1' }, chapters: [] } } });

    const result = await capturedFn();
    expect(result).toEqual({ book: { _id: 'b1' }, chapters: [] });
    expect(mockGet).toHaveBeenCalledWith('/v1/books/b1/edit');
  });
});
