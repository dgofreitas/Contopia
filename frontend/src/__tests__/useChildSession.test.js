// Contopia — useChildSession Hook Tests (STORY-059)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { createElement } from 'react';
import useChildSession from '../hooks/useChildSession';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockStartSessionFromParent = vi.fn();

vi.mock('../stores/auth-store', () => ({
  default: {
    getState: () => ({
      startSessionFromParent: mockStartSessionFromParent,
    }),
  },
}));

vi.mock('../lib/parent-api-client', () => ({
  default: {
    post: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(BrowserRouter, null, children),
    );
  };
}

describe('useChildSession (STORY-059)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return hook API with startChildSession, isPending, error, data, getErrorMessage', () => {
    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });
    expect(result.current.startChildSession).toBeDefined();
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeUndefined();
    expect(result.current.getErrorMessage).toBeDefined();
  });

  it('should call parentApiClient.post with /auth/child-session and payload', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'child-jwt',
          childId: 'child123',
          childFirstName: 'Julia',
          sessionId: 'sess_abc',
          isOnboardingComplete: true,
        },
      },
    });

    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.startChildSession({ childId: 'child123' });
    });

    // Wait for mutation to complete
    await vi.waitFor(() => {
      expect(parentApiClient.post).toHaveBeenCalledWith('/auth/child-session', { childId: 'child123' });
    });
  });

  it('should call parentApiClient.post without childId when not provided', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'child-jwt',
          childId: 'child123',
          childFirstName: 'Julia',
          sessionId: 'sess_def',
          isOnboardingComplete: false,
        },
      },
    });

    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.startChildSession();
    });

    await vi.waitFor(() => {
      expect(parentApiClient.post).toHaveBeenCalledWith('/auth/child-session', {});
    });
  });

  it('should call startSessionFromParent on success', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    const responseData = {
      data: {
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
        isOnboardingComplete: true,
      },
    };
    parentApiClient.post.mockResolvedValue({ data: responseData });

    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.startChildSession({ childId: 'child123' });
    });

    await vi.waitFor(() => {
      expect(mockStartSessionFromParent).toHaveBeenCalledWith({
        accessToken: 'child-jwt',
        childId: 'child123',
        childFirstName: 'Julia',
        sessionId: 'sess_abc',
        isOnboardingComplete: true,
      });
    });
  });

  it('should navigate to /shelf on success', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'child-jwt',
          childId: 'child123',
          childFirstName: 'Julia',
          sessionId: 'sess_abc',
          isOnboardingComplete: true,
        },
      },
    });

    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.startChildSession({ childId: 'child123' });
    });

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/shelf', { replace: true });
    });
  });

  it('should set isPending=true during mutation', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    let resolvePromise;
    parentApiClient.post.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });

    act(() => {
      result.current.startChildSession({ childId: 'child123' });
    });

    // Wait for React state update
    await vi.waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    // Clean up by resolving the promise
    await act(async () => {
      resolvePromise({ data: { data: { accessToken: 't', childId: 'c', childFirstName: 'n', sessionId: 's' } } });
    });
  });

  it('should return error state on failure', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.post.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.startChildSession({ childId: 'child123' });
    });

    await vi.waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('getErrorMessage returns parent session expired message for 401', () => {
    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });
    const error = {
      response: { status: 401, data: { error: { code: 'PARENT_SESSION_EXPIRED' } } },
    };
    // t() is mocked to return the key with interpolation done
    expect(result.current.getErrorMessage(error)).toBe('childSession.parentSessionExpired');
  });

  it('getErrorMessage returns child not found message for 404', () => {
    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });
    const error = {
      response: { status: 404, data: { error: { code: 'CHILD_NOT_FOUND' } } },
    };
    expect(result.current.getErrorMessage(error)).toBe('childSession.noChildFound');
  });

  it('getErrorMessage returns generic error for unknown errors', () => {
    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });
    const error = new Error('Something broke');
    expect(result.current.getErrorMessage(error)).toBe('register.errorGeneric');
  });

  it('getErrorMessage returns generic error for 500', () => {
    const { result } = renderHook(() => useChildSession(), { wrapper: createWrapper() });
    const error = { response: { status: 500 } };
    expect(result.current.getErrorMessage(error)).toBe('register.errorGeneric');
  });
});