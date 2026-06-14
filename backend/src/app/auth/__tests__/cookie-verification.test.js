// Contopia — Cookie Security Verification Tests (STORY-061, Task 2A)
// Verifies parentRefreshToken cookie flags: httpOnly, SameSite, Path, Secure
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

vi.mock('../auth-dao.js', () => ({
  findParentByEmail: vi.fn(),
  findParentById: vi.fn(),
  findParentByIdWithPassword: vi.fn(),
  createParent: vi.fn(),
  findChildrenByParentId: vi.fn(),
  updateParentLastLogin: vi.fn(),
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
  hashIdentifier: vi.fn((v) => `hashed:${v}`),
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    scanIterator: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
    ttl: vi.fn().mockResolvedValue(1500),
    quit: vi.fn().mockResolvedValue(undefined),
    call: vi.fn(),
    status: 'ready',
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn(),
    decode: vi.fn(),
  },
  sign: vi.fn().mockReturnValue('mock-jwt-token'),
  verify: vi.fn(),
  decode: vi.fn(),
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next(),
}));

vi.mock('rate-limit-redis', () => ({}));

const mockAuthManager = vi.hoisted(() => ({
  registerParent: vi.fn(),
  parentLogin: vi.fn(),
  parentLogout: vi.fn(),
  parentRefreshSession: vi.fn(),
  incrementLoginAttemptsParent: vi.fn(),
  resetLoginAttemptsParent: vi.fn(),
}));

vi.mock('../auth-manager.js', () => mockAuthManager);

vi.mock('../../common/auth-middleware.js', () => ({
  authMiddleware: (req, res, next) => next(),
  parentAuthMiddleware: (req, res, next) => {
    req.parentId = 'parent123';
    req.sessionId = 'psess_abc';
    req.token = 'mock-token';
    next();
  },
}));

import authRouter, { parentAuthRouter } from '../auth-router.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseCookieValue(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/^parentRefreshToken=([^;]+)/);
  return match ? match[1] : null;
}

function hasCookieFlag(setCookieHeader, flag) {
  if (!setCookieHeader) return false;
  return setCookieHeader.includes(flag);
}

function buildAuthApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => {
    req.id = 'test-request-id';
    next();
  });
  app.use('/api/auth', authRouter);
  return app;
}

function buildParentApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => {
    req.id = 'test-request-id';
    next();
  });
  app.use('/api/parent', parentAuthRouter);
  return app;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Cookie Security Verification (STORY-061)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  // ── Register sets cookie ─────────────────────────────────────────────────

  describe('POST /api/auth/register — cookie flags on register', () => {
    it('should set parentRefreshToken cookie with httpOnly flag', async () => {
      mockAuthManager.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'refresh-val',
        parentId: 'p1', email: 'p@t.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });

      const app = buildAuthApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'p@t.com', password: 'StrongPass1', ageConsent: true });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(hasCookieFlag(refreshCookie, 'HttpOnly')).toBe(true);
    });

    it('should set cookie with SameSite=Strict', async () => {
      mockAuthManager.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt',
        parentId: 'p1', email: 'p@t.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });

      const app = buildAuthApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'p@t.com', password: 'StrongPass1', ageConsent: true });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toContain('SameSite=Strict');
    });

    it('should set cookie with Path=/api/parent', async () => {
      mockAuthManager.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt',
        parentId: 'p1', email: 'p@t.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });

      const app = buildAuthApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'p@t.com', password: 'StrongPass1', ageConsent: true });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toContain('Path=/api/parent');
    });

    it('should set Secure flag when NODE_ENV=production', async () => {
      process.env.NODE_ENV = 'production';

      mockAuthManager.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt',
        parentId: 'p1', email: 'p@t.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });

      const app = buildAuthApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'p@t.com', password: 'StrongPass1', ageConsent: true });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toContain('Secure');
    });

    it('should NOT set Secure flag in non-production (dev/staging) mode', async () => {
      process.env.NODE_ENV = 'development';

      mockAuthManager.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt',
        parentId: 'p1', email: 'p@t.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });

      const app = buildAuthApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'p@t.com', password: 'StrongPass1', ageConsent: true });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      // In development, Secure flag should NOT be present
      expect(refreshCookie).not.toContain('Secure');
    });

    it('should set cookie with a non-empty refresh token value', async () => {
      mockAuthManager.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt-value-123',
        parentId: 'p1', email: 'p@t.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });

      const app = buildAuthApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'p@t.com', password: 'StrongPass1', ageConsent: true });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      const cookieValue = parseCookieValue(refreshCookie);
      expect(cookieValue).toBe('rt-value-123');
    });
  });

  // ── Login sets cookie ────────────────────────────────────────────────────

  describe('POST /api/parent/login — cookie flags on login', () => {
    it('should set httpOnly, SameSite=Strict, Path=/api/parent on login', async () => {
      mockAuthManager.incrementLoginAttemptsParent.mockResolvedValue(1);
      mockAuthManager.parentLogin.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt',
        parentId: 'p1', email: 'p@t.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });
      mockAuthManager.resetLoginAttemptsParent.mockResolvedValue(undefined);

      const app = buildParentApp();
      const res = await request(app)
        .post('/api/parent/login')
        .send({ email: 'p@t.com', password: 'StrongPass1' });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');
      expect(refreshCookie).toContain('Path=/api/parent');
    });

    it('should set Secure flag on login in production', async () => {
      process.env.NODE_ENV = 'production';
      mockAuthManager.incrementLoginAttemptsParent.mockResolvedValue(1);
      mockAuthManager.parentLogin.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt',
        parentId: 'p1', email: 'p@t.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });
      mockAuthManager.resetLoginAttemptsParent.mockResolvedValue(undefined);

      const app = buildParentApp();
      const res = await request(app)
        .post('/api/parent/login')
        .send({ email: 'p@t.com', password: 'StrongPass1' });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toContain('Secure');
    });
  });

  // ── Logout clears cookie ─────────────────────────────────────────────────

  describe('POST /api/parent/logout — cookie cleared', () => {
    it('should clear parentRefreshToken cookie with Max-Age=0 on logout', async () => {
      mockAuthManager.parentLogout.mockResolvedValue({ loggedOut: true });

      const app = buildParentApp();
      const res = await request(app)
        .post('/api/parent/logout')
        .set('Cookie', 'parentRefreshToken=old-refresh');

      const cookies = res.headers['set-cookie'] || [];
      const clearCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(clearCookie).toBeDefined();

      // Verify cookie is cleared: Max-Age=0 means immediate expiration
      expect(clearCookie).toContain('Max-Age=0');
      // The value may be empty or absent — Max-Age=0 is the signal
    });

    it('should clear cookie with same security flags (httpOnly, SameSite, Path)', async () => {
      mockAuthManager.parentLogout.mockResolvedValue({ loggedOut: true });

      const app = buildParentApp();
      const res = await request(app)
        .post('/api/parent/logout')
        .set('Cookie', 'parentRefreshToken=old-refresh');

      const cookies = res.headers['set-cookie'] || [];
      const clearCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(clearCookie).toContain('HttpOnly');
      expect(clearCookie).toContain('SameSite=Strict');
      expect(clearCookie).toContain('Path=/api/parent');
    });
  });

  // ── Refresh sets new cookie ──────────────────────────────────────────────

  describe('POST /api/parent/refresh — sets new cookie', () => {
    it('should set a new parentRefreshToken cookie with full security flags', async () => {
      mockAuthManager.parentRefreshSession.mockResolvedValue({
        accessToken: 'new-jwt', refreshToken: 'new-rt',
        parentId: 'p1',
      });

      const app = buildParentApp();
      const res = await request(app)
        .post('/api/parent/refresh')
        .set('Cookie', 'parentRefreshToken=valid-refresh');

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');
      expect(refreshCookie).toContain('Path=/api/parent');

      const cookieValue = parseCookieValue(refreshCookie);
      expect(cookieValue).toBe('new-rt');
    });
  });
});
