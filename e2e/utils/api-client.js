// api-client.js — Supertest-based API helper for E2E tests (STORY-061)
//
// Provides a thin wrapper around fetch for making direct API calls to the
// backend from Playwright test fixtures or global setup.
// Use this when you need to seed data, verify API responses, or manipulate
// backend state directly without going through the browser.

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

/**
 * Create an API client for interacting with the backend directly.
 *
 * @param {string} [baseURL] - Backend base URL (defaults to BACKEND_URL env or localhost:8000)
 * @returns {object} API client with helper methods
 */
export function createApiClient(baseURL = BACKEND_URL) {
  /**
   * Make a raw fetch request to the backend.
   *
   * @param {string} method - HTTP method
   * @param {string} path - URL path (e.g., '/api/auth/register')
   * @param {object} [options] - Request options
   * @param {object} [options.body] - JSON body for POST/PUT/PATCH
   * @param {string} [options.token] - Bearer token for Authorization header
   * @param {object} [options.headers] - Additional headers
   * @returns {Promise<Response>} Fetch Response object
   */
  async function request(method, path, options = {}) {
    const { body, token, headers: extraHeaders = {} } = options;
    const url = `${baseURL}${path}`;

    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions = {
      method,
      headers,
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(body);
    }

    return fetch(url, fetchOptions);
  }

  /**
   * Parse a response as JSON, throwing if status is not ok.
   * Useful for tests that expect success.
   */
  async function expectOk(response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Expected 2xx, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }
    return data;
  }

  /**
   * Parse a response as JSON, returning it regardless of status.
   * Useful for tests that expect errors.
   */
  async function parseJson(response) {
    return response.json();
  }

  return {
    baseURL,

    // --- Auth endpoints ---

    /** POST /api/auth/register */
    register: (data) =>
      request('POST', '/api/auth/register', { body: data }),

    /** POST /api/parent/login */
    login: (data) =>
      request('POST', '/api/parent/login', { body: data }),

    /** POST /api/parent/logout */
    logout: (token) =>
      request('POST', '/api/parent/logout', { token }),

    /** POST /api/parent/refresh (uses cookie via fetch credentials) */
    refresh: () =>
      request('POST', '/api/parent/refresh', {
        headers: { ...(fetch.credentials != null ? {} : {}) },
      }),

    /** GET /api/parent/me */
    me: (token) =>
      request('GET', '/api/parent/me', { token }),

    /** POST /api/auth/child-login */
    childLogin: (data, token) =>
      request('POST', '/api/auth/child-login', { body: data, token }),

    // --- Dashboard endpoints ---

    /** GET /api/parent/dashboard */
    dashboard: (token) =>
      request('GET', '/api/parent/dashboard', { token }),

    /** GET /api/parent/activity/summary */
    activitySummary: (token) =>
      request('GET', '/api/parent/activity/summary', { token }),

    /** GET /api/parent/activity/books */
    activityBooks: (token) =>
      request('GET', '/api/parent/activity/books', { token }),

    /** GET /api/parent/export */
    export: (token) =>
      request('GET', '/api/parent/export', { token }),

    /** GET /api/parent/deletion-request/status */
    deletionStatus: (token) =>
      request('GET', '/api/parent/deletion-request/status', { token }),

    /** POST /api/parent/deletion-request */
    createDeletionRequest: (token, body = {}) =>
      request('POST', '/api/parent/deletion-request', { body, token }),

    /** POST /api/parent/deletion-request/cancel */
    cancelDeletionRequest: (token) =>
      request('POST', '/api/parent/deletion-request/cancel', { token }),

    /** GET /api/parent/privacy-policy */
    privacyPolicy: (token) =>
      request('GET', '/api/parent/privacy-policy', { token }),

    // Utility helpers
    expectOk,
    parseJson,
  };
}

export default createApiClient;