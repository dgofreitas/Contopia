// validation.spec.js — STORY-061 Scenario 5: Registration Validation Errors
// GIVEN the registration form
// WHEN a user submits with invalid email, password < 4 chars, or unchecked age consent
// THEN validation errors are displayed inline and no account is created

import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/api-client.js';
import {
  invalidEmail,
  shortPassword,
  testParentPassword,
  testChildName,
} from '../fixtures/test-data.js';

const api = createApiClient();

test.describe('Scenario 5: Registration Validation', () => {
  test('should show validation error for invalid email (no @)', async ({ page }) => {
    // Arrange
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act
    await page.fill('input[name="email"]', invalidEmail);
    await page.fill('input[name="password"]', testParentPassword);
    await page.fill('input[name="childFirstName"]', testChildName);
    await page.check('input[name="ageConsent"]');
    await page.click('button[type="submit"]');

    // Assert — validation error visible, no redirect
    await expect(page).toHaveURL(/\/register/);
    const errorLocator = page.locator('[aria-live="polite"], .error, .validation-error, [role="alert"]');
    await expect(errorLocator.first()).toBeVisible({ timeout: 5_000 });
    // Should contain email-related error text
    const errorText = await errorLocator.first().textContent();
    expect(errorText.toLowerCase()).toContain('email');
  });

  test('should show validation error for short password (< 4 chars)', async ({ page }) => {
    // Arrange
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act
    await page.fill('input[name="email"]', 'short-pw-test@example.com');
    await page.fill('input[name="password"]', shortPassword);
    await page.fill('input[name="childFirstName"]', testChildName);
    await page.check('input[name="ageConsent"]');
    await page.click('button[type="submit"]');

    // Assert — validation error visible, no redirect
    await expect(page).toHaveURL(/\/register/);
    const errorLocator = page.locator('[aria-live="polite"], .error, .validation-error, [role="alert"]');
    await expect(errorLocator.first()).toBeVisible({ timeout: 5_000 });
    // Should contain password-related error text
    const errorText = await errorLocator.first().textContent();
    expect(errorText.toLowerCase()).toContain('password');
  });

  test('should show validation error when age consent is unchecked', async ({ page }) => {
    // Arrange
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act — fill form but do NOT check ageConsent
    await page.fill('input[name="email"]', 'no-consent-test@example.com');
    await page.fill('input[name="password"]', testParentPassword);
    await page.fill('input[name="childFirstName"]', testChildName);
    // ageConsent intentionally left unchecked
    await page.click('button[type="submit"]');

    // Assert — validation error visible, no redirect
    await expect(page).toHaveURL(/\/register/);
    const errorLocator = page.locator('[aria-live="polite"], .error, .validation-error, [role="alert"]');
    await expect(errorLocator.first()).toBeVisible({ timeout: 5_000 });
    // Should contain consent-related error text
    const errorText = await errorLocator.first().textContent();
    expect(errorText.toLowerCase()).toContain('consent');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Arrange
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act — submit empty form
    await page.click('button[type="submit"]');

    // Assert — validation errors visible, no redirect
    await expect(page).toHaveURL(/\/register/);
    const errorLocator = page.locator('[aria-live="polite"], .error, .validation-error, [role="alert"]');
    await expect(errorLocator.first()).toBeVisible({ timeout: 5_000 });
  });

  test('should not create an account when validation fails', async ({ page }) => {
    // Arrange
    const testEmail = `no-create-${Date.now()}@example.com`;
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act — submit with invalid data
    await page.fill('input[name="email"]', invalidEmail);
    await page.fill('input[name="password"]', shortPassword);
    await page.fill('input[name="childFirstName"]', testChildName);
    // ageConsent unchecked
    await page.click('button[type="submit"]');

    // Assert — no redirect
    await expect(page).toHaveURL(/\/register/);

    // Assert — account was NOT created (login should fail)
    const loginRes = await api.login({ email: testEmail, password: shortPassword });
    expect(loginRes.status).toBe(401);
  });
});
