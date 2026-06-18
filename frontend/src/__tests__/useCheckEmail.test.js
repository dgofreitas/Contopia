// Contopia — useCheckEmail Hook Tests (STORY-062)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock axios — use vi.hoisted so mockAxiosPost is available in the factory
const { mockAxiosPost } = vi.hoisted(() => ({
  mockAxiosPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { post: mockAxiosPost },
  post: mockAxiosPost,
}));

// Mock @tanstack/react-query — capture mutationFn for direct testing
let capturedMutationFn = null;
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((opts) => {
    capturedMutationFn = opts.mutationFn;
    return {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      data: null,
      reset: vi.fn(),
    };
  }),
}));

import useCheckEmail from '../hooks/useCheckEmail';

describe('useCheckEmail (STORY-062)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMutationFn = null;
  });

  it('should return mutate, isPending, error, data, reset', () => {
    const { result } = renderHook(() => useCheckEmail());

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
    expect(result.current.reset).toBeDefined();
  });

  it('should call axios.post with /api/auth/check-email and email payload', async () => {
    mockAxiosPost.mockResolvedValue({ data: { data: { exists: true } } });

    renderHook(() => useCheckEmail());

    expect(capturedMutationFn).toBeDefined();
    await act(async () => {
      await capturedMutationFn({ email: 'parent@example.com' });
    });

    expect(mockAxiosPost).toHaveBeenCalledWith('/api/auth/check-email', {
      email: 'parent@example.com',
    });
  });

  it('should return { exists: true } from mutationFn when email exists', async () => {
    mockAxiosPost.mockResolvedValue({ data: { data: { exists: true } } });

    renderHook(() => useCheckEmail());

    const result = await act(async () => {
      return capturedMutationFn({ email: 'existing@example.com' });
    });

    expect(result).toEqual({ exists: true });
  });

  it('should return { exists: false } from mutationFn when email does not exist', async () => {
    mockAxiosPost.mockResolvedValue({ data: { data: { exists: false } } });

    renderHook(() => useCheckEmail());

    const result = await act(async () => {
      return capturedMutationFn({ email: 'new@example.com' });
    });

    expect(result).toEqual({ exists: false });
  });

  it('should throw when axios.post fails', async () => {
    const networkError = new Error('Network error');
    mockAxiosPost.mockRejectedValue(networkError);

    renderHook(() => useCheckEmail());

    await expect(
      act(async () => capturedMutationFn({ email: 'fail@example.com' })),
    ).rejects.toThrow('Network error');
  });

  it('should propagate 429 rate limit error', async () => {
    const rateLimitError = new Error('Rate limited');
    rateLimitError.response = { status: 429, data: { error: { code: 'RATE_LIMITED' } } };
    mockAxiosPost.mockRejectedValue(rateLimitError);

    renderHook(() => useCheckEmail());

    await expect(
      act(async () => capturedMutationFn({ email: 'rate@example.com' })),
    ).rejects.toThrow('Rate limited');
  });
});
