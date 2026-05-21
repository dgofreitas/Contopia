// Contopia — useDraftsQuery Hook Tests (STORY-021)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useDraftsQuery from '../hooks/useDraftsQuery';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

const mockGet = vi.fn();
vi.mock('../lib/api-client', () => ({
  default: { get: (...args) => mockGet(...args) },
}));

import { useQuery } from '@tanstack/react-query';

describe('useDraftsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct queryKey', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useDraftsQuery();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['books', { status: 'draft' }],
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
      })
    );
  });

  it('returns query result from useQuery', () => {
    const mockResult = { data: { data: [] }, isLoading: false };
    useQuery.mockReturnValue(mockResult);

    const result = useDraftsQuery();

    expect(result).toBe(mockResult);
  });

  it('queryFn calls /v1/books with status=draft param', async () => {
    let capturedFn;
    useQuery.mockImplementation((opts) => {
      capturedFn = opts.queryFn;
      return { data: null };
    });

    useDraftsQuery();
    expect(capturedFn).toBeDefined();

    mockGet.mockResolvedValue({ data: { data: [{ _id: 'd1' }], meta: { pagination: { total: 1 } } } });

    const result = await capturedFn();
    expect(result).toEqual({ data: [{ _id: 'd1' }], meta: { pagination: { total: 1 } } });
    expect(mockGet).toHaveBeenCalledWith('/v1/books', { params: { status: 'draft' } });
  });
});
