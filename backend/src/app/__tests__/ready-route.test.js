// Contopia — Readiness Probe Route Unit Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock objects (vi.hoisted ensures availability in vi.mock factories) ──
const { mongoAdmin, redisMock, s3Mock } = vi.hoisted(() => ({
  mongoAdmin: { command: vi.fn() },
  redisMock: { ping: vi.fn() },
  s3Mock: { send: vi.fn() },
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('mongoose', () => ({
  default: {
    connection: {
      db: { admin: () => mongoAdmin },
    },
  },
}));

vi.mock('../../config/redis.js', () => ({
  default: redisMock,
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  HeadBucketCommand: vi.fn((args) => args),
}));

vi.mock('../storage/storage-config.js', () => ({
  s3Client: s3Mock,
  BUCKET_NAME: 'contopia-assets',
}));

// ── Import after mocks ──────────────────────────────────────────────────────
import request from 'supertest';
import express from 'express';
import { readyHandler } from '../ready-route.js';

// Build a minimal Express app for testing
function createApp() {
  const app = express();
  app.get('/api/v1/ready', readyHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: all checks healthy
  mongoAdmin.command.mockResolvedValue({ ok: 1 });
  redisMock.ping.mockResolvedValue('PONG');
  s3Mock.send.mockResolvedValue({});
});

describe('GET /api/v1/ready', () => {
  it('returns 200 with ready:true when all checks pass', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/ready');

    expect(res.status).toBe(200);
    expect(res.body.data.ready).toBe(true);
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.checks.mongodb.status).toBe('ok');
    expect(res.body.data.checks.mongodb.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.body.data.checks.redis.status).toBe('ok');
    expect(res.body.data.checks.redis.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.body.data.checks.minio.status).toBe('ok');
    expect(res.body.data.checks.minio.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns 503 with NOT_READY when MongoDB fails', async () => {
    mongoAdmin.command.mockRejectedValue(new Error('connection refused'));

    const app = createApp();
    const res = await request(app).get('/api/v1/ready');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('NOT_READY');
    expect(res.body.error.message).toContain('mongodb');
    expect(res.body.data.checks.mongodb.status).toBe('error');
    expect(res.body.data.checks.redis.status).toBe('ok');
    expect(res.body.data.checks.minio.status).toBe('ok');
  });

  it('returns 503 with NOT_READY when Redis fails', async () => {
    redisMock.ping.mockRejectedValue(new Error('connection refused'));

    const app = createApp();
    const res = await request(app).get('/api/v1/ready');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('NOT_READY');
    expect(res.body.error.message).toContain('redis');
    expect(res.body.data.checks.redis.status).toBe('error');
    expect(res.body.data.checks.mongodb.status).toBe('ok');
    expect(res.body.data.checks.minio.status).toBe('ok');
  });

  it('returns 503 with NOT_READY when MinIO fails', async () => {
    s3Mock.send.mockRejectedValue(new Error('timeout'));

    const app = createApp();
    const res = await request(app).get('/api/v1/ready');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('NOT_READY');
    expect(res.body.error.message).toContain('minio');
    expect(res.body.data.checks.minio.status).toBe('error');
    expect(res.body.data.checks.mongodb.status).toBe('ok');
    expect(res.body.data.checks.redis.status).toBe('ok');
  });

  it('returns 503 with combined message when multiple checks fail', async () => {
    mongoAdmin.command.mockRejectedValue(new Error('connection refused'));
    redisMock.ping.mockRejectedValue(new Error('connection refused'));
    s3Mock.send.mockRejectedValue(new Error('timeout'));

    const app = createApp();
    const res = await request(app).get('/api/v1/ready');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('NOT_READY');
    expect(res.body.error.message).toContain('mongodb');
    expect(res.body.error.message).toContain('redis');
    expect(res.body.error.message).toContain('minio');
    expect(res.body.data.checks.mongodb.status).toBe('error');
    expect(res.body.data.checks.redis.status).toBe('error');
    expect(res.body.data.checks.minio.status).toBe('error');
  });
});