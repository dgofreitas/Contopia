// Contopia — Parent API Client (axios with interceptors)
// Separate from child api-client — uses parent-auth-store tokens
// NFR-PRV-01: Parent auth fully isolated from child auth
import axios from 'axios';
import useParentAuthStore from '../stores/parent-auth-store';

const parentApiClient = axios.create({ baseURL: '/api/parent' });

// Refresh queue for concurrent requests while refreshing
let isRefreshing = false;
let refreshQueue = [];

function processRefreshQueue(error, token = null) {
  refreshQueue.forEach((cb) => cb(error, token));
  refreshQueue = [];
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

      const { parentRefreshToken } = useParentAuthStore.getState();

      if (!parentRefreshToken) {
        useParentAuthStore.getState().parentClearAll();
        window.location.href = '/parent';
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
        const { data } = await parentApiClient.post('/refresh', {
          refreshToken: parentRefreshToken,
        });

        const newAccessToken = data.data.accessToken;
        useParentAuthStore.getState().setParentToken(newAccessToken);
        useParentAuthStore.getState().updateParentActivity();

        processRefreshQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return parentApiClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
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