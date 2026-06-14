// rate-limiting.spec.js — STORY-061 Scenario 7: Rate Limiting
// GIVEN a user rapidly submits the registration form
// WHEN they exceed 10 requests in 1 minute from the same IP
// THEN the 11th attempt returns 429: "Too many attempts. Please try again later."
//
// The code uses max:10 per 1 minute for register (IP:email-prefix keyed).
// We send 11 requests with the same IP:email-prefix to guarantee threshold exceeded.
// Each request uses the same email so the prefix is identical.
// After the first success, subsequent requests are rejected by the express-rate-limit.
// The 11th request MUST return 429.
//
// See auth-router.js — registerParentLimiter: max:10, windowMs: 60*1000

import { test, expect } from '@playwright/test';
import { createApiClient } from '../utils/api-client.js';
import { testChildName } from '../fixtures/test-data.js';

const api = createApiClient();

test.describe('Scenario 7: Rate Limiting', () => {
  test('should return 429 after exceeding rate limit on register endpoint', async () => {
    // Arrange — code uses max:10 per 1 minute for register (IP:email-prefix)
    // Send 11 requests with the same email (same prefix key) to exceed threshold
    const RATE_LIMIT_THRESHOLD = 10; // matches auth-router.js registerParentLimiter
    const SEND_COUNT = RATE_LIMIT_THRESHOLD + 1; // 11 requests total
    const uniquePrefix = `ratelimit-${Date.now()}`;
    const email = `${uniquePrefix}@example.com`;

    // Act — send N rapid requests (N = threshold + 1)
    const responses = [];
    for (let i = 0; i < SEND_COUNT; i++) {
      const res = await api.register({
        email,
        password: 'StrongPass1',
        ageConsent: true,
        childFirstName: testChildName,
      });
      responses.push({ status: res.status, body: await res.json().catch(() => ({})) });
    }

    // Assert — the 11th request MUST return 429
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.code).toBe('RATE_LIMITED');
    expect(lastResponse.body.message).toContain('Too many attempts');

    // Verify early requests were handled (first one was 201, rest may be 429 or 409)
    // This is informational — the contract test checks first-response behavior
    const firstResponse = responses[0];
    expect(firstResponse.status).toBe(201);
  });

  test('should return 429 after exceeding rate limit on login endpoint', async () => {
    // Arrange — code uses max:10 per 1 minute (IP-based) for parent login
    // Send 11 rapid login requests with wrong password to exceed threshold
    const RATE_LIMIT_THRESHOLD = 10; // matches auth-router.js parentLoginLimiter
    const SEND_COUNT = RATE_LIMIT_THRESHOLD + 1;
    const email = `nobody-${Date.now()}@example.com`;

    // Act — send N rapid login requests with wrong password
    const responses = [];
    for (let i = 0; i < SEND_COUNT; i++) {
      const res = await api.login({
        email,
        password: 'wrongpassword',
      });
      responses.push({ status: res.status, body: await res.json().catch(() => ({})) });
    }

    // Assert — last request MUST be 429
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.code).toBe('RATE_LIMITED');
    expect(lastResponse.body.message).toContain('Too many attempts');
  });
});
