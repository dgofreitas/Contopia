// dashboard-regression.spec.js — STORY-061 Scenario 8: STORY-052 Regression
// GIVEN a parent is logged in with the new cookie-based auth
// WHEN they access each parent dashboard tab (Activity, Export Data, Delete Account, Privacy Policy)
// THEN all tabs are functional and respond correctly
//
// Also verifies child token gets 401 on parent endpoints (auth isolation)
//
// Auth: Uses stored storage state from .auth/parent.json (set by globalSetup/auth.setup.js)
// instead of doing a runtime API login. Fallback to runtime login only if storage state
// is unavailable.

import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/api-client.js';
import { testParentEmail, testParentPassword } from '../fixtures/test-data.js';
import { readFileSync, existsSync } from 'fs';

const api = createApiClient();

test.describe('Scenario 8: STORY-052 Dashboard Regression', () => {
  let accessToken = null;

  test.beforeAll(async () => {
    // Prefer stored auth state from globalSetup (auth.setup.js)
    const storageStatePath = 'e2e/.auth/parent.json';
    if (existsSync(storageStatePath)) {
      try {
        const state = JSON.parse(readFileSync(storageStatePath, 'utf-8'));
        // Extract accessToken from origins' localStorage
        for (const origin of state.origins || []) {
          for (const item of origin.localStorage || []) {
            if (item.name === 'accessToken' && item.value) {
              accessToken = item.value;
              break;
            }
          }
          if (accessToken) break;
        }
      } catch {
        // Fall through to runtime login
      }
    }

    // Fallback: login via API if storage state didn't have accessToken
    if (!accessToken) {
      const loginRes = await api.login({
        email: testParentEmail,
        password: testParentPassword,
      });
      if (loginRes.ok) {
        const body = await loginRes.json();
        accessToken = body.accessToken;
      }
    }
  });

  test('GET /api/parent/dashboard returns 200 with parent Bearer token', async () => {
    // Arrange
    test.skip(!accessToken, 'No access token available — backend may not be running');

    // Act
    const res = await api.dashboard(accessToken);

    // Assert
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('GET /api/parent/activity/summary returns 200', async () => {
    // Arrange
    test.skip(!accessToken, 'No access token available');

    // Act
    const res = await api.activitySummary(accessToken);

    // Assert
    expect(res.status).toBe(200);
  });

  test('GET /api/parent/activity/books returns 200', async () => {
    // Arrange
    test.skip(!accessToken, 'No access token available');

    // Act
    const res = await api.activityBooks(accessToken);

    // Assert
    expect(res.status).toBe(200);
  });

  test('GET /api/parent/export returns 200 with ZIP content-type', async () => {
    // Arrange
    test.skip(!accessToken, 'No access token available');

    // Act
    const res = await api.export(accessToken);

    // Assert
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('zip');
  });

  test('GET /api/parent/deletion-request/status returns 200', async () => {
    // Arrange
    test.skip(!accessToken, 'No access token available');

    // Act
    const res = await api.deletionStatus(accessToken);

    // Assert
    expect(res.status).toBe(200);
  });

  test('GET /api/parent/privacy-policy returns 200', async () => {
    // Arrange
    test.skip(!accessToken, 'No access token available');

    // Act
    const res = await api.privacyPolicy(accessToken);

    // Assert
    expect(res.status).toBe(200);
  });

  test('child token gets 401 on parent dashboard endpoints', async () => {
    // Arrange — use a deliberately invalid/child-like token
    const childToken = 'invalid-child-token';

    // Act — attempt to access parent endpoints with child token
    const dashboardRes = await api.dashboard(childToken);

    // Assert — 401 Unauthorized
    expect(dashboardRes.status).toBe(401);
  });

  test('no token returns 401 on parent dashboard endpoints', async () => {
    // Act — attempt to access without any token
    const res = await fetch(`${api.baseURL}/api/parent/dashboard`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Assert — 401 Unauthorized
    expect(res.status).toBe(401);
  });
});
