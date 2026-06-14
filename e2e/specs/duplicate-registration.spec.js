// duplicate-registration.spec.js — STORY-061 Scenario 6: Duplicate Registration
// GIVEN a registered parent email
// WHEN a user attempts to register again with the same email
// THEN they receive a 409 response: "An account with this email already exists. Please log in instead."
//
// Note: The router returns ACCOUNT_EXISTS (from auth-manager), not DUPLICATE_EMAIL.
// See auth-router.js → handleError + auth-manager.js L517

import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/api-client.js';
import { testParentEmail, testParentPassword, testChildName } from '../fixtures/test-data.js';

const api = createApiClient();

test.describe('Scenario 6: Duplicate Registration', () => {
  test('should return 409 ACCOUNT_EXISTS when registering with an existing email', async ({ page }) => {
    // Arrange — the test parent should already exist (seeded by auth.setup.js)
    // We'll use the API client to attempt duplicate registration

    // Act — attempt to register with the same email as the seeded parent
    const registerRes = await api.register({
      email: testParentEmail,
      password: testParentPassword,
      ageConsent: true,
      childFirstName: testChildName,
    });

    // Assert — 409 ACCOUNT_EXISTS (actual error code from auth-manager)
    expect(registerRes.status).toBe(409);

    const body = await registerRes.json();
    expect(body.code).toBe('ACCOUNT_EXISTS');
    expect(body.message).toContain('already exists');
    expect(body.message).toContain('log in');
  });

  test('should show duplicate email error in browser when submitting form', async ({ page }) => {
    // Arrange — navigate to register page
    await page.goto('/register');
    await page.waitForSelector('form');

    // Act — fill with existing parent email and submit
    await page.fill('input[name="email"]', testParentEmail);
    await page.fill('input[name="password"]', testParentPassword);
    await page.fill('input[name="childFirstName"]', testChildName);
    await page.check('input[name="ageConsent"]');

    // Intercept the API response
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/register') && res.request().method() === 'POST',
    );
    await page.click('button[type="submit"]');

    // Assert — 409 response
    const response = await responsePromise;
    expect(response.status()).toBe(409);

    const body = await response.json();
    expect(body.code).toBe('ACCOUNT_EXISTS');
    expect(body.message).toContain('already exists');

    // Assert — error message displayed on page
    const errorText = page.locator('text=already exists').or(page.locator('[aria-live="polite"]'));
    await expect(errorText.first()).toBeVisible({ timeout: 5_000 });

    // Assert — no redirect (still on register page)
    await expect(page).toHaveURL(/\/register/);
  });
});
