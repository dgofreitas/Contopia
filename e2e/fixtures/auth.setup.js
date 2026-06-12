// auth.setup.js — Global setup for Playwright E2E tests (STORY-061)
//
// Seeds a test parent account via API and stores auth state (cookies)
// so that all tests can start from an authenticated state.
//
// This file is referenced by playwright.config.js as globalSetup.

import { chromium } from '@playwright/test';
import { testParentEmail, testParentPassword, testChildName } from './test-data.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

/**
 * Global setup: register a test parent, store auth cookies.
 * Playwright calls this once before any test file runs.
 */
async function globalSetup() {
  // 1. Register the test parent via backend API
  const registerPayload = {
    email: testParentEmail,
    password: testParentPassword,
    ageConsent: true,
    childFirstName: testChildName,
  };

  let registerResponse;
  try {
    registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerPayload),
    });
  } catch (err) {
    // Backend may not be running — skip registration if that's the case.
    // Tests that require auth will fail with a clearer error.
    console.warn(
      `[auth.setup] Could not reach backend at ${BACKEND_URL}/api/auth/register. ` +
        'Skipping registration. Authenticated tests will need a running backend.\n' +
        `Error: ${err.message}`,
    );
  }

  if (registerResponse && !registerResponse.ok) {
    // 409 means duplicate (already seeded) — that's fine
    if (registerResponse.status === 409) {
      console.log('[auth.setup] Test parent already exists (409). Proceeding to login.');
    } else {
      console.warn(
        `[auth.setup] Registration returned ${registerResponse.status}. Proceeding anyway.`,
      );
    }
  } else if (registerResponse && registerResponse.ok) {
    console.log('[auth.setup] Test parent registered successfully.');
  }

  // 2. Login the parent to get cookies and store auth state
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: FRONTEND_URL });
  const page = await context.newPage();

  try {
    // Navigate to login page and authenticate
    await page.goto('/login');
    await page.fill('input[name="email"]', testParentEmail);
    await page.fill('input[name="password"]', testParentPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (indicates successful login)
    await page.waitForURL('**/parent/dashboard', { timeout: 15_000 });
    console.log('[auth.setup] Login successful, storing auth state.');

    // Store the authenticated state (cookies + localStorage)
    await context.storageState({ path: 'e2e/.auth/parent.json' });
  } catch (err) {
    console.warn(
      `[auth.setup] Login via UI failed. Attempting direct API login as fallback.\n` +
        `Error: ${err.message}`,
    );

    // Fallback: login directly via API and store cookies from response
    try {
      const loginResponse = await fetch(`${BACKEND_URL}/api/parent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testParentEmail,
          password: testParentPassword,
        }),
      });

      if (loginResponse.ok) {
        // Extract set-cookie headers
        const cookies = loginResponse.headers.getSetCookie();
        // Playwright's storageState requires a specific format.
        // We create a minimal context with the cookie manually.
        const parsedCookies = cookies.map((cookieStr) => {
          const [nameValue, ...attrs] = cookieStr.split(';');
          const [name, ...valParts] = nameValue.split('=');
          const value = valParts.join('=');

          // Parse actual path from Set-Cookie attributes; default to '/' if missing
          const pathAttr = attrs.find((a) => a.trim().toLowerCase().startsWith('path='));
          const cookiePath = pathAttr ? pathAttr.split('=')[1].trim() : '/';

          const cookie = {
            name: name.trim(),
            value: value.trim(),
            domain: new URL(BACKEND_URL).hostname,
            path: cookiePath,
            httpOnly: attrs.some((a) => a.trim().toLowerCase() === 'httponly'),
            secure: attrs.some((a) => a.trim().toLowerCase() === 'secure'),
            sameSite: attrs.some((a) => a.trim().toLowerCase() === 'samesite=strict')
              ? 'Strict'
              : 'Lax',
          };
          return cookie;
        });

        await context.addCookies(parsedCookies);
        await context.storageState({ path: 'e2e/.auth/parent.json' });
        console.log('[auth.setup] Auth state stored via API fallback.');
      }
    } catch (fallbackErr) {
      console.warn(
        `[auth.setup] API login fallback also failed.\n` +
          `Error: ${fallbackErr.message}`,
      );
    }
  } finally {
    await browser.close();
  }
}

export default globalSetup;