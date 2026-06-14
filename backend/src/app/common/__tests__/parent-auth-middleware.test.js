// Contopia — Parent Auth Middleware Tests (STORY-060)
// Tests parentAuthMiddleware: TTL check, X-Session-Expiring header, SESSION_EXPIRED audit
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(), expire: vi.fn(), keys: vi.fn(),
    scanIterator: vi.fn(), ttl: vi.fn(), status: 'ready', on: vi.fn(),
  },
}));

vi.mock('../../auth/auth-manager.js', () => ({
  hashToken: vi.fn((t) => `hashed:${t}`),
}));

vi.mock('../../auth/auth-dao.js', () => ({
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
}));

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { parentAuthMiddleware } from '../auth-middleware.js';
import redis from '../../../config/redis.js';
import * as authDao from '../../auth/auth-dao.js';

// Helper: express app that uses parentAuthMiddleware
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/protected', parentAuthMiddleware, (req, res) => {
    res.json({ parentId: req.parentId, sessionId: req.sessionId });
  });
  return app;
}

function makeParentToken(payload, secret = JWT_SECRET) {
  return jwt.sign(payload, secret, { expiresIn: '30m' });
}

describe('parentAuthMiddleware (STORY-060)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Positive: No auth header ──
  it('should return 401 when no auth header', async () => {
    const app = createApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Positive: Header is not Bearer ──
  it('should return 401 when header is not Bearer', async () => {
    const app = createApp();
    const res = await request(app).get('/protected').set('Authorization', 'Basic xyz');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Positive: Token is expired ──
  it('should return 401 when token is expired', async () => {
    const app = createApp();
    const expiredToken = jwt.sign({ sub: 'p1', role: 'parent', type: 'access' }, JWT_SECRET, { expiresIn: '0s' });
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  // ── Positive: Token type is not access ──
  it('should return 401 when token type is not access', async () => {
    const app = createApp();
    const token = makeParentToken({ sub: 'p1', role: 'parent', type: 'refresh' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Positive: Token role is not parent ──
  it('should return 401 when token role is not parent', async () => {
    const app = createApp();
    const token = makeParentToken({ sub: 'c1', role: 'child', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ── Positive: Token is blacklisted ──
  it('should return 401 when token is blacklisted', async () => {
    redis.exists.mockResolvedValue(1);
    const app = createApp();
    const token = makeParentToken({ sub: 'p1', role: 'parent', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REVOKED');
  });

  // ── Positive: Session not found (expired) → SESSION_EXPIRED audit ──
  it('should return 401 and log SESSION_EXPIRED when session not found', async () => {
    redis.exists.mockResolvedValue(0);
    redis.scanIterator.mockReturnValue((async function* () {
      // yield no keys — session not found
    })());
    const app = createApp();
    const token = makeParentToken({ sub: 'p1', role: 'parent', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
    expect(authDao.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SESSION_EXPIRED', reason: 'idle_timeout' })
    );
  });

  // ── Positive: Valid session with TTL > 300s → no X-Session-Expiring header ──
  it('should not set X-Session-Expiring when TTL > 300s', async () => {
    redis.exists.mockResolvedValue(0);
    const sessionData = {
      sessionId: 'psess_abc',
      parentId: 'p1',
      lastActivity: new Date().toISOString(),
    };
    redis.scanIterator.mockReturnValue((async function* () {
      yield 'parentSession:p1:psess_abc';
    })());
    redis.get.mockResolvedValue(JSON.stringify(sessionData));
    redis.ttl.mockResolvedValue(1500); // 25 min remaining
    redis.set.mockResolvedValue('OK');

    const app = createApp();
    const token = makeParentToken({ sub: 'p1', role: 'parent', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-session-expiring']).toBeUndefined();
  });

  // ── Positive: Valid session with TTL < 300s → X-Session-Expiring header ──
  it('should set X-Session-Expiring header when TTL < 300s', async () => {
    redis.exists.mockResolvedValue(0);
    const sessionData = {
      sessionId: 'psess_abc',
      parentId: 'p1',
      lastActivity: new Date().toISOString(),
    };
    redis.scanIterator.mockReturnValue((async function* () {
      yield 'parentSession:p1:psess_abc';
    })());
    redis.get.mockResolvedValue(JSON.stringify(sessionData));
    redis.ttl.mockResolvedValue(120); // 2 min remaining
    redis.set.mockResolvedValue('OK');

    const app = createApp();
    const token = makeParentToken({ sub: 'p1', role: 'parent', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-session-expiring']).toBe('120');
  });

  // ── Positive: Valid session → extends TTL and updates lastActivity ──
  it('should extend session TTL on valid request', async () => {
    redis.exists.mockResolvedValue(0);
    const sessionData = {
      sessionId: 'psess_abc',
      parentId: 'p1',
      lastActivity: new Date(Date.now() - 60000).toISOString(),
    };
    redis.scanIterator.mockReturnValue((async function* () {
      yield 'parentSession:p1:psess_abc';
    })());
    redis.get.mockResolvedValue(JSON.stringify(sessionData));
    redis.ttl.mockResolvedValue(1500);
    redis.set.mockResolvedValue('OK');

    const app = createApp();
    const token = makeParentToken({ sub: 'p1', role: 'parent', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.parentId).toBe('p1');
    expect(res.body.sessionId).toBe('psess_abc');
    // Verify session was updated with new lastActivity and TTL
    expect(redis.set).toHaveBeenCalledWith(
      'parentSession:p1:psess_abc',
      expect.any(String),
      'EX',
      1800
    );
  });

  // ── Negative: Redis unavailable → 503 ──
  it('should return 503 when Redis is unavailable', async () => {
    redis.exists.mockRejectedValue(new Error('Redis down'));
    const app = createApp();
    const token = makeParentToken({ sub: 'p1', role: 'parent', type: 'access' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
