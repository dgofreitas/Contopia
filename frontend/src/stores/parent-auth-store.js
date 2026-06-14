// Contopia — Parent Auth Store (Zustand)
// NO PERSIST MIDDLEWARE — COPPA compliance requires memory-only storage
// NFR-PRV-01: Completely separate from child auth-store
import { create } from 'zustand';

const PARENT_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes (NFR-SEC-03)

const useParentAuthStore = create((set, get) => ({
  parentToken: null,
  parentRefreshToken: null,
  parentUser: null,

  // Session tracking (NFR-SEC-03: 30-min idle timeout)
  parentSessionCreatedAt: null,
  parentLastActivity: null,
  parentSessionExpiresAt: null,

  // STORY-060: Server-driven session expiry warning
  sessionExpiring: false,
  sessionExpiringSeconds: null,

  // Setters
  setParentToken: (parentToken) => set({ parentToken }),
  setParentRefreshToken: (parentRefreshToken) => set({ parentRefreshToken }),
  setParentUser: (parentUser) => set({ parentUser }),

  setParentSession: ({ parentSessionCreatedAt, parentLastActivity }) => {
    set({
      parentSessionCreatedAt,
      parentLastActivity: parentLastActivity ?? Date.now(),
      parentSessionExpiresAt: Date.now() + PARENT_SESSION_DURATION_MS,
    });
    get().clearSessionExpiring();
  },

  updateParentActivity: () =>
    set({
      parentLastActivity: Date.now(),
      parentSessionExpiresAt: Date.now() + PARENT_SESSION_DURATION_MS,
    }),

  // STORY-060: Server-driven session expiry actions
  setSessionExpiring: (seconds) => set({ sessionExpiring: true, sessionExpiringSeconds: seconds }),
  clearSessionExpiring: () => set({ sessionExpiring: false, sessionExpiringSeconds: null }),

  // Parent logout: calls POST /api/parent/logout, then clears state
  parentLogout: async () => {
    const { parentToken } = get();
    if (parentToken) {
      try {
        const { default: parentApiClient } = await import('../lib/parent-api-client.js');
        await parentApiClient.post('/logout');
      } catch {
        // Token already invalid — still clear local state
      }
    }
    set({
      parentToken: null,
      parentRefreshToken: null,
      parentUser: null,
      parentSessionCreatedAt: null,
      parentLastActivity: null,
      parentSessionExpiresAt: null,
      sessionExpiring: false,
      sessionExpiringSeconds: null,
    });
  },

  // Register: set all auth state from registration response
  register: ({ accessToken, parentId, email, children }) => {
    set({
      parentToken: accessToken,
      parentUser: { parentId, email, children },
      parentSessionCreatedAt: Date.now(),
      parentLastActivity: Date.now(),
      parentSessionExpiresAt: Date.now() + PARENT_SESSION_DURATION_MS,
      sessionExpiring: false,
      sessionExpiringSeconds: null,
    });
    get().clearSessionExpiring();
  },

  // Clear all state without server call (used when refresh fails)
  parentClearAll: () => {
    set({
      parentToken: null,
      parentRefreshToken: null,
      parentUser: null,
      parentSessionCreatedAt: null,
      parentLastActivity: null,
      parentSessionExpiresAt: null,
      sessionExpiring: false,
      sessionExpiringSeconds: null,
    });
  },
}));

export default useParentAuthStore;