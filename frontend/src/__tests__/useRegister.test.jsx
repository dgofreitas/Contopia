// Contopia — useRegister Hook Tests (STORY-057)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock axios before anything else
const mockAxiosPost = vi.fn();
vi.mock('axios', () => ({
  default: { post: mockAxiosPost },
  post: mockAxiosPost,
}));

// Mock parent-auth-store
const mockRegister = vi.fn();
vi.mock('../stores/parent-auth-store', () => ({
  default: (selector) => {
    const state = { register: mockRegister };
    return selector ? selector(state) : state;
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Mock @tanstack/react-query — capture onSuccess and mutationFn
let capturedOnSuccess = null;
let capturedMutationFn = null;
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((opts) => {
    capturedMutationFn = opts.mutationFn;
    capturedOnSuccess = opts.onSuccess;
    return {
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
      data: null,
    };
  }),
}));

import useRegister from '../hooks/useRegister';

describe('useRegister (STORY-057)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSuccess = null;
    capturedMutationFn = null;
  });

  it('should return mutate, isPending, isSuccess, error, data, getErrorMessage', () => {
    const { result } = renderHook(() => useRegister());

    expect(result.current.mutate).toBeDefined();
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
    expect(result.current.getErrorMessage).toBeDefined();
  });

  it('calls axios.post with correct URL and data on mutation', async () => {
    mockAxiosPost.mockResolvedValue({ data: { data: {} } });

    renderHook(() => useRegister());

    expect(capturedMutationFn).toBeDefined();
    await act(async () => {
      await capturedMutationFn({ email: 'parent@example.com', password: 'StrongPass1', ageConsent: true });
    });

    expect(mockAxiosPost).toHaveBeenCalledWith('/api/auth/register', {
      email: 'parent@example.com',
      password: 'StrongPass1',
      ageConsent: true,
    });
  });

  it('calls store.register on success with correct data', () => {
    renderHook(() => useRegister());

    expect(capturedOnSuccess).toBeDefined();
    act(() => {
      capturedOnSuccess({
        data: {
          accessToken: 'token123',
          parentId: 'p1',
          email: 'parent@example.com',
          children: [],
        },
      });
    });

    expect(mockRegister).toHaveBeenCalledWith({
      accessToken: 'token123',
      parentId: 'p1',
      email: 'parent@example.com',
      children: [],
    });
  });

  // ── Error Messages ──────────────────────────────────────────────────────

  it('returns correct error message for ACCOUNT_EXISTS (409)', () => {
    const { result } = renderHook(() => useRegister());
    const error = {
      response: { status: 409, data: { error: { code: 'ACCOUNT_EXISTS' } } },
    };

    expect(result.current.getErrorMessage(error)).toBe('register.errorAccountExists');
  });

  it('returns correct error message for VALIDATION_ERROR (400)', () => {
    const { result } = renderHook(() => useRegister());
    const error = {
      response: { status: 400, data: { error: { code: 'VALIDATION_ERROR' } } },
    };

    expect(result.current.getErrorMessage(error)).toBe('register.errorValidation');
  });

  it('returns correct error message for RATE_LIMITED (429)', () => {
    const { result } = renderHook(() => useRegister());
    const error = {
      response: { status: 429, data: { error: { code: 'RATE_LIMITED' } } },
    };

    expect(result.current.getErrorMessage(error)).toBe('register.errorRateLimited');
  });

  it('returns generic error for unknown error codes', () => {
    const { result } = renderHook(() => useRegister());
    const error = { response: { status: 500, data: { error: { code: 'SERVER_ERROR' } } } };

    expect(result.current.getErrorMessage(error)).toBe('register.errorGeneric');
  });

  it('returns generic error when there is no response', () => {
    const { result } = renderHook(() => useRegister());
    const error = { message: 'Network Error' };

    expect(result.current.getErrorMessage(error)).toBe('register.errorGeneric');
  });
});