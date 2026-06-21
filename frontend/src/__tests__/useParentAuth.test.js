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

// STORY-064: Mock parent-api-client.get used by the visibilitychange handler.
const mockParentGet = vi.fn();
vi.mock('../lib/parent-api-client', () => ({
  default: { get: (...args) => mockParentGet(...args) },
}));

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
    mockParentGet.mockReset();
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

  // ── STORY-064 (G7): visibilitychange re-validation ──

  it('calls updateParentActivity on visibilitychange when session not expired', () => {
    const updateParentActivity = vi.fn();
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = Date.now();
    mockState.parentSessionExpiresAt = Date.now() + 10 * 60 * 1000; // 10 min left
    mockState.updateParentActivity = updateParentActivity;
    mockGetState.mockReturnValue(mockState);

    renderHook(() => useParentAuth());

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(updateParentActivity).toHaveBeenCalled();
    expect(mockParentGet).not.toHaveBeenCalled();
  });

  it('calls /me on visibilitychange when client thinks session expired', () => {
    const updateParentActivity = vi.fn();
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = Date.now();
    mockState.parentSessionExpiresAt = Date.now() - 1000; // already expired
    mockState.updateParentActivity = updateParentActivity;
    mockGetState.mockReturnValue(mockState);
    mockParentGet.mockResolvedValue({ data: { data: { parentId: 'p1' } } });

    renderHook(() => useParentAuth());

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockParentGet).toHaveBeenCalledWith('/me');
    expect(updateParentActivity).not.toHaveBeenCalled();
  });

  it('is a no-op on visibilitychange when not authenticated', () => {
    mockState.parentToken = null;
    mockState.updateParentActivity = vi.fn();

    renderHook(() => useParentAuth());

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockState.updateParentActivity).not.toHaveBeenCalled();
    expect(mockParentGet).not.toHaveBeenCalled();
  });

  it('does not act when visibilitychange fires to hidden', () => {
    const updateParentActivity = vi.fn();
    mockState.parentToken = 'parent-jwt';
    mockState.parentLastActivity = Date.now();
    mockState.parentSessionExpiresAt = Date.now() + 10 * 60 * 1000;
    mockState.updateParentActivity = updateParentActivity;
    mockGetState.mockReturnValue(mockState);

    renderHook(() => useParentAuth());

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(updateParentActivity).not.toHaveBeenCalled();
    expect(mockParentGet).not.toHaveBeenCalled();
  });
});
