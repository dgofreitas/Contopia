// logout.spec.js — STORY-061 Scenario 3: Parent Logout
// GIVEN a parent is on the dashboard
// WHEN they click "Logout"
// THEN they are redirected to /login, the cookie is cleared, and the session is revoked in Redis

import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/api-client.js';
import { testParentEmail, testParentPassword } from '../fixtures/test-data.js';

const api = createApiClient();

test.describe('Scenario 3: Parent Logout', () => {
  test('should logout, clear cookie, and redirect to /login', async ({ page }) => {
    // Arrange — login first
    await page.goto('/login');
    await page.waitForSelector('form');
    await page.fill('input[name="email"]', testParentEmail);
    await page.fill('input[name="password"]', testParentPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/parent/dashboard', { timeout: 15_000 });

    // Verify cookie exists before logout
    let cookies = await page.context().cookies();
    let refreshCookie = cookies.find((c) => c.name === 'parentRefreshToken');
    expect(refreshCookie).toBeDefined();

    // Intercept the logout API call
    const logoutResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/parent/logout') && res.request().method() === 'POST',
    );

    // Act — click Logout button
    await page.click('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');

    // Assert — POST /api/parent/logout returns 200
    const logoutResponse = await logoutResponsePromise;
    expect(logoutResponse.status()).toBe(200);

    // Assert — redirect to /login
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('/login');

    // Assert — parentRefreshToken cookie cleared
    cookies = await page.context().cookies();
    refreshCookie = cookies.find((c) => c.name === 'parentRefreshToken');
    expect(refreshCookie).toBeUndefined();
  });

  test('should revoke Redis session on logout', async ({ page }) => {
    // Arrange — login first
    await page.goto('/login');
    await page.waitForSelector('form');
    await page.fill('input[name="email"]', testParentEmail);
    await page.fill('input[name="password"]', testParentPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/parent/dashboard', { timeout: 15_000 });

    // Get access token from localStorage or API
    const accessToken = await page.evaluate(() => {
      // Try to get token from various storage locations
      return localStorage.getItem('accessToken') ||
             sessionStorage.getItem('accessToken') || null;
    });

    // Act — logout via UI
    const logoutResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/parent/logout') && res.request().method() === 'POST',
    );
    await page.click('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');
    await logoutResponsePromise;
    await page.waitForURL('**/login', { timeout: 10_000 });

    // Assert — old access token no longer works (session revoked)
    if (accessToken) {
      const meResponse = await api.me(accessToken);
      expect(meResponse.status).toBe(401);
    }
  });
});
