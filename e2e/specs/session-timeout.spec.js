// session-timeout.spec.js — STORY-061 Scenario 4: Session Timeout
// GIVEN a parent is logged in and idle for 30 minutes
// WHEN they attempt any action
// THEN they receive a 401 response and are redirected to /login with a "Session expired" message
//
// This test requires a backend test endpoint to manipulate Redis session TTL
// (e.g., POST /api/test/expire-session?parentId=X). Without that endpoint, the test
// cannot deterministically expire a session.
//
// Marked as fixme until the backend test utility endpoint exists.
//
// Recipe when the endpoint exists:
// 1. Login via API client → accessToken + parentId via /api/parent/me
// 2. POST /api/test/expire-session?parentId=X (Authorization: Bearer <token>)
// 3. Wait 2 seconds for Redis TTL to pass
// 4. GET /api/parent/dashboard (Authorization: Bearer <token>) → assert 401 SESSION_EXPIRED
// 5. Assert page redirects to /login with "Session expired" message

import { test, expect } from '@playwright/test';

test.describe('Scenario 4: Session Timeout', () => {
  test.fixme('should return 401 SESSION_EXPIRED after session TTL expires', async ({ page }) => {
    // This test needs a backend test utility endpoint to expire Redis sessions.
    // See recipe above. Marked fixme until endpoint exists.
    expect(true).toBe(true);
  });
});
