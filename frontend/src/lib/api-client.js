// Contopia — API Client (axios with interceptors)
// Silent refresh on 401, session timeout warning on 419
import axios from 'axios';
import useAuthStore from '../stores/auth-store.js';

const apiClient = axios.create({ baseURL: '/api' });

// Refresh queue for concurrent requests while refreshing
let isRefreshing = false;
let refreshQueue = [];

function processRefreshQueue(error, token = null) {
  refreshQueue.forEach((cb) => cb(error, token));
  refreshQueue = [];
}

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 → attempt refresh; 419 → timeout warning
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 — attempt silent refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refreshToken } = useAuthStore.getState();

      if (!refreshToken) {
        // No refresh token available — force logout
        useAuthStore.getState().clearAll();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request while another refresh is in flight
        return new Promise((resolve, reject) => {
          refreshQueue.push((refreshError, newToken) => {
            if (refreshError) {
              return reject(refreshError);
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh', {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;

        useAuthStore.getState().setToken(newAccessToken);
        if (newRefreshToken) {
          useAuthStore.getState().setRefreshToken(newRefreshToken);
        }
        useAuthStore.getState().updateActivity();

        processRefreshQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        useAuthStore.getState().clearAll();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 419 — session timeout warning from server
    if (error.response?.status === 419) {
      useAuthStore.getState().setSessionTimeoutWarning(true);
    }

    return Promise.reject(error);
  }
);

export default apiClient;