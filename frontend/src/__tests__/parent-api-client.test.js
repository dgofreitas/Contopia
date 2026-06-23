// Contopia — Parent API Client Tests (STORY-060 / STORY-062)
// Tests X-Session-Expiring interceptor, 401 SESSION_EXPIRED redirect,
// and the httpOnly-cookie-based refresh flow (no refreshToken in store).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the store before importing the client
const { mockStore } = vi.hoisted(() => {
  const state = {
    parentToken: 'test-token',
    parentRefreshToken: 'test-refresh',
    setParentToken: vi.fn(),
    setSessionExpiring: vi.fn(),
    parentClearAll: vi.fn(),
    updateParentActivity: vi.fn(),
  };
  return {
    mockStore: {
      getState: vi.fn(() => state),
      subscribe: vi.fn(),
      destroy: vi.fn(),
    },
  };
});

vi.mock('../stores/parent-auth-store', () => ({
  default: mockStore,
}));

// Mock error-store dynamic import
vi.mock('../stores/error-store', () => ({
  useErrorStore: {
    getState: vi.fn(() => ({
      addToast: vi.fn(),
    })),
  },
}));

import parentApiClient from '../lib/parent-api-client';

function makeStoreState(overrides = {}) {
  return {
    parentToken: 'test-token',
    parentRefreshToken: 'test-refresh',
    setParentToken: vi.fn(),
    setSessionExpiring: vi.fn(),
    parentClearAll: vi.fn(),
    updateParentActivity: vi.fn(),
    ...overrides,
  };
}

function mockLocation() {
  const originalLocation = window.location;
  delete window.location;
  window.location = { href: '' };
  return originalLocation;
}

function restoreLocation(originalLocation) {
  window.location = originalLocation;
}

