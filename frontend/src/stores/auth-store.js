// Contopia — Auth Store (Zustand)
// NO PERSIST MIDDLEWARE — COPPA compliance requires memory-only storage
import { create } from 'zustand';

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const useAuthStore = create((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  onboardingComplete: false,

  // Session tracking (STORY-002)
  sessionId: null,
  sessionCreatedAt: null,
  lastActivity: null,
  sessionExpiresAt: null,
  sessionTimeoutWarning: false,

  // Existing setters
  setToken: (token) => set({ token }),
  setRefreshToken: (refreshToken) => set({ refreshToken }),
  setUser: (user) => set({ user }),
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),

  // Session setters
  setSession: ({ sessionId, sessionCreatedAt, lastActivity }) =>
    set({
      sessionId,
      sessionCreatedAt,
      lastActivity: lastActivity ?? Date.now(),
      sessionExpiresAt: Date.now() + SESSION_DURATION_MS,
      sessionTimeoutWarning: false,
    }),

  updateActivity: () =>
    set({
      lastActivity: Date.now(),
      sessionExpiresAt: Date.now() + SESSION_DURATION_MS,
    }),

  setSessionTimeoutWarning: (warning) => set({ sessionTimeoutWarning: warning }),

  // Enhanced logout: async — attempts server-side logout, then clears all state
  logout: async () => {
    const { token, sessionId } = get();
    if (token && sessionId) {
      try {
        const { default: apiClient } = await import('../lib/api-client.js');
        await apiClient.post('/auth/logout', { sessionId });
      } catch {
        // Token already invalid — still clear local state
      }
    }
    set({
      token: null,
      refreshToken: null,
      user: null,
      onboardingComplete: false,
      sessionId: null,
      sessionCreatedAt: null,
      lastActivity: null,
      sessionExpiresAt: null,
      sessionTimeoutWarning: false,
    });
  },

  // Clear all state without server call (used when refresh fails, etc.)
  clearAll: () =>
    set({
      token: null,
      refreshToken: null,
      user: null,
      onboardingComplete: false,
      sessionId: null,
      sessionCreatedAt: null,
      lastActivity: null,
      sessionExpiresAt: null,
      sessionTimeoutWarning: false,
    }),

  // Parent-initiated child session: token already issued by backend
  startSessionFromParent: ({ accessToken, childId, childFirstName, sessionId, isOnboardingComplete }) =>
    set({
      token: accessToken,
      refreshToken: null,
      user: { childId, childFirstName },
      onboardingComplete: isOnboardingComplete ?? true,
      sessionId,
      sessionCreatedAt: Date.now(),
      lastActivity: Date.now(),
      sessionExpiresAt: Date.now() + SESSION_DURATION_MS,
      sessionTimeoutWarning: false,
    }),
}));

export default useAuthStore;