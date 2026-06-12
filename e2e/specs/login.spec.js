// login.spec.js — STORY-061 Scenario 2: Parent Login
// GIVEN a registered parent visits /login
// WHEN they enter valid email and password and submit
// THEN they are redirected to /parent/dashboard with a valid session cookie

import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/api-client.js';
import { testParentEmail, testParentPassword, invalidPasswordLogin, nonExistentLogin } from '../fixtures/test-data.js';

const api = createApiClient();

test.describe('Scenario 2: Parent Login', () => {
  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    // Arrange
    await page.goto('/login');
    await page.waitForSelector('form');

    // Act
    await page.fill('input[name="email"]', testParentEmail);
    await page.fill('input[name="password"]', testParentPassword);
    await page.click('button[type="submit"]');

    // Assert — redirect to /parent/dashboard
    await page.waitForURL('**/parent/dashboard', { timeout: 15_000 });
    expect(page.url()).toContain('/parent/dashboard');

    // Assert — parentRefreshToken cookie set
    const cookies = await page.context().cookies();
    const refreshCookie = cookies.find((c) => c.name === 'parentRefreshToken');
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie.httpOnly).toBe(true);
    expect(refreshCookie.sameSite).toBe('Strict');
    expect(refreshCookie.path).toBe('/api/parent');
  });

  test('should reject login with invalid password', async ({ page }) => {
    // Arrange
    await page.goto('/login');
    await page.waitForSelector('form');

    // Act
    await page.fill('input[name="email"]', invalidPasswordLogin.email);
    await page.fill('input[name="password"]', invalidPasswordLogin.password);
    await page.click('button[type="submit"]');

    // Assert — error message visible, no redirect to dashboard
    await expect(page).toHaveURL(/\/login/);
    const errorText = page.locator('text=invalid').or(page.locator('text=Incorrect'));
    await expect(errorText.first()).toBeVisible({ timeout: 5_000 });
  });

  test('should reject login with non-existent email', async ({ page }) => {
    // Arrange
    await page.goto('/login');
    await page.waitForSelector('form');

    // Act
    await page.fill('input[name="email"]', nonExistentLogin.email);
    await page.fill('input[name="password"]', nonExistentLogin.password);
    await page.click('button[type="submit"]');

    // Assert — error message visible, no redirect to dashboard
    await expect(page).toHaveURL(/\/login/);
    const errorText = page.locator('text=invalid').or(page.locator('text=not found'));
    await expect(errorText.first()).toBeVisible({ timeout: 5_000 });
  });

  test('should reject login with empty fields', async ({ page }) => {
    // Arrange
    await page.goto('/login');
    await page.waitForSelector('form');

    // Act — submit without filling anything
    await page.click('button[type="submit"]');

    // Assert — validation errors visible, no redirect
    await expect(page).toHaveURL(/\/login/);
    const errorText = page.locator('text=required').or(page.locator('[aria-live="polite"]'));
    await expect(errorText.first()).toBeVisible({ timeout: 5_000 });
  });
});
