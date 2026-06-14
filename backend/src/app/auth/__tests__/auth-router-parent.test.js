// Contopia — Auth Router: Parent Auth Routes Tests (STORY-060)
// Tests parentAuthRouter: login, logout, refresh, me
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// Mock auth-dao.js (used by auth-manager)
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

// Mock redis
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

// Mock jsonwebtoken
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

vi.mock('../../common/validation-schemas.js', () => ({
  parentLoginSchema: {
    safeParse: vi.fn((data) => {
      if (!data.email || !data.password) {
        return { success: false, error: { issues: [{ message: 'Email and password are required' }] } };
      }
      return { success: true, data };
    }),
  },
  parentRefreshSchema: {
    safeParse: vi.fn((data) => {
      if (!data.refreshToken) {
        return { success: false, error: { issues: [{ message: 'Refresh token is required' }] } };
      }
      return { success: true, data };
    }),
  },
  parentRegisterSchema: { safeParse: vi.fn() },
  loginSchema: { safeParse: vi.fn() },
  logoutSchema: { safeParse: vi.fn() },
  refreshSchema: { safeParse: vi.fn() },
  childLoginSchema: { safeParse: vi.fn() },
}));

// Mock auth-manager
const mockAuthManager = {
  parentLogin: vi.fn(),
  parentLogout: vi.fn(),
  parentRefreshSession: vi.fn(),
  getCurrentParent: vi.fn(),
  incrementLoginAttemptsParent: vi.fn(),
  resetLoginAttemptsParent: vi.fn(),
  registerParent: vi.fn(),
};

vi.mock('../auth-manager.js', () => mockAuthManager);

// Mock auth-middleware
vi.mock('../../common/auth-middleware.js', () => ({
  authMiddleware: (req, res, next) => next(),
  parentAuthMiddleware: (req, res, next) => {
    req.parentId = 'parent123';
    req.sessionId = 'psess_abc';
    req.token = 'mock-access-token';
    next();
  },
}));

import { parentAuthRouter } from '../auth-router.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/parent', parentAuthRouter);
  return app;
}

