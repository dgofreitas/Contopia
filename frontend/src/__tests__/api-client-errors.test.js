// Contopia — API Client Error Interceptor Tests (STORY-008)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient from '../lib/api-client';
import useAuthStore from '../stores/auth-store';

// Mock error-store so dynamic import resolves to our mock
const addToast = vi.fn();

vi.mock('../stores/error-store.js', () => ({
  useErrorStore: { getState: () => ({ addToast }) },
}));

describe('api-client error interceptor', () => {
  let rejectedHandler;
  let fulfilledHandler;
  let clearAll;
  let setSessionTimeoutWarning;

  beforeEach(() => {
    vi.clearAllMocks();
    addToast.mockClear();

    clearAll = vi.fn();
    setSessionTimeoutWarning = vi.fn();

    useAuthStore.getState = vi.fn(() => ({
      token: 'test-token',
      refreshToken: 'test-refresh-token',
      clearAll,
      setToken: vi.fn(),
      setRefreshToken: vi.fn(),
      updateActivity: vi.fn(),
      setSessionTimeoutWarning,
    }));

    const handlers = apiClient.interceptors.response.handlers;
    fulfilledHandler = handlers[0].fulfilled;
    rejectedHandler = handlers[0].rejected;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Fulfilled handler ──

  it('passes successful responses through', () => {
    const response = { data: { ok: true } };
    expect(fulfilledHandler(response)).toBe(response);
  });

  // ── Error responses with error.code ──

  it('dispatches toast on 400 VALIDATION_ERROR', async () => {
    const error = {
      response: { status: 400, data: { error: { code: 'VALIDATION_ERROR', message: 'Bad input' } } },
      config: { headers: {} },
    };

    await expect(rejectedHandler(error)).rejects.toBe(error);
    await new Promise((r) => setTimeout(r, 100));
    expect(addToast).toHaveBeenCalledWith('VALIDATION_ERROR', 'Bad input');
  });

  it('dispatches toast on 404 NOT_FOUND', async () => {
    const error = {
      response: { status: 404, data: { error: { code: 'NOT_FOUND', message: 'Missing' } } },
      config: { headers: {} },
    };

    await expect(rejectedHandler(error)).rejects.toBe(error);
    await new Promise((r) => setTimeout(r, 100));
    expect(addToast).toHaveBeenCalledWith('NOT_FOUND', 'Missing');
  });

  it('dispatches toast on 429 RATE_LIMITED', async () => {
    const error = {
      response: { status: 429, data: { error: { code: 'RATE_LIMITED', message: 'Too fast' } } },
      config: { headers: {} },
    };

    await expect(rejectedHandler(error)).rejects.toBe(error);
    await new Promise((r) => setTimeout(r, 100));
    expect(addToast).toHaveBeenCalledWith('RATE_LIMITED', 'Too fast');
  });

  it('dispatches toast on 500 INTERNAL_ERROR', async () => {
    const error = {
      response: { status: 500, data: { error: { code: 'INTERNAL_ERROR', message: 'Server error' } } },
      config: { headers: {} },
    };

    await expect(rejectedHandler(error)).rejects.toBe(error);
    await new Promise((r) => setTimeout(r, 100));
    expect(addToast).toHaveBeenCalledWith('INTERNAL_ERROR', 'Server error');
  });

  it('dispatches NETWORK_ERROR when response is null', async () => {
    const error = { response: null, config: { headers: {} } };

    await expect(rejectedHandler(error)).rejects.toBe(error);
    await new Promise((r) => setTimeout(r, 100));
    expect(addToast).toHaveBeenCalledWith('NETWORK_ERROR', null);
  });

  // ── Error without error.code ──

  it('does not dispatch toast when response has no error.code', async () => {
    const error = {
      response: { status: 400, data: { message: 'Bad request' } },
      config: { headers: {} },
    };

    await expect(rejectedHandler(error)).rejects.toBe(error);
    await new Promise((r) => setTimeout(r, 100));
    expect(addToast).not.toHaveBeenCalled();
  });

  // ── 401 with no refresh token ──

  it('clears auth and redirects on 401 with no refreshToken', async () => {
    const origHref = window.location.href;
    delete window.location;
    window.location = { href: '' };

    useAuthStore.getState = vi.fn(() => ({
      token: 'test-token',
      refreshToken: null,
      clearAll,
      setToken: vi.fn(),
      setRefreshToken: vi.fn(),
      updateActivity: vi.fn(),
      setSessionTimeoutWarning: vi.fn(),
    }));

    const error = { response: { status: 401 }, config: { headers: {} } };

    await expect(rejectedHandler(error)).rejects.toBe(error);
    expect(clearAll).toHaveBeenCalled();

    window.location = { href: origHref };
  });

  // ── 401 refresh flow: API call fails → clear + redirect ──

  it('attempts refresh on 401 with refreshToken and redirects on failure', async () => {
    const origHref = window.location.href;
    delete window.location;
    window.location = { href: '' };

    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Refresh failed'));

    useAuthStore.getState = vi.fn(() => ({
      token: 'test-token',
      refreshToken: 'test-refresh-token',
      clearAll,
      setToken: vi.fn(),
      setRefreshToken: vi.fn(),
      updateActivity: vi.fn(),
      setSessionTimeoutWarning: vi.fn(),
    }));

    const error = { response: { status: 401 }, config: { headers: {} } };

    await expect(rejectedHandler(error)).rejects.toThrow();
    expect(clearAll).toHaveBeenCalled();

    window.location = { href: origHref };
    vi.restoreAllMocks();
  });

  // ── 401 refresh flow: multiple concurrent 401s → queue support ──

  it('queues concurrent 401 requests while refresh is in flight', async () => {
    const origHref = window.location.href;
    delete window.location;
    window.location = { href: '' };

    // Create a deferred promise that we control
    let resolveRefresh;
    const refreshPromise = new Promise((r) => { resolveRefresh = r; });
    vi.spyOn(apiClient, 'post').mockReturnValue(refreshPromise);

    const setToken = vi.fn();
    const setRefreshToken = vi.fn();
    const updateActivity = vi.fn();
    useAuthStore.getState = vi.fn(() => ({
      token: 'test-token',
      refreshToken: 'test-refresh-token',
      clearAll,
      setToken,
      setRefreshToken,
      updateActivity,
      setSessionTimeoutWarning: vi.fn(),
    }));

    const error1 = { response: { status: 401 }, config: { headers: {}, url: '/api/test/1' } };
    const error2 = { response: { status: 401 }, config: { headers: {}, url: '/api/test/2' } };

    // Send first 401 — enters refresh flow, awaits apiClient.post('/auth/refresh')
    const firstPromise = rejectedHandler(error1);

    // Send second 401 — should hit isRefreshing=true and queue (no _retry because first call hasn't
    // set _retry on the second config yet; but isRefreshing is now true)
    const secondPromise = rejectedHandler(error2);

    // Let a tick pass so the first reaches the await
    await new Promise((r) => setTimeout(r, 50));

    // Now resolve the refresh
    resolveRefresh({
      data: {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      },
    });

    // Wait for both to settle
    try {
      await firstPromise;
    } catch { /* Expected — retry will fail in test env */ }
    try {
      await secondPromise;
    } catch { /* Expected */ }

    expect(setToken).toHaveBeenCalledWith('new-access-token');
    expect(setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
    expect(updateActivity).toHaveBeenCalled();

    window.location = { href: origHref };
    vi.restoreAllMocks();
  });

  // ── 401 refresh flow: queued requests get rejected on refresh failure ──

  it('rejects queued 401 requests when refresh fails', async () => {
    const origHref = window.location.href;
    delete window.location;
    window.location = { href: '' };

    // Deferred promise for refresh
    let rejectRefresh;
    const refreshPromise = new Promise((_, reject) => { rejectRefresh = reject; });

    // Use vi.fn() that returns the deferred promise
    const postSpy = vi.fn().mockReturnValue(refreshPromise);
    vi.spyOn(apiClient, 'post').mockImplementation(postSpy);

    useAuthStore.getState = vi.fn(() => ({
      token: 'test-token',
      refreshToken: 'test-refresh-token',
      clearAll,
      setToken: vi.fn(),
      setRefreshToken: vi.fn(),
      updateActivity: vi.fn(),
      setSessionTimeoutWarning: vi.fn(),
    }));

    const error1 = { response: { status: 401 }, config: { headers: {}, url: '/api/test/1' } };
    const error2 = { response: { status: 401 }, config: { headers: {}, url: '/api/test/2' } };

    // First 401 enters refresh
    const firstPromise = rejectedHandler(error1);

    // Wait a tick
    await new Promise((r) => setTimeout(r, 50));

    // Second 401 queues
    const secondPromise = rejectedHandler(error2);

    // Reject the refresh — the processRefreshQueue will reject queued promises
    // The rejections happen synchronously in the catch block, so .catch() must be
    // attached before reject
    let firstError, secondError;
    firstPromise.then(null, (e) => { firstError = e; });
    secondPromise.then(null, (e) => { secondError = e; });

    rejectRefresh(new Error('Refresh failed'));
    await new Promise((r) => setTimeout(r, 100));

    expect(firstError).toBeDefined();
    expect(secondError).toBeDefined();
    expect(clearAll).toHaveBeenCalled();

    window.location = { href: origHref };
    vi.restoreAllMocks();
  });

  // ── 401 refresh flow: API call succeeds (retry fails in test env) ──

  it('stores new tokens after successful refresh on 401', async () => {
    const origHref = window.location.href;
    delete window.location;
    window.location = { href: '' };

    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      },
    });

    const setToken = vi.fn();
    const setRefreshToken = vi.fn();
    const updateActivity = vi.fn();
    useAuthStore.getState = vi.fn(() => ({
      token: 'test-token',
      refreshToken: 'test-refresh-token',
      clearAll,
      setToken,
      setRefreshToken,
      updateActivity,
      setSessionTimeoutWarning: vi.fn(),
    }));

    const error = {
      response: { status: 401 },
      config: { headers: {}, url: '/api/test' },
    };

    // Will reject in test env because the retry makes a real HTTP request
    try {
      await rejectedHandler(error);
    } catch {
      // Expected
    }

    expect(setToken).toHaveBeenCalledWith('new-access-token');
    expect(setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
    expect(updateActivity).toHaveBeenCalled();

    window.location = { href: origHref };
    vi.restoreAllMocks();
  });

  // ── 419 session timeout ──

  it('sets sessionTimeoutWarning on 419', async () => {
    const error = { response: { status: 419, data: {} }, config: { headers: {} } };

    await expect(rejectedHandler(error)).rejects.toBe(error);
    expect(setSessionTimeoutWarning).toHaveBeenCalledWith(true);
  });

  // ── Request interceptor ──

  it('attaches Authorization header on requests when token exists', () => {
    const handlers = apiClient.interceptors.request.handlers;
    const requestHandler = handlers[0].fulfilled;
    const config = { headers: {} };

    const result = requestHandler(config);
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('does not attach Authorization header when token is null', () => {
    useAuthStore.getState = vi.fn(() => ({ token: null }));

    const handlers = apiClient.interceptors.request.handlers;
    const requestHandler = handlers[0].fulfilled;
    const config = { headers: {} };

    const result = requestHandler(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});
