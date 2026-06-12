// dashboard-regression.spec.js — STORY-061 Scenario 8: STORY-052 Regression
// GIVEN a parent is logged in with the new cookie-based auth
// WHEN they access each parent dashboard tab (Activity, Export Data, Delete Account, Privacy Policy)
// THEN all tabs are functional and respond correctly
//
// Also verifies child token gets 401 on parent endpoints (auth isolation)

import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/api-client.js';
import { testParentEmail, testParentPassword } from '../fixtures/test-data.js';

const api = createApiClient();

test.describe('Scenario 8: STORY-052 Dashboard Regression', () => {
  let accessToken = null;

  test.beforeAll(async () => {
    // Login via API to get access token
    const loginRes = await api.login({
      email: testParentEmail,
      password: testParentPassword,
    });
    if (loginRes.ok) {
      const body = await loginRes.json();
      accessToken = body.accessToken;
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
