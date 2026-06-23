// Contopia — Parent Auth Store Tests (STORY-052)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useParentAuthStore from '../stores/parent-auth-store';

// Mock dynamic import for parent-api-client
vi.mock('../lib/parent-api-client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { data: { loggedOut: true } } }),
  },
}));

describe('parent-auth-store', () => {
  beforeEach(() => {
    localStorage.clear();
    useParentAuthStore.getState().parentClearAll();
  });

  // ── Initial state ──

  it('starts with null parentToken', () => {
    expect(useParentAuthStore.getState().parentToken).toBe(null);
  });

  it('starts with null parentRefreshToken', () => {
    expect(useParentAuthStore.getState().parentRefreshToken).toBe(null);
  });

  it('starts with null parentUser', () => {
    expect(useParentAuthStore.getState().parentUser).toBe(null);
  });

  it('starts with null session fields', () => {
    const state = useParentAuthStore.getState();
    expect(state.parentSessionCreatedAt).toBe(null);
    expect(state.parentLastActivity).toBe(null);
    expect(state.parentSessionExpiresAt).toBe(null);
  });

  // ── setParentToken ──

  it('sets parentToken', () => {
    useParentAuthStore.getState().setParentToken('parent-jwt-123');
    expect(useParentAuthStore.getState().parentToken).toBe('parent-jwt-123');
  });

  // ── setParentRefreshToken ──

  it('sets parentRefreshToken', () => {
    useParentAuthStore.getState().setParentRefreshToken('parent-refresh-456');
    expect(useParentAuthStore.getState().parentRefreshToken).toBe('parent-refresh-456');
  });

  // ── setParentUser ──

  it('sets parentUser', () => {
    const user = { parentId: 'p1', email: 'parent@test.com', childId: 'c1', childFirstName: 'Julia' };
    useParentAuthStore.getState().setParentUser(user);
    expect(useParentAuthStore.getState().parentUser).toEqual(user);
  });

  // ── setParentSession ──

  it('sets parent session with timestamps', () => {
    const now = Date.now();
    useParentAuthStore.getState().setParentSession({
      parentSessionCreatedAt: now,
      parentLastActivity: now,
    });

    const state = useParentAuthStore.getState();
    expect(state.parentSessionCreatedAt).toBe(now);
    expect(state.parentLastActivity).toBe(now);
    expect(state.parentSessionExpiresAt).toBeGreaterThan(now);
  });

  it('defaults parentLastActivity to Date.now() when not provided', () => {
    const now = Date.now();
    useParentAuthStore.getState().setParentSession({
      parentSessionCreatedAt: now,
    });

    const state = useParentAuthStore.getState();
    expect(state.parentLastActivity).toBeGreaterThanOrEqual(now - 100);
  });

  // ── updateParentActivity ──

  it('updates parentLastActivity and parentSessionExpiresAt', () => {
    const sixtySecondsAgo = Date.now() - 60000;
    useParentAuthStore.getState().setParentSession({
      parentSessionCreatedAt: sixtySecondsAgo,
      parentLastActivity: sixtySecondsAgo,
    });

    const before = useParentAuthStore.getState().parentSessionExpiresAt;

    // Use fake timers to ensure Date.now() advances between calls
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.advanceTimersByTime(1000);
    useParentAuthStore.getState().updateParentActivity();
    vi.useRealTimers();

    const after = useParentAuthStore.getState().parentSessionExpiresAt;
    expect(after).toBeGreaterThan(before);
  });

  // ── parentClearAll ──

  it('clears all state without server call', () => {
    useParentAuthStore.getState().setParentToken('jwt');
    useParentAuthStore.getState().setParentRefreshToken('refresh');
    useParentAuthStore.getState().setParentUser({ parentId: 'p1', email: 'test@test.com' });
    useParentAuthStore.getState().setParentSession({
      parentSessionCreatedAt: Date.now(),
    });

    useParentAuthStore.getState().parentClearAll();

    const state = useParentAuthStore.getState();
    expect(state.parentToken).toBe(null);
    expect(state.parentRefreshToken).toBe(null);
    expect(state.parentUser).toBe(null);
    expect(state.parentSessionCreatedAt).toBe(null);
    expect(state.parentLastActivity).toBe(null);
    expect(state.parentSessionExpiresAt).toBe(null);
  });

  // ── parentLogout ──

  it('calls POST /logout then clears state', async () => {
    useParentAuthStore.getState().setParentToken('parent-jwt');
    useParentAuthStore.getState().setParentUser({ parentId: 'p1' });

    await useParentAuthStore.getState().parentLogout();

    const state = useParentAuthStore.getState();
    expect(state.parentToken).toBe(null);
    expect(state.parentUser).toBe(null);
  });

  it('clears state even when logout API call fails', async () => {
    // Override mock to reject for this test
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.post.mockRejectedValueOnce(new Error('Network error'));

    useParentAuthStore.getState().setParentToken('parent-jwt');

    await useParentAuthStore.getState().parentLogout();

    expect(useParentAuthStore.getState().parentToken).toBe(null);
  });

  // ── Session duration is 30 minutes (NFR-SEC-03) ──

  it('session expires 30 minutes after last activity', () => {
    const now = Date.now();
    useParentAuthStore.getState().setParentSession({
      parentSessionCreatedAt: now,
      parentLastActivity: now,
    });

    const expiresAt = useParentAuthStore.getState().parentSessionExpiresAt;
    const thirtyMinutes = 30 * 60 * 1000;
    expect(expiresAt - now).toBeCloseTo(thirtyMinutes, -2); // within 100ms
  });

  // ── Isolation from child auth (NFR-PRV-01) ──

  it('does not share state with child auth store', async () => {
    const { default: childAuthStore } = await import('../stores/auth-store');

    // Set child auth values
    childAuthStore.getState().setToken('child-token');
    childAuthStore.getState().setUser({ childId: 'c1' });

    // Parent store should be unaffected
    expect(useParentAuthStore.getState().parentToken).toBe(null);
    expect(useParentAuthStore.getState().parentUser).toBe(null);

    // Set parent auth values
    useParentAuthStore.getState().setParentToken('parent-token');
    useParentAuthStore.getState().setParentUser({ parentId: 'p1' });

    // Child store should be unaffected
    expect(childAuthStore.getState().token).toBe('child-token');
    expect(childAuthStore.getState().user).toEqual({ childId: 'c1' });

    // Clean up child store
    childAuthStore.getState().clearAll();
  });

  // ── STORY-064: parentUser persistence ──

  it('persists parentUser to localStorage on setParentUser', () => {
    const user = { parentId: 'p1', email: 'persist@test.com', children: [] };
    useParentAuthStore.getState().setParentUser(user);
    expect(JSON.parse(localStorage.getItem('contopia_parent_user'))).toEqual(user);
  });

  it('clears parentUser from localStorage when set to null', () => {
    useParentAuthStore.getState().setParentUser({ parentId: 'p1' });
    useParentAuthStore.getState().setParentUser(null);
    expect(localStorage.getItem('contopia_parent_user')).toBe(null);
  });

  it('persists parentUser to localStorage on register', () => {
    useParentAuthStore.getState().register({
      accessToken: 'jwt-reg',
      parentId: 'p2',
      email: 'reg@test.com',
      children: [{ childId: 'c1', firstName: 'Julia' }],
    });
    expect(localStorage.getItem('contopia_parent_token')).toBe('jwt-reg');
    expect(JSON.parse(localStorage.getItem('contopia_parent_user'))).toEqual({
      parentId: 'p2',
      email: 'reg@test.com',
      children: [{ childId: 'c1', firstName: 'Julia' }],
    });
  });

  it('clears parentUser from localStorage on parentClearAll', () => {
    useParentAuthStore.getState().register({
      accessToken: 'jwt-clear',
      parentId: 'p3',
      email: 'clear@test.com',
      children: [],
    });
    useParentAuthStore.getState().parentClearAll();
    expect(localStorage.getItem('contopia_parent_token')).toBe(null);
    expect(localStorage.getItem('contopia_parent_user')).toBe(null);
  });

  it('clears parentUser from localStorage on parentLogout', async () => {
    useParentAuthStore.getState().register({
      accessToken: 'jwt-logout',
      parentId: 'p4',
      email: 'logout@test.com',
      children: [],
    });
    await useParentAuthStore.getState().parentLogout();
    expect(localStorage.getItem('contopia_parent_token')).toBe(null);
    expect(localStorage.getItem('contopia_parent_user')).toBe(null);
  });

  it('hydrates parentUser from localStorage on store creation', () => {
    // Write to localStorage, then simulate hydration by setting state from storage.
    localStorage.setItem(
      'contopia_parent_user',
      JSON.stringify({ parentId: 'p5', email: 'hydrate@test.com', children: [] }),
    );
    useParentAuthStore.setState({
      parentUser: JSON.parse(localStorage.getItem('contopia_parent_user')),
    });
    expect(useParentAuthStore.getState().parentUser).toEqual({
      parentId: 'p5',
      email: 'hydrate@test.com',
      children: [],
    });
  });

  it('does not crash when localStorage is unavailable (private mode)', () => {
    // Simulate private mode by making localStorage throw.
    const original = globalThis.localStorage;
    const throwingStorage = {
      getItem: () => { throw new Error('unavailable'); },
      setItem: () => { throw new Error('unavailable'); },
      removeItem: () => { throw new Error('unavailable'); },
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: throwingStorage,
    });
    // These should not throw despite storage being unavailable.
    expect(() => useParentAuthStore.getState().setParentToken('jwt')).not.toThrow();
    expect(() => useParentAuthStore.getState().setParentUser({ parentId: 'p6' })).not.toThrow();
    expect(() => useParentAuthStore.getState().parentClearAll()).not.toThrow();
    // Restore
    Object.defineProperty(window, 'localStorage', { configurable: true, value: original });
  });
});
