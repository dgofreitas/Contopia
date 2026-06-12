// registration.spec.js — STORY-061 Scenario 1: Full Registration Flow
// GIVEN a new user visits /register
// WHEN they fill the form with valid email, password (min 4 chars), child first name, and check age consent, then submit
// THEN they are redirected to /parent/dashboard, a JWT httpOnly cookie is set, and a child account is created and active

import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/api-client.js';
import {
  testParentEmail,
  testParentPassword,
  testChildName,
  invalidEmailRegistration,
  shortPasswordRegistration,
  noConsentRegistration,
} from '../fixtures/test-data.js';

const api = createApiClient();

test.describe('Scenario 1: Full Registration Flow', () => {
  // Use a unique email per test run to avoid 409 conflicts
  const uniqueEmail = `reg-test-${Date.now()}@example.com`;
  const testPassword = testParentPassword;
  const testChild = testChildName;

  test.afterEach(async () => {
    // Cleanup: attempt to delete the created account via API
    // First login to get a token, then use deletion endpoint
    try {
      const loginRes = await api.login({ email: uniqueEmail, password: testPassword });
      if (loginRes.ok) {
        const { accessToken } = await loginRes.json();
        if (accessToken) {
          await api.createDeletionRequest(accessToken, { confirmText: 'DELETE' });
        }
      }
    } catch {
      // Account may not exist — ignore cleanup errors
    }
  });

  test('should register a new parent, set cookie, redirect to dashboard, and create active child', async ({ page }) => {
    // Arrange
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="childFirstName"]', testChild);
    await page.check('input[name="ageConsent"]');
    await page.click('button[type="submit"]');

    // Assert — redirect to /parent/dashboard
    await page.waitForURL('**/parent/dashboard', { timeout: 15_000 });
    expect(page.url()).toContain('/parent/dashboard');

    // Assert — cookie parentRefreshToken exists with correct flags
    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find((c) => c.name === 'parentRefreshToken');
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie.httpOnly).toBe(true);
    expect(refreshCookie.sameSite).toBe('Strict');
    expect(refreshCookie.path).toBe('/api/parent');

    // Assert — response body contains accessToken, parentId, email, children
    // We intercept the register response to inspect it
    const registerResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/register') && res.request().method() === 'POST',
    );
    // Re-navigate to trigger the response capture (already submitted above, but we need the response)
    // Actually, the response already happened during submit. Let's use a different approach:
    // Re-register won't work (duplicate). Instead, we check the dashboard page for parent data.

    // Navigate to /parent/me to get the user data
    const meResponse = await page.goto('/api/parent/me');
    // This is an API call, not a page — use evaluate to fetch it
    const meData = await page.evaluate(async () => {
      const res = await fetch('/api/parent/me', {
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    });

    expect(meData).toBeDefined();
    expect(meData.parentId).toBeDefined();
    expect(meData.email).toBe(uniqueEmail);
    expect(meData.children).toBeDefined();
    expect(Array.isArray(meData.children)).toBe(true);
    expect(meData.children.length).toBeGreaterThanOrEqual(1);
    expect(meData.children[0].isActive).toBe(true);
  });

  test('should reject registration with invalid email', async ({ page }) => {
    // Arrange
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act
    await page.fill('input[name="email"]', invalidEmailRegistration.email);
    await page.fill('input[name="password"]', invalidEmailRegistration.password);
    await page.fill('input[name="childFirstName"]', invalidEmailRegistration.childFirstName);
    await page.check('input[name="ageConsent"]');
    await page.click('button[type="submit"]');

    // Assert — validation error visible, no redirect
    await expect(page).toHaveURL(/\/register/);
    const errorText = page.locator('text=invalid').or(page.locator('[aria-live="polite"]'));
    await expect(errorText.first()).toBeVisible({ timeout: 5_000 });
  });

  test('should reject registration with short password', async ({ page }) => {
    // Arrange
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act
    await page.fill('input[name="email"]', shortPasswordRegistration.email);
    await page.fill('input[name="password"]', shortPasswordRegistration.password);
    await page.fill('input[name="childFirstName"]', shortPasswordRegistration.childFirstName);
    await page.check('input[name="ageConsent"]');
    await page.click('button[type="submit"]');

    // Assert — validation error visible, no redirect
    await expect(page).toHaveURL(/\/register/);
    const errorText = page.locator('text=at least').or(page.locator('[aria-live="polite"]'));
    await expect(errorText.first()).toBeVisible({ timeout: 5_000 });
  });

  test('should reject registration without age consent', async ({ page }) => {
    // Arrange
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act — fill form but do NOT check ageConsent
    await page.fill('input[name="email"]', noConsentRegistration.email);
    await page.fill('input[name="password"]', noConsentRegistration.password);
    await page.fill('input[name="childFirstName"]', noConsentRegistration.childFirstName);
    // ageConsent intentionally left unchecked
    await page.click('button[type="submit"]');

    // Assert — validation error visible, no redirect
    await expect(page).toHaveURL(/\/register/);
    const errorText = page.locator('text=consent').or(page.locator('[aria-live="polite"]'));
    await expect(errorText.first()).toBeVisible({ timeout: 5_000 });
  });
});