describe('parentApiClient (STORY-060 / STORY-062)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getState.mockReturnValue(makeStoreState());
  });

  // ── Response interceptor: X-Session-Expiring ──

  it('calls setSessionExpiring when X-Session-Expiring header is present', async () => {
    const setSessionExpiring = vi.fn();
    mockStore.getState.mockReturnValue(makeStoreState({ setSessionExpiring }));

    const handlers = parentApiClient.interceptors.response.handlers;
    const successHandler = handlers[0].fulfilled;

    const mockResponse = {
      headers: { 'x-session-expiring': '120' },
      data: { ok: true },
    };

    const result = successHandler(mockResponse);
    expect(setSessionExpiring).toHaveBeenCalledWith(120);
    expect(result).toBe(mockResponse);
  });

  it('does not call setSessionExpiring when header is absent', async () => {
    const setSessionExpiring = vi.fn();
    mockStore.getState.mockReturnValue(makeStoreState({ setSessionExpiring }));

    const handlers = parentApiClient.interceptors.response.handlers;
    const successHandler = handlers[0].fulfilled;

    const mockResponse = {
      headers: {},
      data: { ok: true },
    };

    const result = successHandler(mockResponse);
    expect(setSessionExpiring).not.toHaveBeenCalled();
    expect(result).toBe(mockResponse);
  });

  it('ignores invalid X-Session-Expiring header values', async () => {
    const setSessionExpiring = vi.fn();
    mockStore.getState.mockReturnValue(makeStoreState({ setSessionExpiring }));

    const handlers = parentApiClient.interceptors.response.handlers;
    const successHandler = handlers[0].fulfilled;

    const mockResponse = {
      headers: { 'x-session-expiring': 'invalid' },
      data: { ok: true },
    };

    const result = successHandler(mockResponse);
    expect(setSessionExpiring).not.toHaveBeenCalled();
    expect(result).toBe(mockResponse);
  });

  // ── Response interceptor: 401 SESSION_EXPIRED ──

  it('calls parentClearAll and redirects on 401 SESSION_EXPIRED', async () => {
    const parentClearAll = vi.fn();
    mockStore.getState.mockReturnValue(makeStoreState({ parentClearAll }));

    const originalLocation = mockLocation();

    const handlers = parentApiClient.interceptors.response.handlers;
    const errorHandler = handlers[0].rejected;

    const error = {
      config: {},
      response: {
        status: 401,
        data: { error: { code: 'SESSION_EXPIRED' } },
      },
    };

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(parentClearAll).toHaveBeenCalled();
    expect(window.location.href).toBe('/parent?expired=true');

    restoreLocation(originalLocation);
  });

  // ── STORY-062: refresh via httpOnly cookie (no refreshToken in store) ──

  it('attempts POST /refresh with no body (cookie-based) on 401 and retries original request', async () => {
    const setParentToken = vi.fn();
    const updateParentActivity = vi.fn();
    mockStore.getState.mockReturnValue(makeStoreState({ setParentToken, updateParentActivity }));

    const originalLocation = mockLocation();

    const handlers = parentApiClient.interceptors.response.handlers;
    const errorHandler = handlers[0].rejected;

    // Spy on parentApiClient.post (used for the refresh call) — resolves with new token.
    const postSpy = vi.spyOn(parentApiClient, 'post').mockResolvedValue({
      data: { data: { accessToken: 'new-jwt', parentId: 'p1' } },
    });

    // Stub the XHR adapter so the retry (parentApiClient(originalRequest)) does not
    // hit the network. We monkey-patch the defaults.adapter to a resolving stub.
    const originalAdapter = parentApiClient.defaults.adapter;
    parentApiClient.defaults.adapter = vi.fn().mockResolvedValue({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const error = {
      config: { url: '/me', headers: {} },
      response: { status: 401, data: { error: { code: 'TOKEN_EXPIRED' } } },
    };

    try {
      await errorHandler(error);
      expect(postSpy).toHaveBeenCalledWith('/refresh', {}, { withCredentials: true });
      expect(setParentToken).toHaveBeenCalledWith('new-jwt');
      expect(updateParentActivity).toHaveBeenCalled();
    } finally {
      postSpy.mockRestore();
      parentApiClient.defaults.adapter = originalAdapter;
      restoreLocation(originalLocation);
    }
  });

  it('clears all state and redirects to /parent when refresh returns 401', async () => {
    const parentClearAll = vi.fn();
    mockStore.getState.mockReturnValue(makeStoreState({ parentClearAll }));

    const originalLocation = mockLocation();

    const handlers = parentApiClient.interceptors.response.handlers;
    const errorHandler = handlers[0].rejected;

    // 401 from /refresh means the httpOnly cookie is invalid/expired.
    const refresh401Error = {
      response: { status: 401, data: { error: { code: 'INVALID_REFRESH_TOKEN' } } },
    };
    const postSpy = vi.spyOn(parentApiClient, 'post').mockRejectedValue(refresh401Error);

    const error = {
      config: { url: '/me', headers: {} },
      response: { status: 401, data: { error: { code: 'TOKEN_EXPIRED' } } },
    };

    await expect(errorHandler(error)).rejects.toBe(refresh401Error);
    expect(postSpy).toHaveBeenCalledWith('/refresh', {}, { withCredentials: true });
    expect(parentClearAll).toHaveBeenCalled();
    expect(window.location.href).toBe('/parent');

    postSpy.mockRestore();
    restoreLocation(originalLocation);
  });

  // ── STORY-064: Network error during refresh (NFR-AVL-04) ──

  it('does NOT clearAll or redirect when refresh fails with a network error', async () => {
    const parentClearAll = vi.fn();
    const setSessionExpiring = vi.fn();
    mockStore.getState.mockReturnValue(makeStoreState({ parentClearAll, setSessionExpiring }));

    const originalLocation = mockLocation();

    const handlers = parentApiClient.interceptors.response.handlers;
    const errorHandler = handlers[0].rejected;

    // Network error — no response property.
    const postSpy = vi
      .spyOn(parentApiClient, 'post')
      .mockImplementation(async () => { throw new Error('Network Error'); });

    const error = {
      config: { url: '/me', headers: {} },
      response: { status: 401, data: { error: { code: 'TOKEN_EXPIRED' } } },
    };

    await expect(errorHandler(error)).rejects.toThrow('Network Error');
    expect(parentClearAll).not.toHaveBeenCalled();
    expect(window.location.href).toBe('');
    expect(setSessionExpiring).toHaveBeenCalledWith(0);

    postSpy.mockRestore();
    restoreLocation(originalLocation);
  });

  it('retries refresh up to 3 times with backoff on network errors', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      mockStore.getState.mockReturnValue(makeStoreState());

      const handlers = parentApiClient.interceptors.response.handlers;
      const errorHandler = handlers[0].rejected;

      // Fail twice with network error, succeed on 3rd attempt.
      const refreshResponse = { data: { data: { accessToken: 'new-jwt' } } };
      const postSpy = vi
        .spyOn(parentApiClient, 'post')
        .mockRejectedValueOnce(new Error('net err 1'))
        .mockRejectedValueOnce(new Error('net err 2'))
        .mockResolvedValueOnce(refreshResponse);

      const originalAdapter = parentApiClient.defaults.adapter;
      parentApiClient.defaults.adapter = vi.fn().mockResolvedValue({
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const error = {
        config: { url: '/me', headers: {} },
        response: { status: 401, data: { error: { code: 'TOKEN_EXPIRED' } } },
      };

      const promise = errorHandler(error);
      // Advance past the two backoff delays (1s, 2s).
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(postSpy).toHaveBeenCalledTimes(3);
      expect(result.data).toEqual({ ok: true });

      postSpy.mockRestore();
      parentApiClient.defaults.adapter = originalAdapter;
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up after 3 network-error retries and rejects', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    // Suppress Node's PromiseRejectionHandledWarning noise from async mock rejections.
    const swallow = () => {};
    const nodeProcess = globalThis.process;
    if (nodeProcess) nodeProcess.on('unhandledRejection', swallow);
    try {
      const parentClearAll = vi.fn();
      mockStore.getState.mockReturnValue(makeStoreState({ parentClearAll }));

      const handlers = parentApiClient.interceptors.response.handlers;
      const errorHandler = handlers[0].rejected;

      const netError = () => Promise.resolve().then(() => { throw new Error('net down'); });
      const postSpy = vi
        .spyOn(parentApiClient, 'post')
        .mockImplementation(netError);

      const error = {
        config: { url: '/me', headers: {} },
        response: { status: 401, data: { error: { code: 'TOKEN_EXPIRED' } } },
      };

      const promise = errorHandler(error);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      await expect(promise).rejects.toThrow('net down');
      expect(postSpy).toHaveBeenCalledTimes(3);
      expect(parentClearAll).not.toHaveBeenCalled();

      postSpy.mockRestore();
    } finally {
      if (nodeProcess) nodeProcess.off('unhandledRejection', swallow);
      vi.useRealTimers();
    }
  });

  it('does not attempt refresh when request already retried (_retry flag set)', async () => {
    mockStore.getState.mockReturnValue(makeStoreState());

    const handlers = parentApiClient.interceptors.response.handlers;
    const errorHandler = handlers[0].rejected;

    const postSpy = vi.spyOn(parentApiClient, 'post');

    const error = {
      config: { _retry: true, url: '/me', headers: {} },
      response: { status: 401, data: { error: { code: 'TOKEN_EXPIRED' } } },
    };

    // Should reject without calling /refresh
    await expect(errorHandler(error)).rejects.toBe(error);
    expect(postSpy).not.toHaveBeenCalled();

    postSpy.mockRestore();
  });
});
