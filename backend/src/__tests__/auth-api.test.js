// Contopia — Auth API Integration Tests (supertest)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock ALL dependencies BEFORE router loads ──────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('rate-limit-redis', () => ({}));

vi.mock('../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), call: vi.fn(),
    status: 'ready', on: vi.fn(),
  },
}));

vi.mock('../app/auth/auth-manager.js');
vi.mock('../app/common/email-service.js');

import request from 'supertest';
import express from 'express';
import authRouter from '../app/auth/auth-router.js';
import * as authManager from '../app/auth/auth-manager.js';
import { sendVerificationEmail } from '../app/common/email-service.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
