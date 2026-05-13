// Contopia — Auth Rate Limit Tests (STORY-002)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock ALL dependencies BEFORE router loads ──────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('rate-limit-redis', () => ({}));

// Stateful rate-limiter mock: per-key counters, reset in beforeEach
const rateLimitCounters = new Map();
const rateLimitMaxes = new Map();

vi.mock('express-rate-limit', () => ({
  default: vi.fn((opts) => {
    const max = opts.max || 5;
    return (req, res, next) => {
      const key = opts.keyGenerator ? opts.keyGenerator(req) : req.ip;
      const current = rateLimitCounters.get(key) || 0;
      const effectiveMax = rateLimitMaxes.get(key) ?? max;
      rateLimitCounters.set(key, current + 1);
      // Set rate-limit headers
      res.setHeader('RateLimit-Limit', effectiveMax);
      res.setHeader('RateLimit-Remaining', Math.max(0, effectiveMax - current - 1));
      if (current >= effectiveMax) {
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

import request from 'supertest';
import express from 'express';
import authRouter from '../app/auth/auth-router.js';
import * as authManager from '../app/auth/auth-manager.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Rate Limiting (STORY-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitCounters.clear();
    rateLimitMaxes.clear();
  });

  // ── Login rate limiter ──────────────────────────────────────────────────
  // loginLimiter: max=5 per 15min/IP

  describe('POST /api/auth/login — rate limiter (5 req / 15min / IP)', () => {
    it('should allow 5 login requests then return 429 on the 6th', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      authManager.loginWithPassword.mockResolvedValue({
        accessToken: 'at', refreshToken: 'rt', childId: '507f1f77bcf86cd799439011',
        childFirstName: 'João', isOnboardingComplete: true, method: 'password',
        sessionId: 'sess_1',
      });

      // First 5 should succeed (rate limiter allows 5)
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });
        // May be 200 or error from auth-manager, but NOT 429
        expect(res.status).not.toBe(429);
      }

      // 6th request should hit the express-rate-limit limiter → 429
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
    });

    it('should return 429 with RATE_LIMITED message', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      authManager.loginWithPassword.mockResolvedValue({
        accessToken: 'at', refreshToken: 'rt', childId: 'id1',
        childFirstName: 'A', isOnboardingComplete: false, method: 'password',
        sessionId: 'sess_2',
      });

      // Exhaust the limiter
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(res.body.error.message).toBeDefined();
    });

    it('should also rate-limit magic-link login requests', async () => {
      authManager.loginWithMagicLink.mockResolvedValue({
        magicLinkSent: true, parentEmail: 'p@ex.com',
      });

      // Exhaust the limiter with magic-link requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ method: 'magic-link', parentEmail: `p${i}@ex.com`, childFirstName: 'João' });
      }

      // 6th magic-link request should be rate-limited
      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'magic-link', parentEmail: 'p5@ex.com', childFirstName: 'João' });

      expect(res.status).toBe(429);
      expect(res.body.error).toBeDefined();
    });

    it('should return standard rate-limit headers on 429', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(1);
      authManager.loginWithPassword.mockResolvedValue({
        accessToken: 'at', refreshToken: 'rt', childId: 'id1',
        childFirstName: 'A', isOnboardingComplete: false, method: 'password',
        sessionId: 'sess_3',
      });

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });

      expect(res.status).toBe(429);
      // express-rate-limit sets RateLimit-* headers when standardHeaders: true
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  // ── App-level login rate check (incrementLoginAttempts > 5) ─────────────

  describe('POST /api/auth/login — app-level rate check (incrementLoginAttempts)', () => {
    it('should return 429 from router when incrementLoginAttempts > 5 (before auth-manager call)', async () => {
      // Simulate that IP already has 6 attempts
      authManager.incrementLoginAttempts.mockResolvedValue(6);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      // loginWithPassword should NOT be called — blocked at attempt count
      expect(authManager.loginWithPassword).not.toHaveBeenCalled();
    });

    it('should allow login when incrementLoginAttempts <= 5', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(3);
      authManager.loginWithPassword.mockResolvedValue({
        accessToken: 'at', refreshToken: 'rt', childId: 'c1',
        childFirstName: 'João', isOnboardingComplete: false, method: 'password',
        sessionId: 'sess_ok',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });

      expect(res.status).toBe(200);
      expect(authManager.loginWithPassword).toHaveBeenCalled();
    });

    it('should allow login when incrementLoginAttempts = 5 (boundary)', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(5);
      authManager.loginWithPassword.mockResolvedValue({
        accessToken: 'at', refreshToken: 'rt', childId: 'c1',
        childFirstName: 'João', isOnboardingComplete: false, method: 'password',
        sessionId: 'sess_boundary',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });

      expect(res.status).toBe(200);
    });

    it('should reject at 6th attempt (incrementLoginAttempts = 6)', async () => {
      authManager.incrementLoginAttempts.mockResolvedValue(6);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ method: 'password', childId: '507f1f77bcf86cd799439011', password: 'pass1234' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
    });
  });
});