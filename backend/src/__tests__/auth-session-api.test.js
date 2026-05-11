// Contopia — Auth Session API Integration Tests (STORY-002)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock ALL dependencies BEFORE router loads ──────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('rate-limit-redis', () => ({}));

vi.mock('../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(),
    incr: vi.fn(), expire: vi.fn(), keys: vi.fn(), call: vi.fn(),
    status: 'ready', on: vi.fn(),
  },
}));

vi.mock('../app/auth/auth-manager.js', () => ({
  registerParentAndChildIdempotent: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  childLogin: vi.fn(),
  loginWithPassword: vi.fn(),
  loginWithMagicLink: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  getCurrentUser: vi.fn(),
  incrementLoginAttempts: vi.fn(),
  hashToken: vi.fn((t) => `hashed:${t}`),
  createSession: vi.fn(),
  blacklistToken: vi.fn(),
}));
vi.mock('../app/common/email-service.js');

import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';
import authRouter from '../app/auth/auth-router.js';
import * as authManager from '../app/auth/auth-manager.js';
import redis from '../../config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function makeAccessToken(payload = {}) {
  return jwt.sign(
    { sub: 'c1', parentId: 'p1', role: 'child', type: 'access', ...payload },
    JWT_SECRET,
    { expiresIn: '30m' },
  );
}

