// Contopia — useAuth Hook Tests (STORY-002)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAuth from '../hooks/useAuth';

const IDLE_WARNING_MS = 25 * 60 * 1000;
const IDLE_EXPIRE_MS = 30 * 60 * 1000;

// vi.hoisted() runs at hoist position — its return value is usable by vi.mock() factories
const { mockState, mockGetState } = vi.hoisted(() => {
  const state = {
    token: null, user: null, sessionExpiresAt: null,
    sessionTimeoutWarning: false, lastActivity: null,
    updateActivity: vi.fn(), setSessionTimeoutWarning: vi.fn(),
    clearAll: vi.fn(), logout: vi.fn(),
  };
  const getState = vi.fn(() => state);
  const storeFn = (selector) => (selector ? selector(state) : state);
  storeFn.getState = getState;
  return { mockState: state, mockGetState: getState };
});

vi.mock('../stores/auth-store', () => {
  const storeFn = (selector) => (selector ? selector(mockState) : mockState);
  storeFn.getState = mockGetState;
  return { default: storeFn };
});

vi.mock('../lib/api-client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

function resetState() {
  Object.assign(mockState, {
    token: null, user: null, sessionExpiresAt: null,
    sessionTimeoutWarning: false, lastActivity: null,
    updateActivity: vi.fn(), setSessionTimeoutWarning: vi.fn(),
    clearAll: vi.fn(), logout: vi.fn(),
  });
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    resetState();
    mockGetState.mockReturnValue(mockState);
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      href: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Return values ──

  it('returns isAuthenticated=false when no token', () => {
    mockState.token = null;
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('returns isAuthenticated=true when token exists', () => {
    mockState.token = 'valid-jwt';
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns user from store', () => {
    mockState.token = 'jwt';
    mockState.user = { name: 'Test', id: '1' };
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual({ name: 'Test', id: '1' });
  });

  it('returns sessionExpiresAt from store', () => {
    const ts = Date.now() + 1800000;
    mockState.token = 'jwt';
    mockState.sessionExpiresAt = ts;
    const { result } = renderHook(() => useAuth());
    expect(result.current.sessionExpiresAt).toBe(ts);
  });

  it('returns showTimeoutModal based on sessionTimeoutWarning', () => {
    mockState.token = 'jwt';
    mockState.sessionTimeoutWarning = true;
    const { result } = renderHook(() => useAuth());
    expect(result.current.showTimeoutModal).toBe(true);
  });

  it('returns extendingSession=false initially', () => {
    mockState.token = 'jwt';
    const { result } = renderHook(() => useAuth());
    expect(result.current.extendingSession).toBe(false);
  });

  // ── Idle timer starts on mount ──

  it('starts idle timers when authenticated with no lastActivity', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    renderHook(() => useAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    expect(mockState.setSessionTimeoutWarning).toHaveBeenCalledWith(true);
  });

  it('does not start idle timers when not authenticated', () => {
    mockState.token = null;
    renderHook(() => useAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    expect(mockState.setSessionTimeoutWarning).not.toHaveBeenCalled();
  });

  // ── Warning at 25 minutes ──

  it('triggers session timeout warning after 25 minutes of idle', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    renderHook(() => useAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    expect(mockState.setSessionTimeoutWarning).toHaveBeenCalledWith(true);
  });

  it('sets warning based on elapsed time since lastActivity', () => {
    const twentyFiveMinutesAgo = Date.now() - IDLE_WARNING_MS;
    mockState.token = 'jwt';
    mockState.lastActivity = twentyFiveMinutesAgo;

    renderHook(() => useAuth());

    expect(mockState.setSessionTimeoutWarning).toHaveBeenCalledWith(true);
  });

  // ── Timeout at 30 minutes ──

  it('triggers auto-logout after 30 minutes of idle', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    renderHook(() => useAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_EXPIRE_MS);
    });

    expect(mockState.clearAll).toHaveBeenCalled();
  });

  it('auto-logout redirects to /login', () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    mockState.token = 'jwt';
    mockState.lastActivity = null;
    mockGetState.mockReturnValue({ ...mockState, token: 'jwt' });
    renderHook(() => useAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_EXPIRE_MS);
    });

    expect(window.location.href).toBe('/login');
    window.location = originalLocation;
  });

  it('handles already-expired session on mount', () => {
    const thirtyOneMinutesAgo = Date.now() - IDLE_EXPIRE_MS - 60000;
    mockState.token = 'jwt';
    mockState.lastActivity = thirtyOneMinutesAgo;
    mockGetState.mockReturnValue({ ...mockState, token: 'jwt' });

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    renderHook(() => useAuth());

    expect(mockState.clearAll).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
    window.location = originalLocation;
  });

  // ── Activity reset ──

  it('resets warning and timers on user activity', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    renderHook(() => useAuth());

    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockState.updateActivity).toHaveBeenCalled();
    expect(mockState.setSessionTimeoutWarning).toHaveBeenCalledWith(false);
  });

  it('debounces activity events (5s cooldown)', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    renderHook(() => useAuth());

    act(() => {
      window.dispatchEvent(new Event('mousemove'));
      window.dispatchEvent(new Event('keydown'));
      window.dispatchEvent(new Event('scroll'));
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockState.updateActivity).toHaveBeenCalled();
  });

  // ── Cleanup ──

  it('cleans up timers and listeners on unmount', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    const { unmount } = renderHook(() => useAuth());

    unmount();

    act(() => {
      vi.advanceTimersByTime(IDLE_EXPIRE_MS);
    });

    expect(true).toBe(true);
  });

  it('cleans up timers when user becomes unauthenticated', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    const { rerender } = renderHook(() => useAuth());

    mockState.token = null;
    mockGetState.mockReturnValue({ ...mockState, token: null });
    rerender();

    act(() => {
      vi.advanceTimersByTime(IDLE_EXPIRE_MS);
    });
  });

  // ── continueSession ──

  it('continueSession calls api and resets timers', async () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.continueSession();
    });

    expect(mockState.updateActivity).toHaveBeenCalled();
    expect(mockState.setSessionTimeoutWarning).toHaveBeenCalledWith(false);
  });

  it('continueSession sets extendingSession=true then false', async () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.continueSession();
    });

    expect(result.current.extendingSession).toBe(false);
  });

  it('continueSession auto-logouts on api failure', async () => {
    const apiClient = await import('../lib/api-client');
    apiClient.default.get.mockRejectedValueOnce(new Error('Network error'));

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    mockState.token = 'jwt';
    mockState.lastActivity = null;
    mockGetState.mockReturnValue({ ...mockState, token: 'jwt' });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.continueSession();
    });

    expect(mockState.clearAll).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
    window.location = originalLocation;
  });

  // ── logout ──

  it('logout calls store logout and redirects to /login', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    mockState.token = 'jwt';
    mockState.lastActivity = null;
    mockGetState.mockReturnValue({ ...mockState, token: 'jwt', logout: vi.fn().mockResolvedValue() });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(window.location.href).toBe('/login');
    window.location = originalLocation;
  });

  // ── Warning when already elapsed on mount ──

  it('shows warning immediately when lastActivity is between 25m and 30m ago', () => {
    const twentySevenMinutesAgo = Date.now() - 27 * 60 * 1000;
    mockState.token = 'jwt';
    mockState.lastActivity = twentySevenMinutesAgo;

    renderHook(() => useAuth());

    expect(mockState.setSessionTimeoutWarning).toHaveBeenCalledWith(true);
  });

  it('sets expire timer for remaining time when warning already elapsed on mount', () => {
    const twentySevenMinutesAgo = Date.now() - 27 * 60 * 1000;
    mockState.token = 'jwt';
    mockState.lastActivity = twentySevenMinutesAgo;
    mockGetState.mockReturnValue({ ...mockState, token: 'jwt' });

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    renderHook(() => useAuth());

    act(() => {
      vi.advanceTimersByTime(3 * 60 * 1000);
    });

    expect(mockState.clearAll).toHaveBeenCalled();
    window.location = originalLocation;
  });

  // ── Activity events listened ──

  it('attaches listeners for mousemove, keydown, scroll, touchstart', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;

    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useAuth());

    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });

    addSpy.mockRestore();
  });

  it('removes activity listeners on unmount', () => {
    mockState.token = 'jwt';
    mockState.lastActivity = null;

    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));

    removeSpy.mockRestore();
  });
});
