// Contopia — Parent Auth Store (Zustand)
// STORY-062: parentToken persists in localStorage (adult token — COPPA allows;
// child token stays memory-only in a separate store).
// STORY-064: parentUser also persisted to localStorage so a page refresh shows the
// sidebar email immediately without waiting for a /me round-trip. parentUser contains
// only { parentId, email, children } — no secrets (COPPA: parent data, not child).
// NFR-PRV-01: Completely separate from child auth-store
import { create } from 'zustand';

const PARENT_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes (NFR-SEC-03)
const PARENT_TOKEN_STORAGE_KEY = 'contopia_parent_token';
const PARENT_USER_STORAGE_KEY = 'contopia_parent_user';

function readStoredToken() {
  try {
    return localStorage.getItem(PARENT_TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function writeStoredToken(token) {
  try {
    if (token) localStorage.setItem(PARENT_TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(PARENT_TOKEN_STORAGE_KEY);
  } catch {
    // storage unavailable (private mode) — fall back to memory-only
  }
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(PARENT_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user) {
  try {
    if (user) localStorage.setItem(PARENT_USER_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(PARENT_USER_STORAGE_KEY);
  } catch {
    // storage unavailable (private mode) — fall back to memory-only
  }
}

const useParentAuthStore = create((set, get) => ({
  // STORY-062: hydrate parentToken from localStorage so a page refresh keeps the
  // parent logged in. The refresh token lives in an httpOnly cookie (never JS-readable).
  // STORY-064: hydrate parentUser too so the sidebar renders email immediately.
  parentToken: readStoredToken(),
  parentRefreshToken: null,
  parentUser: readStoredUser(),

  // Session tracking (NFR-SEC-03: 30-min idle timeout)
  parentSessionCreatedAt: null,
  parentLastActivity: null,
  parentSessionExpiresAt: null,

  // STORY-060: Server-driven session expiry warning
  sessionExpiring: false,
  sessionExpiringSeconds: null,

  // Setters
  setParentToken: (parentToken) => {
    writeStoredToken(parentToken);
    set({ parentToken });
  },
  setParentRefreshToken: (parentRefreshToken) => set({ parentRefreshToken }),
  setParentUser: (parentUser) => {
    writeStoredUser(parentUser);
    set({ parentUser });
  },

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
    writeStoredToken(null);
    writeStoredUser(null);
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
    writeStoredToken(accessToken);
    const user = { parentId, email, children };
    writeStoredUser(user);
    set({
      parentToken: accessToken,
      parentUser: user,
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
    writeStoredToken(null);
    writeStoredUser(null);
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

// STORY-064 (G2): Cross-tab sync. The `storage` event only fires in *other* tabs
// (never the one that wrote), so there is no loop risk. When tab A logs out or
// refreshes its token, tab B immediately reflects the change — no 401 needed.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === PARENT_TOKEN_STORAGE_KEY) {
      useParentAuthStore.setState({ parentToken: e.newValue || null });
    }
    if (e.key === PARENT_USER_STORAGE_KEY) {
      let user = null;
      if (e.newValue) {
        try {
          user = JSON.parse(e.newValue);
        } catch {
          user = null;
        }
      }
      useParentAuthStore.setState({ parentUser: user });
    }
  });
}

export default useParentAuthStore;