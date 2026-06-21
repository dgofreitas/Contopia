// Contopia — Parent API Client (axios with interceptors)
// Separate from child api-client — uses parent-auth-store tokens
// NFR-PRV-01: Parent auth fully isolated from child auth
// STORY-064: Network-error backoff retry + online event retry (NFR-AVL-04)
import axios from 'axios';
import useParentAuthStore from '../stores/parent-auth-store';

const parentApiClient = axios.create({ baseURL: '/api/parent', withCredentials: true });

// Refresh queue for concurrent requests while refreshing
let isRefreshing = false;
let refreshQueue = [];

function processRefreshQueue(error, token = null) {
  refreshQueue.forEach((cb) => cb(error, token));
  refreshQueue = [];
}

// STORY-064 (G3/G4): Network-error retry state.
// When refresh fails due to a network error (no response), we do NOT clear the
// session or redirect. Instead we retry with exponential backoff (1s, 2s, 4s) up
// to 3 times. If all retries fail, we reject so the caller can show cached/fallback
// UI (NFR-AVL-04). When the browser reconnects (`online` event), the pending
// retry fires immediately rather than waiting for the current backoff timer.
const REFRESH_MAX_RETRIES = 3;
const REFRESH_BACKOFF_MS = [1000, 2000, 4000];
let pendingRefreshRetry = null; // () => Promise, retried on `online`

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (pendingRefreshRetry) {
      const retry = pendingRefreshRetry;
      pendingRefreshRetry = null;
      retry();
    }
  });
}

// Performs a POST /refresh with up to 3 exponential-backoff retries on network
// errors. Resolves with { data } on success. Rejects with the last error on a
// 401 (cookie invalid — caller clears session) or after exhausting retries.
async function refreshWithBackoff() {
  let lastError = null;
  for (let attempt = 0; attempt < REFRESH_MAX_RETRIES; attempt += 1) {
    try {
      const { data } = await parentApiClient.post('/refresh', {}, { withCredentials: true });
      return data;
    } catch (error) {
      lastError = error;
      // 401 from /refresh means the httpOnly cookie is invalid/expired — no point
      // retrying. Let the caller clear the session and redirect.
      if (error.response) throw error;
      // Network error (no response) — backoff and retry unless this was the last attempt.
      if (attempt < REFRESH_MAX_RETRIES - 1) {
        const delay = REFRESH_BACKOFF_MS[attempt];
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, delay);
          // If we go back online before the timer fires, retry immediately and
          // drop the pending callback so the online listener stays clean.
          pendingRefreshRetry = () => {
            clearTimeout(timer);
            resolve();
          };
        });
        pendingRefreshRetry = null;
      }
    }
  }
  throw lastError;
}

// Request interceptor: attach parent Bearer token
parentApiClient.interceptors.request.use((config) => {
  const { parentToken } = useParentAuthStore.getState();
  if (parentToken) {
    config.headers.Authorization = `Bearer ${parentToken}`;
  }
  return config;
});

// Response interceptor: detect session expiring header + handle 401 → attempt parent refresh
parentApiClient.interceptors.response.use(
  (response) => {
    // STORY-060: Check for server-driven session expiry warning
    const expiringHeader = response.headers['x-session-expiring'];
    if (expiringHeader) {
      const remainingSeconds = Number(expiringHeader);
      if (!Number.isNaN(remainingSeconds) && remainingSeconds > 0) {
        useParentAuthStore.getState().setSessionExpiring(remainingSeconds);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 — attempt silent refresh for parent session
    if (error.response?.status === 401 && !originalRequest._retry) {
      // STORY-060: SESSION_EXPIRED → clear all and redirect with query param
      if (error.response?.data?.error?.code === 'SESSION_EXPIRED') {
        useParentAuthStore.getState().parentClearAll();
        window.location.href = '/parent?expired=true';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((refreshError, newToken) => {
            if (refreshError) return reject(refreshError);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(parentApiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // STORY-062: refresh token lives in an httpOnly cookie (path /api/parent).
        // The browser sends it automatically with withCredentials. No body needed.
        // STORY-064: Use refreshWithBackoff so transient network errors during refresh
        // do NOT kick the parent out — retry with backoff, keep the session (NFR-AVL-04).
        const data = await refreshWithBackoff();

        const newAccessToken = data.data.accessToken;
        useParentAuthStore.getState().setParentToken(newAccessToken);
        useParentAuthStore.getState().updateParentActivity();

        processRefreshQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return parentApiClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        // STORY-064 (G3): Distinguish network error (no response) from 401.
        // Network error → do NOT clearAll or redirect; reject so the caller can
        // show cached/fallback UI and retry when back online (NFR-AVL-04).
        if (!refreshError.response) {
          useParentAuthStore.getState().setSessionExpiring(0); // signal degraded mode
          return Promise.reject(refreshError);
        }
        // Refresh returned 401 (or another HTTP error) — cookie invalid, clear and redirect.
        useParentAuthStore.getState().parentClearAll();
        window.location.href = '/parent';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // General error handling for 4xx/5xx and network errors
    if (error.response?.data?.error?.code) {
      const { code, message } = error.response.data.error;
      import('../stores/error-store.js').then(({ useErrorStore }) => {
        useErrorStore.getState().addToast(code, message);
      });
    } else if (!error.response) {
      import('../stores/error-store.js').then(({ useErrorStore }) => {
        useErrorStore.getState().addToast('NETWORK_ERROR', null);
      });
    }

    return Promise.reject(error);
  }
);

export default parentApiClient;