function makeAccessTokenWithSession(sessionId = 'sess_abc123') {
  return jwt.sign(
    { sub: 'child1', parentId: 'p1', role: 'child', type: 'access', sid: sessionId },
    JWT_SECRET,
    { expiresIn: '30m' },
  );
}

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Session API — /login, /logout, /refresh, /me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── POST /login (password method) ──────────────────────────────────────────
  describe('POST /api/auth/login — password method', () => {
    const CID = '507f1f77bcf86cd799439011';

    it('should return 200 with tokens + sessionId on success', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      authManager.loginWithPassword.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        childId: CID,
        childFirstName: 'João',
        isOnboardingComplete: true,
        method: 'password',
        sessionId: 'sess_abc123',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: CID, password: 'pass1234' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        childId: CID,
        childFirstName: 'João',
        isOnboardingComplete: true,
        method: 'password',
        sessionId: 'sess_abc123',
      });
    });

    it('should return 401 with INVALID_CREDENTIALS when child has no password', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      const err = new Error('Password not set');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      authManager.loginWithPassword.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: CID, password: 'test' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 403 with NOT_VERIFIED when child inactive', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      const err = new Error('Not verified');
      err.code = 'NOT_VERIFIED';
      err.status = 403;
      authManager.loginWithPassword.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: CID, password: 'test' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_VERIFIED');
    });

    it('should return 404 with NOT_FOUND when child not found', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      const err = new Error('Not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      authManager.loginWithPassword.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: CID, password: 'test' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 429 when incrementLoginAttempts > 5', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(6);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: CID, password: 'test' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      // loginWithPassword should NOT be called — rate limit checked first
      expect(authManager.loginWithPassword).not.toHaveBeenCalled();
    });

    it('should return 400 with VALIDATION_ERROR for invalid payload', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: 'bad', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── POST /login (magic-link method) ────────────────────────────────────────
  describe('POST /api/auth/login — magic-link method', () => {
    it('should return 200 with magicLinkSent on success', async () => {
      authManager.loginWithMagicLink.mockResolvedValue({
        magicLinkSent: true,
        parentEmail: 'p@ex.com',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'magic-link', parentEmail: 'p@ex.com', childFirstName: 'João' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ magicLinkSent: true, parentEmail: 'p@ex.com' });
    });

    it('should return 404 with NOT_FOUND when parent missing or not verified', async () => {
      const err = new Error('Not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      authManager.loginWithMagicLink.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'magic-link', parentEmail: 'nx@ex.com', childFirstName: 'João' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 with VALIDATION_ERROR for invalid payload', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'magic-link', parentEmail: 'bad', childFirstName: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── POST /logout ───────────────────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('should return 200 with loggedOut:true when session token provided', async () => {
      const token = makeAccessTokenWithSession('sess_abc123');
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(JSON.stringify({
        sessionId: 'sess_abc123',
        childId: 'child1',
        lastActivity: new Date().toISOString(),
      }));
      redis.set.mockResolvedValue('OK');
      authManager.logout.mockResolvedValue({ loggedOut: true });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId: 'sess_abc123' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ loggedOut: true });
    });

    it('should pass refreshToken from body to authManager.logout', async () => {
      const token = makeAccessTokenWithSession('sess_def456');
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(JSON.stringify({
        sessionId: 'sess_def456',
        childId: 'child1',
        lastActivity: new Date().toISOString(),
      }));
      redis.set.mockResolvedValue('OK');
      authManager.logout.mockResolvedValue({ loggedOut: true });

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId: 'sess_def456', refreshToken: 'some-refresh-token' });

      expect(authManager.logout).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'some-refresh-token' }),
      );
    });

    it('should return 401 without auth header', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ sessionId: 'sess_123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with TOKEN_REVOKED when token blacklisted', async () => {
      const token = makeAccessTokenWithSession('sess_xyz789');
      redis.exists.mockResolvedValue(1); // blacklisted

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId: 'sess_xyz789' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('should return 400 with VALIDATION_ERROR for missing sessionId', async () => {
      const token = makeAccessToken();
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── POST /refresh ──────────────────────────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should return 200 with new access + refresh tokens', async () => {
      authManager.refreshSession.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        childId: 'c1',
        childFirstName: 'João',
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-rt' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        childId: 'c1',
        childFirstName: 'João',
      });
    });

    it('should pass ip and deviceHint to authManager.refreshSession', async () => {
      authManager.refreshSession.mockResolvedValue({
        accessToken: 'at', refreshToken: 'rt', childId: 'c1', childFirstName: 'A',
      });

      await request(app)
        .post('/api/auth/refresh')
        .set('User-Agent', 'ContopiaApp/1.0')
        .send({ refreshToken: 'valid-rt' });

      expect(authManager.refreshSession).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: 'valid-rt',
          deviceHint: expect.any(String),
        }),
      );
    });

    it('should return 401 with INVALID_REFRESH_TOKEN for bad token', async () => {
      const err = new Error('Invalid refresh');
      err.code = 'INVALID_REFRESH_TOKEN';
      err.status = 401;
      authManager.refreshSession.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'bad-rt' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should return 401 with TOKEN_REVOKED for revoked token', async () => {
      const err = new Error('Revoked');
      err.code = 'TOKEN_REVOKED';
      err.status = 401;
      authManager.refreshSession.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'revoked-rt' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('should return 400 with VALIDATION_ERROR for empty refreshToken', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 with NOT_FOUND when child deleted between sessions', async () => {
      const err = new Error('Child not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      authManager.refreshSession.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-but-child-gone' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── GET /me ───────────────────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return 200 with child info + session metadata', async () => {
      const token = makeAccessTokenWithSession('sess_user1');
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(JSON.stringify({
        sessionId: 'sess_user1',
        childId: 'child1',
        lastActivity: new Date().toISOString(),
      }));
      redis.set.mockResolvedValue('OK');
      authManager.getCurrentUser.mockResolvedValue({
        childId: 'child1',
        childFirstName: 'João',
        isOnboardingComplete: true,
        sessionCreatedAt: '2025-06-01T10:00:00Z',
        lastActivity: '2025-06-01T10:25:00Z',
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        childId: 'child1',
        childFirstName: 'João',
        isOnboardingComplete: true,
        sessionCreatedAt: '2025-06-01T10:00:00Z',
        lastActivity: '2025-06-01T10:25:00Z',
      });
    });

    it('should return 200 even when session metadata is absent', async () => {
      const token = makeAccessToken();
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(null);
      authManager.getCurrentUser.mockResolvedValue({
        childId: 'c1',
        childFirstName: 'Ana',
        isOnboardingComplete: false,
        sessionCreatedAt: null,
        lastActivity: null,
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.childId).toBe('c1');
      expect(res.body.data.sessionCreatedAt).toBeNull();
    });

    it('should return 401 without auth header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with TOKEN_REVOKED when token blacklisted', async () => {
      const token = makeAccessTokenWithSession();
      redis.exists.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('should return 401 with SESSION_EXPIRED when session not found', async () => {
      const token = makeAccessTokenWithSession('sess_gone');
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('SESSION_EXPIRED');
    });

    it('should return 404 with NOT_FOUND when child not found', async () => {
      const token = makeAccessToken();
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(null);
      const err = new Error('Not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      authManager.getCurrentUser.mockRejectedValue(err);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});