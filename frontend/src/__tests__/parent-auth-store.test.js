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
});
