// Contopia — Auth Middleware Tests (STORY-002)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(),
    incr: vi.fn(), expire: vi.fn(), keys: vi.fn(), call: vi.fn(),
    scanIterator: vi.fn(() => (async function* () {})()),
    status: 'ready', on: vi.fn(),
  },
}));

vi.mock('../app/auth/auth-manager.js', () => ({
  hashToken: vi.fn((t) => `hashed:${t}`),
}));

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, sessionTimeoutMiddleware } from '../app/common/auth-middleware.js';
import redis from '../config/redis.js';

function makeToken(payload, secret = JWT_SECRET) {
  return jwt.sign(payload, secret, { expiresIn: '30m' });
}

function createApp(middleware) {
  const app = express();
  app.use(express.json());
  app.use('/protected', middleware, (req, res) => {
    res.json({
      childId: req.childId,
      parentId: req.parentId,
      sessionId: req.sessionId,
    });
  });
  return app;
}

function createChainedApp() {
  const app = express();
  app.use(express.json());
  app.use('/sensitive', authMiddleware, sessionTimeoutMiddleware, (req, res) => {
    res.json({ ok: true, childId: req.childId });
  });
  return app;
}

describe('authMiddleware (STORY-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Missing/invalid auth header ─────────────────────────────────────────

  it('should return 401 UNAUTHORIZED when no auth header', async () => {
    const app = createApp(authMiddleware);
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 UNAUTHORIZED when header is not Bearer', async () => {
    const app = createApp(authMiddleware);
    const res = await request(app).get('/protected').set('Authorization', 'Basic xyz');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── JWT verification ────────────────────────────────────────────────────

  it('should return 401 TOKEN_EXPIRED when token expired', async () => {
    const app = createApp(authMiddleware);
    const expiredToken = jwt.sign({ sub: 'c1', type: 'access' }, JWT_SECRET, { expiresIn: '0s' });
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('should return 401 INVALID_TOKEN_TYPE when token type is not access', async () => {
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', type: 'refresh' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN_TYPE');
  });

  it('should return 401 UNAUTHORIZED for malformed JWT', async () => {
    const app = createApp(authMiddleware);
    const res = await request(app).get('/protected').set('Authorization', 'Bearer not.a.real.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Blacklist check ─────────────────────────────────────────────────────

  it('should return 401 TOKEN_REVOKED when token is blacklisted', async () => {
    redis.exists.mockResolvedValue(1);
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REVOKED');
  });

  it('should pass through when token is NOT blacklisted (exists=0)', async () => {
    redis.exists.mockResolvedValue(0);
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.childId).toBe('c1');
  });

  it('should check blacklist with correct hash key', async () => {
    redis.exists.mockResolvedValue(0);
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access' });
    await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(redis.exists).toHaveBeenCalledWith(`bl:hashed:${token}`);
  });

  // ── Session validation ──────────────────────────────────────────────────

  it('should return 401 SESSION_EXPIRED when session not found in Redis', async () => {
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(null);
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access', sid: 'sess_missing' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('should extend session TTL when session exists', async () => {
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(JSON.stringify({
      sessionId: 'sess_valid',
      childId: 'c1',
      lastActivity: new Date().toISOString(),
    }));
    redis.set.mockResolvedValue('OK');
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access', sid: 'sess_valid' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe('sess_valid');
    // Session TTL reset
    expect(redis.set).toHaveBeenCalledWith(
      'session:c1:sess_valid',
      expect.any(String),
      'EX',
      1800,
    );
  });

  it('should update lastActivity when extending session', async () => {
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(JSON.stringify({
      sessionId: 'sess_actsess',
      childId: 'c1',
      lastActivity: '2025-06-01T09:00:00Z',
    }));
    redis.set.mockResolvedValue('OK');
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access', sid: 'sess_actsess' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const storedSession = JSON.parse(redis.set.mock.calls[0][1]);
    expect(new Date(storedSession.lastActivity).getTime()).toBeGreaterThan(
      new Date('2025-06-01T09:00:00Z').getTime(),
    );
  });

  it('should attach auth info without sessionId when sid absent in token', async () => {
    redis.exists.mockResolvedValue(0);
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.childId).toBe('c1');
    expect(res.body.parentId).toBe('p1');
    expect(res.body.sessionId).toBeNull();
  });

  // ── Redis degradation ────────────────────────────────────────────────────

  it('should return 503 SERVICE_UNAVAILABLE when Redis is down', async () => {
    redis.exists.mockRejectedValue(new Error('Connection refused'));
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('should return 503 when Redis EXISTS works but session GET throws', async () => {
    redis.exists.mockResolvedValue(0);
    redis.get.mockRejectedValue(new Error('Redis timeout'));
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access', sid: 'sess_redis_fail' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});

describe('sessionTimeoutMiddleware (STORY-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createTimeoutApp() {
    const app = express();
    app.use(express.json());
    // Simulate authMiddleware setting req fields
    app.use('/sensitive', (req, res, next) => {
      req.childId = 'c1';
      req.sessionId = 'sess_timeout';
      req.parentId = 'p1';
      next();
    }, sessionTimeoutMiddleware, (req, res) => {
      res.json({ ok: true });
    });
    return app;
  }

  it('should pass through when idle < 25min', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      lastActivity: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    }));
    const res = await request(createTimeoutApp()).get('/sensitive');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should return 419 when idle > 25min and <= 30min (soft timeout)', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      lastActivity: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
    }));
    const res = await request(createTimeoutApp()).get('/sensitive');
    expect(res.status).toBe(419);
    expect(res.body.error.code).toBe('SESSION_TIMEOUT_WARNING');
  });

  it('should return 401 when idle > 30min (hard timeout)', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      lastActivity: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    }));
    const res = await request(createTimeoutApp()).get('/sensitive');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('should return 401 when session does not exist', async () => {
    redis.get.mockResolvedValue(null);
    const res = await request(createTimeoutApp()).get('/sensitive');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('should return 503 when Redis unavailable', async () => {
    redis.get.mockRejectedValue(new Error('Redis down'));
    const res = await request(createTimeoutApp()).get('/sensitive');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('should skip check when sessionId is null', async () => {
    const app = express();
    app.use('/sensitive', (req, res, next) => {
      req.childId = 'c1';
      req.sessionId = null;
      next();
    }, sessionTimeoutMiddleware, (req, res) => {
      res.json({ ok: true });
    });
    const res = await request(app).get('/sensitive');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should skip check when sessionId is undefined', async () => {
    const app = express();
    app.use('/sensitive', (req, res, next) => {
      req.childId = 'c1';
      // sessionId not set at all
      next();
    }, sessionTimeoutMiddleware, (req, res) => {
      res.json({ ok: true });
    });
    const res = await request(app).get('/sensitive');
    expect(res.status).toBe(200);
  });

  // ── Chained middleware test ───────────────────────────────────────────────

  it('should work correctly when chained after authMiddleware', async () => {
    const app = createChainedApp();
    const recentTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(JSON.stringify({
      sessionId: 'sess_chain',
      childId: 'c1',
      lastActivity: recentTime,
    }));
    redis.set.mockResolvedValue('OK');
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access', sid: 'sess_chain' });
    const res = await request(app).get('/sensitive').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should return 419 on chained route when idle > 25min', async () => {
    const app = createChainedApp();
    redis.exists.mockResolvedValue(0);
    redis.get
      .mockResolvedValueOnce(JSON.stringify({ // authMiddleware session check
        sessionId: 'sess_chain2',
        childId: 'c1',
        lastActivity: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
      }))
      .mockResolvedValueOnce(JSON.stringify({ // sessionTimeoutMiddleware check
        lastActivity: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
      }));
    redis.set.mockResolvedValue('OK');
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access', sid: 'sess_chain2' });
    const res = await request(app).get('/sensitive').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(419);
    expect(res.body.error.code).toBe('SESSION_TIMEOUT_WARNING');
  });
});