describe('Parent Auth Router (STORY-060)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── POST /login ──────────────────────────────────────────────────────────

  describe('POST /api/parent/login', () => {
    it('should return 200 and tokens on successful login', async () => {
      mockAuthManager.incrementLoginAttemptsParent.mockResolvedValue(1);
      mockAuthManager.parentLogin.mockResolvedValue({
        accessToken: 'parent-jwt',
        refreshToken: 'parent-refresh',
        parentId: 'parent123',
        email: 'parent@test.com',
        children: [{ childId: 'c1', firstName: 'Julia' }],
        refreshAvailable: true,
        sessionId: 'psess_abc',
      });
      mockAuthManager.resetLoginAttemptsParent.mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app)
        .post('/api/parent/login')
        .send({ email: 'parent@test.com', password: 'StrongPass1' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe('parent-jwt');
      expect(res.body.data.parentId).toBe('parent123');
      expect(res.body.data.email).toBe('parent@test.com');
    });

    it('should set httpOnly cookie with parentRefreshToken on login', async () => {
      mockAuthManager.incrementLoginAttemptsParent.mockResolvedValue(1);
      mockAuthManager.parentLogin.mockResolvedValue({
        accessToken: 'jwt',
        refreshToken: 'refresh-token',
        parentId: 'p1',
        email: 'p@t.com',
        children: [],
        refreshAvailable: true,
        sessionId: 'psess_1',
      });
      mockAuthManager.resetLoginAttemptsParent.mockResolvedValue(undefined);

      const app = createApp();
      const res = await request(app)
        .post('/api/parent/login')
        .send({ email: 'p@t.com', password: 'Pass1' });

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');
      expect(refreshCookie).toContain('Path=/api/parent');
    });

    it('should return 400 on validation error', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/parent/login')
        .send({ email: '', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 429 when rate limit exceeded', async () => {
      mockAuthManager.incrementLoginAttemptsParent.mockResolvedValue(11);

      const app = createApp();
      const res = await request(app)
        .post('/api/parent/login')
        .send({ email: 'p@t.com', password: 'Pass1' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
    });

    it('should reset login attempts on successful login', async () => {
      mockAuthManager.incrementLoginAttemptsParent.mockResolvedValue(1);
      mockAuthManager.parentLogin.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt', parentId: 'p1', email: 'p@t.com',
        children: [], refreshAvailable: true, sessionId: 'psess_1',
      });
      mockAuthManager.resetLoginAttemptsParent.mockResolvedValue(undefined);

      const app = createApp();
      await request(app)
        .post('/api/parent/login')
        .send({ email: 'p@t.com', password: 'Pass1' });

      expect(mockAuthManager.resetLoginAttemptsParent).toHaveBeenCalled();
    });

    it('should return 401 on invalid credentials', async () => {
      mockAuthManager.incrementLoginAttemptsParent.mockResolvedValue(1);
      mockAuthManager.parentLogin.mockRejectedValue(
        Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' })
      );

      const app = createApp();
      const res = await request(app)
        .post('/api/parent/login')
        .send({ email: 'wrong@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  // ── POST /logout ─────────────────────────────────────────────────────────

  describe('POST /api/parent/logout', () => {
    it('should return 200 and clear cookie on successful logout', async () => {
      mockAuthManager.parentLogout.mockResolvedValue({ loggedOut: true });

      const app = createApp();
      const res = await request(app)
        .post('/api/parent/logout')
        .set('Cookie', 'parentRefreshToken=old-refresh');

      expect(res.status).toBe(200);
      expect(res.body.data.loggedOut).toBe(true);

      // Verify cookie cleared with Max-Age=0
      const cookies = res.headers['set-cookie'] || [];
      const clearCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(clearCookie).toBeDefined();
      expect(clearCookie).toContain('Max-Age=0');
      expect(clearCookie).toContain('HttpOnly');
      expect(clearCookie).toContain('SameSite=Strict');
    });

    it('should call parentLogout with correct params', async () => {
      mockAuthManager.parentLogout.mockResolvedValue({ loggedOut: true });

      const app = createApp();
      await request(app)
        .post('/api/parent/logout')
        .set('Cookie', 'parentRefreshToken=refresh-token');

      expect(mockAuthManager.parentLogout).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'parent123',
          sessionId: 'psess_abc',
          accessToken: 'mock-access-token',
          refreshToken: 'refresh-token',
        })
      );
    });
  });

  // ── POST /refresh ────────────────────────────────────────────────────────

  describe('POST /api/parent/refresh', () => {
    it('should return 200 and new tokens on successful refresh', async () => {
      mockAuthManager.parentRefreshSession.mockResolvedValue({
        accessToken: 'new-jwt',
        refreshToken: 'new-refresh',
        parentId: 'parent123',
      });

      const app = createApp();
      const res = await request(app)
        .post('/api/parent/refresh')
        .set('Cookie', 'parentRefreshToken=valid-refresh');

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe('new-jwt');
      expect(res.body.data.parentId).toBe('parent123');
    });

    it('should set new httpOnly cookie on refresh', async () => {
      mockAuthManager.parentRefreshSession.mockResolvedValue({
        accessToken: 'new-jwt',
        refreshToken: 'new-refresh',
        parentId: 'p1',
      });

      const app = createApp();
      const res = await request(app)
        .post('/api/parent/refresh')
        .set('Cookie', 'parentRefreshToken=valid-refresh');

      const cookies = res.headers['set-cookie'] || [];
      const refreshCookie = cookies.find((c) => c.startsWith('parentRefreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');
      expect(refreshCookie).toContain('Path=/api/parent');
    });

    it('should return 401 when no refresh token cookie', async () => {
      const app = createApp();
      const res = await request(app).post('/api/parent/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 on invalid refresh token', async () => {
      mockAuthManager.parentRefreshSession.mockRejectedValue(
        Object.assign(new Error('Invalid refresh token'), { status: 401, code: 'INVALID_REFRESH_TOKEN' })
      );

      const app = createApp();
      const res = await request(app)
        .post('/api/parent/refresh')
        .set('Cookie', 'parentRefreshToken=bad-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  // ── GET /me ──────────────────────────────────────────────────────────────

  describe('GET /api/parent/me', () => {
    it('should return 200 with parent info', async () => {
      mockAuthManager.getCurrentParent.mockResolvedValue({
        parentId: 'parent123',
        email: 'parent@test.com',
        children: [{ childId: 'c1', firstName: 'Julia' }],
        dashNav: ['activity', 'export', 'delete', 'privacy'],
      });

      const app = createApp();
      const res = await request(app).get('/api/parent/me');

      expect(res.status).toBe(200);
      expect(res.body.data.parentId).toBe('parent123');
      expect(res.body.data.email).toBe('parent@test.com');
    });

    it('should return 404 when parent not found', async () => {
      mockAuthManager.getCurrentParent.mockRejectedValue(
        Object.assign(new Error('Parent not found'), { status: 404, code: 'NOT_FOUND' })
      );

      const app = createApp();
      const res = await request(app).get('/api/parent/me');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
