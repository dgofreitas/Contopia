// Contopia — Auth Middleware Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(), expire: vi.fn(), keys: vi.fn(),
    status: 'ready', on: vi.fn(),
  },
}));

vi.mock('../../auth/auth-manager.js', () => ({
  hashToken: vi.fn((t) => `hashed:${t}`),
}));

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, sessionTimeoutMiddleware } from '../auth-middleware.js';
import redis from '../../../config/redis.js';

// Helper: express app that uses middleware
function createApp(middleware) {
  const app = express();
  app.use(express.json());
  if (middleware) app.use('/protected', middleware, (req, res) => {
    res.json({ childId: req.childId, parentId: req.parentId, sessionId: req.sessionId });
  });
  return app;
}

function makeToken(payload, secret = JWT_SECRET) {
  return jwt.sign(payload, secret, { expiresIn: '30m' });
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when no auth header', async () => {
    const app = createApp(authMiddleware);
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when header is not Bearer', async () => {
    const app = createApp(authMiddleware);
    const res = await request(app).get('/protected').set('Authorization', 'Basic xyz');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when token is expired', async () => {
    const app = createApp(authMiddleware);
    const expiredToken = jwt.sign({ sub: 'c1', type: 'access' }, JWT_SECRET, { expiresIn: '0s' });
    // Wait 1s to ensure expiry
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('should return 401 when token type is not access', async () => {
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', type: 'refresh' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when token is blacklisted', async () => {
    redis.exists.mockResolvedValue(1);
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REVOKED');
  });

  it('should return 401 when session does not exist', async () => {
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(null);
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access', sid: 'sess_123' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('should return 503 when Redis is unavailable', async () => {
    redis.exists.mockRejectedValue(new Error('Redis down'));
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('should extend session TTL on valid request', async () => {
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(JSON.stringify({
      sessionId: 'sess_123', childId: 'c1', lastActivity: new Date().toISOString(),
    }));
    redis.set.mockResolvedValue('OK');
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access', sid: 'sess_123' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.childId).toBe('c1');
    expect(res.body.parentId).toBe('p1');
    expect(res.body.sessionId).toBe('sess_123');
    expect(redis.set).toHaveBeenCalled();
  });

  it('should attach auth info when no sessionId in token', async () => {
    redis.exists.mockResolvedValue(0);
    const app = createApp(authMiddleware);
    const token = makeToken({ sub: 'c1', parentId: 'p1', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.childId).toBe('c1');
    expect(res.body.sessionId).toBeNull();
  });
});

describe('sessionTimeoutMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createTimeoutApp() {
    const app = express();
    app.use(express.json());
    // Simulate authMiddleware setting req fields
    app.use('/protected', (req, res, next) => {
      req.childId = 'c1';
      req.sessionId = 'sess_123';
      req.parentId = 'p1';
      next();
    }, sessionTimeoutMiddleware, (req, res) => {
      res.json({ ok: true });
    });
    return app;
  }

  it('should pass through when idle < 25min', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      lastActivity: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10min ago
    }));
    const app = createTimeoutApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should return 419 when idle > 25min (soft timeout)', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      lastActivity: new Date(Date.now() - 27 * 60 * 1000).toISOString(), // 27min ago
    }));
    const app = createTimeoutApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(419);
    expect(res.body.error.code).toBe('SESSION_TIMEOUT');
  });

  it('should return 401 when idle > 30min (hard timeout)', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      lastActivity: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35min ago
    }));
    const app = createTimeoutApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('should return 401 when session does not exist', async () => {
    redis.get.mockResolvedValue(null);
    const app = createTimeoutApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('should return 503 when Redis unavailable', async () => {
    redis.get.mockRejectedValue(new Error('Redis down'));
    const app = createTimeoutApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('should skip check when no sessionId', async () => {
    const app = express();
    app.use('/protected', (req, res, next) => {
      req.childId = 'c1';
      req.sessionId = null;
      next();
    }, sessionTimeoutMiddleware, (req, res) => {
      res.json({ ok: true });
    });
    const res = await request(app).get('/protected');
    expect(res.status).toBe(200);
  });
});
