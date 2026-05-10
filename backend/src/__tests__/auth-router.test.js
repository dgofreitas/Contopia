// Contopia — Auth Router Integration Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock ALL dependencies BEFORE router loads ──────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('mongoose', () => {
  const Schema = vi.fn();
  Schema.Types = { ObjectId: String };
  return {
    default: {
      Schema,
      Types: Schema.Types,
      model: vi.fn().mockReturnValue({
        findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }) }),
      }),
    },
  };
});

vi.mock('rate-limit-redis', () => ({}));

vi.mock('../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), call: vi.fn(),
    status: 'ready', on: vi.fn(),
  },
}));

vi.mock('../app/auth/auth-manager.js');
vi.mock('../app/common/email-service.js');
vi.mock('../app/auth/auth-model.js', () => {
  const findOne = vi.fn().mockReturnValue({ lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }) });
  return { Parent: { findOne }, Child: { findOne } };
});

import request from 'supertest';
import express from 'express';
import authRouter from '../app/auth/auth-router.js';
import * as authManager from '../app/auth/auth-manager.js';
import { sendVerificationEmail } from '../app/common/email-service.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should return 201 on successful registration', async () => {
      authManager.registerParentAndChild.mockResolvedValue({
        parent: { _id: 'parent123', email: 'test@example.com' },
        child: { _id: 'child123', firstName: 'João' },
        token: 'mock-token',
      });
      sendVerificationEmail.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'test@example.com', childFirstName: 'João' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual({ parentId: 'parent123', emailSent: true });
    });

    it('should return 200 with resent:true on idempotent registration', async () => {
      authManager.resendVerification.mockResolvedValue({
        token: 'mock-token',
        parent: { _id: 'parent123' },
      });
      sendVerificationEmail.mockResolvedValue({ success: true });

      // Re-mock auth-model to return parent + pending child for the idempotent path
      const { Parent, Child } = await vi.importMock('../app/auth/auth-model.js');
      Parent.findOne.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ _id: 'parent123', email: 'test@example.com' }) }),
      });
      Child.findOne.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ _id: 'child123', firstName: 'João', isActive: false }) }),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'test@example.com', childFirstName: 'João' });

      expect(response.status).toBe(200);
    });

    it('should return 400 on validation error', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'invalid-email', childFirstName: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 on duplicate active child', async () => {
      // Set pending child to null so route falls through to registerParentAndChild
      const { Parent, Child } = await vi.importMock('../app/auth/auth-model.js');
      Parent.findOne.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ _id: 'parent123', email: 'test@example.com' }) }),
      });
      // No pending child → route skips idempotent path
      Child.findOne.mockReturnValue({
        lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
      });

      const error = new Error('dup'); error.code = 'ACCOUNT_EXISTS'; error.status = 409;
      authManager.registerParentAndChild.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'test@example.com', childFirstName: 'João' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('ACCOUNT_EXISTS');
    });
  });

  describe('GET /api/auth/verify/:token', () => {
    it('should return 200 on successful verification', async () => {
      authManager.verifyEmail.mockResolvedValue({ childId: 'child123' });
      const response = await request(app).get('/api/auth/verify/mock-token');
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ childId: 'child123' });
    });

    it('should return 404 when token not found', async () => {
      const error = new Error('x'); error.code = 'TOKEN_NOT_FOUND'; error.status = 404;
      authManager.verifyEmail.mockRejectedValue(error);
      const response = await request(app).get('/api/auth/verify/invalid-token');
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TOKEN_NOT_FOUND');
    });

    it('should return 410 when token expired', async () => {
      const error = new Error('x'); error.code = 'TOKEN_EXPIRED'; error.status = 410;
      authManager.verifyEmail.mockRejectedValue(error);
      const response = await request(app).get('/api/auth/verify/expired-token');
      expect(response.status).toBe(410);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should return 200 on successful resend', async () => {
      authManager.resendVerification.mockResolvedValue({
        token: 'new-mock-token',
        parent: { _id: 'parent123', email: 'test@example.com' },
        child: { _id: 'child123', firstName: 'João' },
      });
      sendVerificationEmail.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ parentEmail: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ emailSent: true });
    });

    it('should return 400 on validation error', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ parentEmail: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when parent not found', async () => {
      const error = new Error('x'); error.code = 'NOT_FOUND'; error.status = 404;
      authManager.resendVerification.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ parentEmail: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/auth/child-login', () => {
    it('should return 200 on successful login', async () => {
      authManager.childLogin.mockResolvedValue({
        accessToken: 'mock-access-token',
        childId: 'child123',
        childFirstName: 'João',
        isOnboardingComplete: false,
      });

      const response = await request(app)
        .post('/api/auth/child-login')
        .send({ childId: 'child123', parentId: 'parent123' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        accessToken: 'mock-access-token',
        childId: 'child123',
        childFirstName: 'João',
        isOnboardingComplete: false,
      });
    });

    it('should return 400 on validation error', async () => {
      const response = await request(app)
        .post('/api/auth/child-login')
        .send({ childId: '', parentId: 'parent123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when child not found', async () => {
      const error = new Error('x'); error.code = 'NOT_FOUND'; error.status = 404;
      authManager.childLogin.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/auth/child-login')
        .send({ childId: 'nonexistent', parentId: 'parent123' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when parentId mismatch', async () => {
      const error = new Error('x'); error.code = 'FORBIDDEN'; error.status = 403;
      authManager.childLogin.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/auth/child-login')
        .send({ childId: 'child123', parentId: 'wrong-parent' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 when child not verified', async () => {
      const error = new Error('x'); error.code = 'NOT_VERIFIED'; error.status = 403;
      authManager.childLogin.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/auth/child-login')
        .send({ childId: 'child123', parentId: 'parent123' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('NOT_VERIFIED');
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 after exceeding register limit', async () => {
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({ parentEmail: `test${i}@example.com`, childFirstName: 'João' });
      }
      const response = await request(app)
        .post('/api/auth/register')
        .send({ parentEmail: 'test7@example.com', childFirstName: 'João' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMITED');
    });

    it('should return 429 after exceeding resend limit', async () => {
      for (let i = 0; i < 11; i++) {
        await request(app)
          .post('/api/auth/resend-verification')
          .send({ parentEmail: 'test@example.com' });
      }
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ parentEmail: 'test@example.com' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMITED');
    });
  });
});
