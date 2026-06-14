// Contopia — Parent API Client Tests (STORY-060)
// Tests X-Session-Expiring interceptor and 401 SESSION_EXPIRED redirect
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

describe('parentApiClient (STORY-060)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    mockStore.getState.mockReturnValue({
      parentToken: 'test-token',
      parentRefreshToken: 'test-refresh',
      setParentToken: vi.fn(),
      setSessionExpiring: vi.fn(),
      parentClearAll: vi.fn(),
      updateParentActivity: vi.fn(),
    });
  });

  // ── Response interceptor: X-Session-Expiring ──

  it('calls setSessionExpiring when X-Session-Expiring header is present', async () => {
    const setSessionExpiring = vi.fn();
    mockStore.getState.mockReturnValue({
      parentToken: 'test-token',
      parentRefreshToken: 'test-refresh',
      setParentToken: vi.fn(),
      setSessionExpiring,
      parentClearAll: vi.fn(),
      updateParentActivity: vi.fn(),
    });

    // Access the interceptor handler directly from the axios instance
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
    mockStore.getState.mockReturnValue({
      parentToken: 'test-token',
      parentRefreshToken: 'test-refresh',
      setParentToken: vi.fn(),
      setSessionExpiring,
      parentClearAll: vi.fn(),
      updateParentActivity: vi.fn(),
    });

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
    mockStore.getState.mockReturnValue({
      parentToken: 'test-token',
      parentRefreshToken: 'test-refresh',
      setParentToken: vi.fn(),
      setSessionExpiring,
      parentClearAll: vi.fn(),
      updateParentActivity: vi.fn(),
    });

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
    mockStore.getState.mockReturnValue({
      parentToken: 'test-token',
      parentRefreshToken: 'test-refresh',
      setParentToken: vi.fn(),
      setSessionExpiring: vi.fn(),
      parentClearAll,
      updateParentActivity: vi.fn(),
    });

    // Mock window.location
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

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
    expect(window.location.href).toBe('/parent/login?expired=true');

    window.location = originalLocation;
  });

  it('redirects to /parent/login on 401 without SESSION_EXPIRED when no refresh token', async () => {
    const parentClearAll = vi.fn();
    mockStore.getState.mockReturnValue({
      parentToken: 'test-token',
      parentRefreshToken: null, // No refresh token
      setParentToken: vi.fn(),
      setSessionExpiring: vi.fn(),
      parentClearAll,
      updateParentActivity: vi.fn(),
    });

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    const handlers = parentApiClient.interceptors.response.handlers;
    const errorHandler = handlers[0].rejected;

    const error = {
      config: {},
      response: {
        status: 401,
        data: { error: { code: 'TOKEN_EXPIRED' } },
      },
    };

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(parentClearAll).toHaveBeenCalled();
    expect(window.location.href).toBe('/parent/login');

    window.location = originalLocation;
  });
});
