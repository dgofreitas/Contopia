// Contopia — Health Check Route Unit Test (/health)
import { describe, it, expect, vi } from 'vitest';

// Mock pino before importing app
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// Mock all middleware and routes that app.js imports
vi.mock('helmet', () => ({
  default: () => (_req, _res, next) => next(),
}));

vi.mock('pino-http', () => ({
  default: () => (_req, _res, next) => next(),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

vi.mock('../app/common/auth-middleware.js', () => ({
  authMiddleware: (_req, _res, next) => next(),
  sessionTimeoutMiddleware: (_req, _res, next) => next(),
}));

vi.mock('../app/common/rate-limit-middleware.js', () => ({
  rateLimitMiddleware: (_req, _res, next) => next(),
}));

vi.mock('../app/common/response-envelope.js', () => ({
  ok: (data) => ({ data }),
  fail: (code, message, meta = {}, traceId = null) => ({ error: { code, message, traceId: traceId ?? meta?.requestId ?? null }, meta }),
}));

vi.mock('../app/common/error-codes.js', () => ({
  ERROR_CODES: {
    NOT_FOUND: { status: 404, message: { en: "We couldn't find that — try going back" } },
    RATE_LIMITED: { status: 429, message: { en: 'Slow down — try again in a minute' } },
    INTERNAL_ERROR: { status: 500, message: { en: 'Something went wrong — please try again later' } },
  },
  getErrorMessage: (code) => `Error: ${code}`,
}));

vi.mock('../app/auth/auth-router.js', () => ({
  default: () => {},
}));

vi.mock('../app/book/book-router.js', () => ({
  default: () => {},
}));

vi.mock('../app/editor/chapter-router.js', () => ({
  default: () => {},
}));

vi.mock('../app/storage/storage-router.js', () => ({
  default: () => {},
}));

vi.mock('../app/ready-route.js', () => ({
  readyHandler: (_req, res) => res.status(200).json({ data: { ready: true } }),
}));

import request from 'supertest';
import app from '../app.js';

describe('GET /health', () => {
  it('returns 200 with status ok and timestamp', async () => {
    // Arrange & Act
    const res = await request(app).get('/health');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.timestamp).toBe('string');
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });

  it('returns timestamp in ISO 8601 format', async () => {
    // Arrange & Act
    const res = await request(app).get('/health');

    // Assert
    const parsed = new Date(res.body.timestamp);
    expect(parsed.toISOString()).toBe(res.body.timestamp);
  });

  it('responds within acceptable latency', async () => {
    // Arrange & Act
    const start = Date.now();
    await request(app).get('/health');
    const elapsed = Date.now() - start;

    // Assert
    expect(elapsed).toBeLessThan(2000); // 2s max for a no-op endpoint
  });

  it('returns 404 for unknown routes', async () => {
    // Arrange & Act
    const res = await request(app).get('/nonexistent');

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.traceId).toBeDefined();
  });
});
