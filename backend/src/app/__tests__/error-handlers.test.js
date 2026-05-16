// Contopia — Error Handler Integration Tests (STORY-008)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Hoisted mocks for modules used at import time ─────────────────────────
const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    incr: vi.fn(),
    expire: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    call: vi.fn(),
    scanIterator: vi.fn(() => (async function* () {})()),
    status: 'ready',
    on: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
  },
}));

vi.mock('dotenv/config');
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
vi.mock('pino-http', () => ({
  default: () => (req, res, next) => next(),
}));
vi.mock('../../config/redis.js', () => ({ default: redisMock }));
vi.mock('@aws-sdk/client-s3', () => ({ S3Client: vi.fn(), HeadBucketCommand: vi.fn() }));
vi.mock('../storage/storage-config.js', () => ({
  s3Client: { send: vi.fn() },
  BUCKET_NAME: 'test-bucket',
}));
vi.mock('../common/auth-middleware.js', () => ({
  authMiddleware: (req, res, next) => next(),
  sessionTimeoutMiddleware: (req, res, next) => next(),
}));
vi.mock('../common/rate-limit-middleware.js', () => ({
  rateLimitMiddleware: (req, res, next) => next(),
}));
vi.mock('../auth/auth-router.js', () => ({
  default: (req, res, next) => {
    // If this is the test-error trigger path, throw rather than next()
    if (req.path === '/trigger-500') {
      throw new Error('Simulated unhandled error');
    }
    next();
  },
}));
vi.mock('../book/book-router.js', () => ({ default: (req, res, next) => next() }));
vi.mock('../editor/chapter-router.js', () => ({ default: (req, res, next) => next() }));
vi.mock('../storage/storage-router.js', () => ({ default: (req, res, next) => next() }));
vi.mock('../ready-route.js', () => ({
  readyHandler: (req, res) => {
    req.id = req.id || 'test-id';
    res.status(200).json({ data: { ready: true, checks: {} }, meta: {} });
  },
}));
vi.mock('mongoose', () => ({
  default: {
    connection: {
      db: { admin: () => ({ command: vi.fn().mockResolvedValue({ ok: 1 }) }) },
    },
  },
}));

let app;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('../../app.js');
  app = mod.default;
});

describe('404 handler (STORY-008)', () => {
  it('should return 404 status for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  it('should return fail() envelope with error.code, error.message, error.traceId', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('traceId');
  });

  it('should return child-friendly English NOT_FOUND message on 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.body.error.message).toBe("We couldn't find that — try going back");
  });

  it('should include meta.requestId in 404 response', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('requestId');
    expect(typeof res.body.meta.requestId).toBe('string');
  });

  it('should set error.traceId same as meta.requestId for 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.body.error.traceId).toBe(res.body.meta.requestId);
  });

  it('should not leak stack traces on 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    const body = JSON.parse(res.text);
    expect(body).not.toHaveProperty('stack');
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe("We couldn't find that — try going back");
  });
});

describe('404 on protected placeholder routes (STORY-008)', () => {
  it('should return 404 for /api/shelf without route match', async () => {
    const res = await request(app).get('/api/shelf/unknown-item');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 404 for /api/settings without route match', async () => {
    const res = await request(app).get('/api/settings/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should include traceId in /api/shelf 404 responses', async () => {
    const res = await request(app).get('/api/shelf/missing');
    expect(res.body.error.traceId).toBe(res.body.meta.requestId);
  });
});

describe('Global error handler — 500 (STORY-008)', () => {
  it('should return 500 status for unhandled errors', async () => {
    // The auth-router mock throws on /trigger-500 path
    const res = await request(app).get('/api/auth/trigger-500');
    expect(res.status).toBe(500);
  });

  it('should return INTERNAL_ERROR code and child-friendly message', async () => {
    const res = await request(app).get('/api/auth/trigger-500');
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Something went wrong — please try again later');
  });

  it('should include meta.requestId in 500 response', async () => {
    const res = await request(app).get('/api/auth/trigger-500');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('requestId');
    expect(typeof res.body.meta.requestId).toBe('string');
  });

  it('should include error.traceId in 500 response', async () => {
    const res = await request(app).get('/api/auth/trigger-500');
    expect(res.body.error).toHaveProperty('traceId');
    expect(typeof res.body.error.traceId).toBe('string');
  });

  it('should set error.traceId same as meta.requestId on 500', async () => {
    const res = await request(app).get('/api/auth/trigger-500');
    expect(res.body.error.traceId).toBe(res.body.meta.requestId);
  });

  it('should scrub technical details from 500 response', async () => {
    const res = await request(app).get('/api/auth/trigger-500');
    const body = JSON.parse(res.text);
    // Verify the fail envelope fields only — no raw stack or internal details
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code', 'INTERNAL_ERROR');
    expect(body.error).toHaveProperty('message');
    expect(body).not.toHaveProperty('data');
    // Ensure no stack trace is present in the response body
    expect(JSON.stringify(body)).not.toMatch(/Error: /);
    expect(body).not.toHaveProperty('error.stack');
    expect(body).not.toHaveProperty('stack');
  });

  it('should return fail() envelope format on 500', async () => {
    const res = await request(app).get('/api/auth/trigger-500');
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('traceId');
    expect(res.body).toHaveProperty('meta');
    // Should NOT have a data property (fail envelope vs ok envelope)
    expect(res.body).not.toHaveProperty('data');
  });
});
