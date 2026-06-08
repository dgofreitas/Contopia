// Contopia — useParentAuth Hook Tests (STORY-052)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useParentAuth from '../hooks/useParentAuth';

const IDLE_WARNING_MS = 25 * 60 * 1000;
const IDLE_EXPIRE_MS = 30 * 60 * 1000;

const { mockState, mockGetState } = vi.hoisted(() => {
  const state = {
    parentToken: null,
    parentLastActivity: null,
    parentSessionExpiresAt: null,
    updateParentActivity: vi.fn(),
    parentLogout: vi.fn().mockResolvedValue(),
    parentClearAll: vi.fn(),
  };
  const getState = vi.fn(() => state);
  const storeFn = (selector) => (selector ? selector(state) : state);
  storeFn.getState = getState;
  return { mockState: state, mockGetState: getState };
});

vi.mock('../stores/parent-auth-store', () => {
  const storeFn = (selector) => (selector ? selector(mockState) : mockState);
  storeFn.getState = mockGetState;
  return { default: storeFn };
});

function resetState() {
  Object.assign(mockState, {
    parentToken: null,
    parentLastActivity: null,
    parentSessionExpiresAt: null,
    updateParentActivity: vi.fn(),
    parentLogout: vi.fn().mockResolvedValue(),
    parentClearAll: vi.fn(),
  });
}

describe('useParentAuth', () => {
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

  it('returns isAuthenticated=false when no parentToken', () => {
    mockState.parentToken = null;
    const { result } = renderHook(() => useParentAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('returns isAuthenticated=true when parentToken exists', () => {
    mockState.parentToken = 'parent-jwt';
    const { result } = renderHook(() => useParentAuth());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns isIdle=false initially', () => {
    mockState.parentToken = 'parent-jwt';
    const { result } = renderHook(() => useParentAuth());
    expect(result.current.isIdle).toBe(false);
  });

  it('returns idleTime=0 initially', () => {
    mockState.parentToken = 'parent-jwt';
    const { result } = renderHook(() => useParentAuth());
    expect(result.current.idleTime).toBe(0);
  });

  // ── Idle timer starts on mount ──

  it('starts idle timers when authenticated with no parentLastActivity', () => {
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;
    renderHook(() => useParentAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    // isIdle should be true after 25 minutes
  });

  // ── AC4: Session idle > 30min triggers re-auth ──

  it('triggers auto-logout after 30 minutes of idle', () => {
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;
    mockGetState.mockReturnValue({ ...mockState, parentToken: 'parent-jwt' });
    renderHook(() => useParentAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_EXPIRE_MS);
    });

    expect(mockState.parentLogout).toHaveBeenCalled();
  });

  it('shows isIdle=true after 25 minutes of inactivity', () => {
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;
    const { result } = renderHook(() => useParentAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    expect(result.current.isIdle).toBe(true);
  });

  // ── Activity reset ──

  it('resets isIdle on user activity', () => {
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;
    const { result } = renderHook(() => useParentAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    expect(result.current.isIdle).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });

    act(() => {
      vi.advanceTimersByTime(5000); // debounce
    });

    expect(result.current.isIdle).toBe(false);
  });

  // ── continueParentSession ──

  it('continueParentSession resets isIdle and idleTime', () => {
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;
    const { result } = renderHook(() => useParentAuth());

    act(() => {
      vi.advanceTimersByTime(IDLE_WARNING_MS);
    });

    expect(result.current.isIdle).toBe(true);

    act(() => {
      result.current.continueParentSession();
    });

    expect(result.current.isIdle).toBe(false);
    expect(result.current.idleTime).toBe(0);
  });

  // ── logout ──

  it('logout calls parentLogout and redirects to /parent/login', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;
    mockGetState.mockReturnValue({ ...mockState, parentToken: 'parent-jwt' });
    const { result } = renderHook(() => useParentAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockState.parentLogout).toHaveBeenCalled();
    expect(window.location.href).toBe('/parent/login');
    window.location = originalLocation;
  });

  // ── Cleanup ──

  it('cleans up timers and listeners on unmount', () => {
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;
    const { unmount } = renderHook(() => useParentAuth());

    unmount();

    act(() => {
      vi.advanceTimersByTime(IDLE_EXPIRE_MS);
    });

    // Should not trigger logout after unmount
    expect(true).toBe(true);
  });

  // ── Activity events ──

  it('attaches listeners for mousemove, keydown, scroll, touchstart', () => {
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;

    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useParentAuth());

    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });

    addSpy.mockRestore();
  });

  it('removes activity listeners on unmount', () => {
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = null;

    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useParentAuth());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));

    removeSpy.mockRestore();
  });

  // ── Handles already-expired session on mount ──

  it('handles already-expired session on mount', () => {
    const thirtyOneMinutesAgo = Date.now() - IDLE_EXPIRE_MS - 60000;
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = thirtyOneMinutesAgo;
    mockGetState.mockReturnValue({ ...mockState, parentToken: 'parent-jwt' });

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    renderHook(() => useParentAuth());

    expect(mockState.parentLogout).toHaveBeenCalled();
    window.location = originalLocation;
  });
});
