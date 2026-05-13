// Contopia — Auth API Integration Tests (supertest)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Stateful rate-limiter mock: per-key counters ──────────────────────────────
const rateLimitCounters = new Map();

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('rate-limit-redis', () => ({}));

vi.mock('express-rate-limit', () => ({
  default: vi.fn((opts) => {
    const max = opts.max || 5;
    return (req, res, next) => {
      const key = opts.keyGenerator ? opts.keyGenerator(req) : req.ip;
      const current = rateLimitCounters.get(key) || 0;
      rateLimitCounters.set(key, current + 1);
      if (current >= max) {
        return res.status(429).json({
          error: { code: 'RATE_LIMITED', message: opts.message || 'Too many attempts.' },
          meta: { requestId: req.id },
        });
      }
      next();
    };
  }),
}));

vi.mock('../config/redis.js', () => ({
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
}));
vi.mock('../app/common/email-service.js');

import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';
import authRouter from '../app/auth/auth-router.js';
import * as authManager from '../app/auth/auth-manager.js';
import { sendVerificationEmail } from '../app/common/email-service.js';
import redis from '../config/redis.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// Helper: generate a valid access token for authMiddleware
function makeAccessToken(payload = {}) {
  return jwt.sign(
    { sub: 'c1', parentId: 'p1', type: 'access', ...payload },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '30m' }
  );
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitCounters.clear();
  });

  // ── POST /register ──────────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should return 201 with parentId and emailSent on success', async () => {
      authManager.registerParentAndChildIdempotent.mockResolvedValue({
        resent: false,
        parent: { _id: 'parent123' },
        child: { _id: 'child123', firstName: 'João' },
        token: 'mock-token',
      });
      sendVerificationEmail.mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'test@example.com', childFirstName: 'João' });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({ parentId: 'parent123', emailSent: true });
    });

    it('should return 400 with VALIDATION_ERROR for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'bad', childFirstName: 'João' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with VALIDATION_ERROR for empty childFirstName', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'e@ex.com', childFirstName: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 with ACCOUNT_EXISTS for duplicate active child', async () => {
      const err = new Error('dup'); err.code = 'ACCOUNT_EXISTS'; err.status = 409;
      authManager.registerParentAndChildIdempotent.mockRejectedValue(err);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'e@ex.com', childFirstName: 'João' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
    });

    it('should return 429 with RATE_LIMITED after exceeding limit', async () => {
      // Register limiter: max=5 per IP+email prefix. All requests share the same IP in test.
      // We need 6 requests with same IP+emailPrefix key to exceed the 5-request limit.
      // Since key is IP:emailPrefix, use same email prefix (first 3 chars) for all.
      for (let i = 0; i < 6; i++) {
        await request(app).post('/api/auth/register').send({ parentEmail: `tes${i}@ex.com`, childFirstName: 'João' });
      }
      // The 7th request should be rate limited
      const res = await request(app).post('/api/auth/register').send({ parentEmail: 'tes7@ex.com', childFirstName: 'João' });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
    });
  });

  // ── GET /verify/:token ──────────────────────────────────────────────────
  describe('GET /api/auth/verify/:token', () => {
    it('should return 200 with childId on success', async () => {
      authManager.verifyEmail.mockResolvedValue({ childId: 'child123' });
      const res = await request(app).get('/api/auth/verify/token');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ childId: 'child123' });
    });

    it('should return 404 with TOKEN_NOT_FOUND', async () => {
      const err = new Error('x'); err.code = 'TOKEN_NOT_FOUND'; err.status = 404;
      authManager.verifyEmail.mockRejectedValue(err);
      const res = await request(app).get('/api/auth/verify/bad');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TOKEN_NOT_FOUND');
    });

    it('should return 410 with TOKEN_EXPIRED', async () => {
      const err = new Error('x'); err.code = 'TOKEN_EXPIRED'; err.status = 410;
      authManager.verifyEmail.mockRejectedValue(err);
      const res = await request(app).get('/api/auth/verify/old');
      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 400 with INVALID_TOKEN', async () => {
      const err = new Error('x'); err.code = 'INVALID_TOKEN'; err.status = 400;
      authManager.verifyEmail.mockRejectedValue(err);
      const res = await request(app).get('/api/auth/verify/bad');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  // ── POST /resend-verification ───────────────────────────────────────────
  describe('POST /api/auth/resend-verification', () => {
    it('should return 200 with emailSent:true on resend', async () => {
      authManager.resendVerification.mockResolvedValue({
        token: 't', parentId: 'p1', childFirstName: 'João',
      });
      sendVerificationEmail.mockResolvedValue({ success: true });
      const res = await request(app).post('/api/auth/resend-verification').send({ parentEmail: 'e@ex.com' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ emailSent: true });
    });

    it('should return 400 with VALIDATION_ERROR for invalid email', async () => {
      const res = await request(app).post('/api/auth/resend-verification').send({ parentEmail: 'bad' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when parent not found', async () => {
      const err = new Error('x'); err.code = 'NOT_FOUND'; err.status = 404;
      authManager.resendVerification.mockRejectedValue(err);
      const res = await request(app).post('/api/auth/resend-verification').send({ parentEmail: 'nx@ex.com' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 429 with RATE_LIMITED after exceeding limit', async () => {
      // Resend limiter: max=10 per IP:emailPrefix(3 chars).
      // All requests share IP; emails 'e@ex.com' → prefix 'e@e'
      for (let i = 0; i < 11; i++) {
        await request(app).post('/api/auth/resend-verification').send({ parentEmail: 'e@ex.com' });
      }
      const res = await request(app).post('/api/auth/resend-verification').send({ parentEmail: 'e@ex.com' });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
    });
  });

  // ── POST /child-login ────────────────────────────────────────────────────
  describe('POST /api/auth/child-login', () => {
    it('should return 200 with tokens and child info', async () => {
      authManager.childLogin.mockResolvedValue({
        accessToken: 'access', childId: 'child123', childFirstName: 'João', isOnboardingComplete: false, refreshAvailable: true,
      });
      const res = await request(app).post('/api/auth/child-login').send({ childId: '507f1f77bcf86cd799439011', parentId: '507f1f77bcf86cd799439012' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        accessToken: 'access', childId: 'child123', childFirstName: 'João', isOnboardingComplete: false, refreshAvailable: true,
      });
    });

    it('should return 400 with VALIDATION_ERROR for invalid childId format', async () => {
      const res = await request(app).post('/api/auth/child-login').send({ childId: 'short', parentId: '507f1f77bcf86cd799439012' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with VALIDATION_ERROR for invalid parentId format', async () => {
      const res = await request(app).post('/api/auth/child-login').send({ childId: '507f1f77bcf86cd799439011', parentId: 'bad' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when child not found', async () => {
      const err = new Error('x'); err.code = 'NOT_FOUND'; err.status = 404;
      authManager.childLogin.mockRejectedValue(err);
      const res = await request(app).post('/api/auth/child-login').send({ childId: '507f1f77bcf86cd799439099', parentId: '507f1f77bcf86cd799439012' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 with FORBIDDEN when parentId mismatch', async () => {
      const err = new Error('x'); err.code = 'FORBIDDEN'; err.status = 403;
      authManager.childLogin.mockRejectedValue(err);
      const res = await request(app).post('/api/auth/child-login').send({ childId: '507f1f77bcf86cd799439011', parentId: '507f1f77bcf86cd799439099' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 with NOT_VERIFIED when child inactive', async () => {
      const err = new Error('x'); err.code = 'NOT_VERIFIED'; err.status = 403;
      authManager.childLogin.mockRejectedValue(err);
      const res = await request(app).post('/api/auth/child-login').send({ childId: '507f1f77bcf86cd799439011', parentId: '507f1f77bcf86cd799439012' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_VERIFIED');
    });
  });

  // ── POST /login (magic-link method) ────────────────────────────────────────
  describe('POST /api/auth/login (magic-link)', () => {
    it('should return 200 with magicLinkSent on success', async () => {
      authManager.loginWithMagicLink.mockResolvedValue({
        magicLinkSent: true, parentEmail: 'p@ex.com',
      });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'magic-link', parentEmail: 'p@ex.com', childFirstName: 'João' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ magicLinkSent: true, parentEmail: 'p@ex.com' });
    });

    it('should return 404 when parent not found or not verified', async () => {
      const err = new Error('x'); err.code = 'NOT_FOUND'; err.status = 404;
      authManager.loginWithMagicLink.mockRejectedValue(err);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'magic-link', parentEmail: 'nx@ex.com', childFirstName: 'João' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── POST /login (password method) ──────────────────────────────────────────
  describe('POST /api/auth/login (password)', () => {
    const CID = '507f1f77bcf86cd799439011';

    it('should return 200 with tokens on successful password login', async () => {
      authManager.loginWithPassword.mockResolvedValue({
        accessToken: 'at', refreshToken: 'rt', childId: CID,
        childFirstName: 'João', isOnboardingComplete: false,
        method: 'password', sessionId: 'sess_123',
      });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: CID, password: 'pass1234' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        accessToken: 'at', refreshToken: 'rt', childId: CID, childFirstName: 'João',
        method: 'password',
      });
    });

    it('should return 401 with INVALID_CREDENTIALS on bad password', async () => {
      const err = new Error('x'); err.code = 'INVALID_CREDENTIALS'; err.status = 401;
      authManager.loginWithPassword.mockRejectedValue(err);
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: CID, password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 404 with NOT_FOUND when child missing', async () => {
      const err = new Error('x'); err.code = 'NOT_FOUND'; err.status = 404;
      authManager.loginWithPassword.mockRejectedValue(err);
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: CID, password: 'pass1234' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── POST /logout ───────────────────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    const validToken = makeAccessToken();

    it('should return 200 with loggedOut:true on success', async () => {
      redis.exists.mockResolvedValue(0); // not blacklisted
      redis.get.mockResolvedValue(null); // no session (no sid in token)
      authManager.logout.mockResolvedValue({ loggedOut: true });
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ sessionId: 'sess_123' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ loggedOut: true });
    });

    it('should return 400 with VALIDATION_ERROR without sessionId', async () => {
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without auth header', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ sessionId: 'sess_123' });
      expect(res.status).toBe(401);
    });
  });

  // ── POST /refresh ──────────────────────────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should return 200 with new tokens on success', async () => {
      authManager.refreshSession.mockResolvedValue({
        accessToken: 'new-at', refreshToken: 'new-rt', childId: 'c1', childFirstName: 'João',
      });
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-rt' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        accessToken: 'new-at', refreshToken: 'new-rt', childId: 'c1', childFirstName: 'João',
      });
    });

    it('should return 400 with VALIDATION_ERROR for empty refreshToken', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 with INVALID_REFRESH_TOKEN', async () => {
      const err = new Error('x'); err.code = 'INVALID_REFRESH_TOKEN'; err.status = 401;
      authManager.refreshSession.mockRejectedValue(err);
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'bad-rt' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should return 401 with TOKEN_REVOKED', async () => {
      const err = new Error('x'); err.code = 'TOKEN_REVOKED'; err.status = 401;
      authManager.refreshSession.mockRejectedValue(err);
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'revoked-rt' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REVOKED');
    });
  });

  // ── GET /me ────────────────────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    const validToken = makeAccessToken();

    it('should return 200 with child info', async () => {
      redis.exists.mockResolvedValue(0); // not blacklisted
      redis.get.mockResolvedValue(null); // no session (no sid in token)
      authManager.getCurrentUser.mockResolvedValue({
        childId: 'c1', childFirstName: 'João', isOnboardingComplete: false,
        sessionCreatedAt: '2025-01-01T00:00:00Z', lastActivity: '2025-01-01T00:30:00Z',
      });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.childId).toBe('c1');
      expect(res.body.data.childFirstName).toBe('João');
    });

    it('should return 401 without auth header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 404 when child not found', async () => {
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue(null);
      const err = new Error('x'); err.code = 'NOT_FOUND'; err.status = 404;
      authManager.getCurrentUser.mockRejectedValue(err);
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── Rate limiting on /login ─────────────────────────────────────────────────
  describe('Rate limiting on /login', () => {
    it('should return 429 with RATE_LIMITED after exceeding login limiter', async () => {
      // loginLimiter: max=5 per IP per 15min; login router also has app-level check
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });
      }
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
    });
  });
});
