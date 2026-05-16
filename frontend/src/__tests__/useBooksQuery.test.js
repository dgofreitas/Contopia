// Contopia — useBooksQuery Hook Tests (STORY-009)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import useBooksQuery from '../hooks/useBooksQuery';

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../lib/api-client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../stores/auth-store', () => ({
  default: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ token: 'mock-token' });
    }
    return 'mock-token';
  }),
}));

describe('useBooksQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct query key and options', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useBooksQuery();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['books', { status: 'published', page: 1, pageSize: 50 }],
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: true,
      })
    );
  });

  it('passes custom params to queryKey', () => {
    useQuery.mockReturnValue({ data: null, isLoading: true });

    useBooksQuery({ status: 'draft', page: 2, pageSize: 10 });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['books', { status: 'draft', page: 2, pageSize: 10 }],
      })
    );
  });

  it('has placeholderData that returns previous data', () => {
    let callOptions;
    useQuery.mockImplementation((opts) => {
      callOptions = opts;
      return { data: null, isLoading: true };
    });

    useBooksQuery();
    const prevData = { data: [{ _id: '1' }], meta: {} };
    const result = callOptions.placeholderData(prevData);
    expect(result).toBe(prevData);
  });

  it('returns the result from useQuery', () => {
    const mockResult = { data: { data: [{ _id: '1' }], meta: {} }, isLoading: false, isError: false };
    useQuery.mockReturnValue(mockResult);

    const result = useBooksQuery();
    expect(result).toBe(mockResult);
  });
});
