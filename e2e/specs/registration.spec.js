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
        const body = await loginRes.json();
        const accessToken = body.accessToken || body.data?.accessToken;
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

    // Assert — use API client to verify parent data via /api/parent/me
    // Extract accessToken from storage (set by the frontend after registration)
    const accessToken = await page.evaluate(() =>
      localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || ''
    );
    expect(accessToken).toBeTruthy();

    const meRes = await api.me(accessToken);
    expect(meRes.ok).toBe(true);
    const meData = await meRes.json();
    expect(meData).toBeDefined();
    expect(meData.parentId || meData.id).toBeDefined();
    expect(meData.email || meData.data?.email).toBe(uniqueEmail);
    const children = meData.children || meData.data?.children || [];
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBeGreaterThanOrEqual(1);
    const child = children[0];
    expect(child.isActive || child.active).toBe(true);
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
