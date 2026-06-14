// Contopia — Dashboard Regression API Tests (STORY-061, Task 3A)
// STORY-052 regression: all parent dashboard endpoints with cookie-based auth
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Readable } from 'node:stream';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(),
    incr: vi.fn(), expire: vi.fn(), keys: vi.fn(), call: vi.fn(),
    status: 'ready', on: vi.fn(), scanIterator: vi.fn(),
    ttl: vi.fn().mockResolvedValue(1500),
  },
}));

vi.mock('../../auth/auth-manager.js', () => ({
  hashToken: vi.fn((t) => `hashed:${t}`),
}));

// Do NOT mock jsonwebtoken or express-rate-limit — parent-router doesn't import them directly
// We need real jwt.verify for parentAuthMiddleware

const mockParentManager = vi.hoisted(() => ({
  getParentDashboardData: vi.fn(),
  getChildActivitySummary: vi.fn(),
  getChildBookList: vi.fn(),
  exportChildData: vi.fn(),
  getDeletionStatus: vi.fn(),
  requestAccountDeletion: vi.fn(),
  cancelAccountDeletion: vi.fn(),
  getPrivacyPolicy: vi.fn(),
}));

vi.mock('../parent-manager.js', () => mockParentManager);

vi.mock('../parent-dao.js', () => ({
  findParentByIdWithChild: vi.fn(),
  findPendingDeletionByChild: vi.fn(),
}));

import parentRouter from '../parent-router.js';
import redis from '../../../config/redis.js';

const PARENT_ID = '507f1f77bcf86cd799439011';

function makeParentToken() {
  return jwt.sign(
    { sub: PARENT_ID, type: 'access', role: 'parent', sid: 'psess_regression' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '30m' },
  );
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.id = 'req-regression-test';
    next();
  });
  app.use('/api/parent', parentRouter);
  return app;
}

describe('Dashboard Regression API (STORY-061, Task 3A — STORY-052 Regression)', () => {
  let validToken;

  beforeAll(() => {
    validToken = makeParentToken();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const mockAsyncIterator = async function* () {
      yield `parentSession:${PARENT_ID}:psess_regression`;
    };
    redis.scanIterator.mockReturnValue(mockAsyncIterator());
    redis.get.mockImplementation((key) => {
      if (key === `parentSession:${PARENT_ID}:psess_regression`) {
        return Promise.resolve(JSON.stringify({
          sessionId: 'psess_regression',
          lastActivity: new Date().toISOString(),
        }));
      }
      return Promise.resolve(null);
    });
    redis.set.mockResolvedValue('OK');
    redis.exists.mockResolvedValue(0);
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
  });

  function withAuth() {
    const app = buildApp();
    return {
      get: (url) => request(app).get(url).set('Authorization', `Bearer ${validToken}`),
      post: (url) => request(app).post(url).set('Authorization', `Bearer ${validToken}`),
    };
  }

  function withoutAuth() {
    const app = buildApp();
    return {
      get: (url) => request(app).get(url),
      post: (url) => request(app).post(url),
    };
  }

  // ── GET /dashboard ─────────────────────────────────────────────────────

  describe('GET /api/parent/dashboard', () => {
    it('should return 200 with dashboard data for parent', async () => {
      mockParentManager.getParentDashboardData.mockResolvedValue({
        email: 'parent@test.com',
        children: [{ childId: 'c1', firstName: 'Julia', avatarSeed: 's1', onboardingCompleted: true }],
        hasChildren: true,
      });

      const res = await withAuth().get('/api/parent/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('parent@test.com');
      expect(res.body.data.hasChildren).toBe(true);
    });

    it('should return 200 for parent with empty children', async () => {
      mockParentManager.getParentDashboardData.mockResolvedValue({
        email: 'parent@test.com', children: [], hasChildren: false,
      });

      const res = await withAuth().get('/api/parent/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.data.hasChildren).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const res = await withoutAuth().get('/api/parent/dashboard');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /activity/summary ───────────────────────────────────────────────

  describe('GET /api/parent/activity/summary', () => {
    it('should return 200 with activity summary', async () => {
      mockParentManager.getChildActivitySummary.mockResolvedValue({
        booksWritten: 5, booksRead: 3, readingTimeMinutes: 45,
        childFirstName: 'Julia', childId: 'c1', hasActivity: true,
      });

      const res = await withAuth().get('/api/parent/activity/summary');
      expect(res.status).toBe(200);
      expect(res.body.data.booksWritten).toBe(5);
    });

    it('should return 200 with empty state when no activity', async () => {
      mockParentManager.getChildActivitySummary.mockResolvedValue({
        booksWritten: 0, booksRead: 0, readingTimeMinutes: 0,
        childFirstName: null, childId: null, hasActivity: false,
      });

      const res = await withAuth().get('/api/parent/activity/summary');
      expect(res.status).toBe(200);
      expect(res.body.data.hasActivity).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const res = await withoutAuth().get('/api/parent/activity/summary');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /activity/books ─────────────────────────────────────────────────

  describe('GET /api/parent/activity/books', () => {
    it('should return 200 with paginated book list', async () => {
      mockParentManager.getChildBookList.mockResolvedValue({
        books: [{ bookId: 'b1', title: 'A Aventura', coverThumbnailUrl: '/thumb.png', status: 'published', updatedAt: '2026-06-05T10:00:00Z' }],
        total: 1, limit: 20, offset: 0,
      });

      const res = await withAuth().get('/api/parent/activity/books');
      expect(res.status).toBe(200);
      expect(res.body.data.books).toHaveLength(1);
    });

    it('should respect pagination query params', async () => {
      mockParentManager.getChildBookList.mockResolvedValue({ books: [], total: 0, limit: 10, offset: 5 });

      await withAuth().get('/api/parent/activity/books?limit=10&offset=5');
      expect(mockParentManager.getChildBookList).toHaveBeenCalledWith(PARENT_ID, { limit: 10, skip: 5 });
    });

    it('should enforce max limit of 100', async () => {
      mockParentManager.getChildBookList.mockResolvedValue({ books: [], total: 0, limit: 100, offset: 0 });

      await withAuth().get('/api/parent/activity/books?limit=999');
      expect(mockParentManager.getChildBookList).toHaveBeenCalledWith(PARENT_ID, { limit: 100, skip: 0 });
    });

    it('should return 401 without auth token', async () => {
      const res = await withoutAuth().get('/api/parent/activity/books');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /export ─────────────────────────────────────────────────────────

  describe('GET /api/parent/export', () => {
    it('should return 200 with Content-Type application/zip', async () => {
      const mockStream = new Readable({ read() { this.push('zip-data'); this.push(null); } });
      mockParentManager.exportChildData.mockResolvedValue({ archive: mockStream, childFirstName: 'Julia' });

      const res = await withAuth().get('/api/parent/export');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/zip');
    });

    it('should exclude password field from response', async () => {
      const mockStream = new Readable({ read() { this.push('zip-data'); this.push(null); } });
      mockParentManager.exportChildData.mockResolvedValue({ archive: mockStream, childFirstName: 'Julia' });

      const res = await withAuth().get('/api/parent/export');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 401 without auth token', async () => {
      const res = await withoutAuth().get('/api/parent/export');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /deletion-request/status ────────────────────────────────────────

  describe('GET /api/parent/deletion-request/status', () => {
    it('should return 200 with pending deletion status', async () => {
      mockParentManager.getDeletionStatus.mockResolvedValue({
        hasPendingDeletion: true, childId: 'c1',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      });

      const res = await withAuth().get('/api/parent/deletion-request/status');
      expect(res.status).toBe(200);
      expect(res.body.data.hasPendingDeletion).toBe(true);
    });

    it('should return 200 with no pending deletion', async () => {
      mockParentManager.getDeletionStatus.mockResolvedValue({ hasPendingDeletion: false });

      const res = await withAuth().get('/api/parent/deletion-request/status');
      expect(res.status).toBe(200);
      expect(res.body.data.hasPendingDeletion).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const res = await withoutAuth().get('/api/parent/deletion-request/status');
      expect(res.status).toBe(401);
    });
  });

  // ── POST /deletion-request ──────────────────────────────────────────────

  describe('POST /api/parent/deletion-request', () => {
    it('should return 200 with pending status when confirmText is DELETE', async () => {
      mockParentManager.requestAccountDeletion.mockResolvedValue({
        deletionRequestId: 'del123', childId: 'c1', status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        confirmationEmailSent: true,
      });

      const res = await withAuth()
        .post('/api/parent/deletion-request')
        .send({ confirmText: 'DELETE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending');
    });

    it('should return 400 when confirmText is not DELETE', async () => {
      const res = await withAuth()
        .post('/api/parent/deletion-request')
        .send({ confirmText: 'delete' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without auth token', async () => {
      const res = await withoutAuth()
        .post('/api/parent/deletion-request')
        .send({ confirmText: 'DELETE' });

      expect(res.status).toBe(401);
    });
  });

  // ── POST /deletion-request/cancel ───────────────────────────────────────

  describe('POST /api/parent/deletion-request/cancel', () => {
    it('should return 200 with cancelled status', async () => {
      mockParentManager.cancelAccountDeletion.mockResolvedValue({
        deletionRequestId: 'del123', status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });

      const res = await withAuth()
        .post('/api/parent/deletion-request/cancel')
        .send({ childId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should return 400 with invalid childId format', async () => {
      const res = await withAuth()
        .post('/api/parent/deletion-request/cancel')
        .send({ childId: 'not-a-valid-id' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without auth token', async () => {
      const res = await withoutAuth()
        .post('/api/parent/deletion-request/cancel')
        .send({ childId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /privacy-policy ─────────────────────────────────────────────────

  describe('GET /api/parent/privacy-policy', () => {
    it('should return 200 with privacy policy content', async () => {
      mockParentManager.getPrivacyPolicy.mockResolvedValue({
        supportEmail: 'support@contopia.com',
        content: { sections: [{ id: 'what-we-collect', title: 'O que coletamos' }], compliance: [] },
      });

      const res = await withAuth().get('/api/parent/privacy-policy');
      expect(res.status).toBe(200);
      expect(res.body.data.supportEmail).toBe('support@contopia.com');
    });

    it('should return 401 without auth token', async () => {
      const res = await withoutAuth().get('/api/parent/privacy-policy');
      expect(res.status).toBe(401);
    });
  });

  // ── Auth Isolation ──────────────────────────────────────────────────────

  describe('Auth isolation — 401 on all parent endpoints without auth', () => {
    const endpoints = [
      { method: 'get', url: '/api/parent/dashboard', body: null },
      { method: 'get', url: '/api/parent/activity/summary', body: null },
      { method: 'get', url: '/api/parent/activity/books', body: null },
      { method: 'get', url: '/api/parent/export', body: null },
      { method: 'get', url: '/api/parent/deletion-request/status', body: null },
      { method: 'post', url: '/api/parent/deletion-request', body: { confirmText: 'DELETE' } },
      { method: 'post', url: '/api/parent/deletion-request/cancel', body: { childId: '507f1f77bcf86cd799439011' } },
      { method: 'get', url: '/api/parent/privacy-policy', body: null },
    ];

    for (const ep of endpoints) {
      it(`${ep.method.toUpperCase()} ${ep.url} returns 401 without auth`, async () => {
        const req = withoutAuth();
        const res = ep.method === 'get'
          ? await req.get(ep.url)
          : await req.post(ep.url).send(ep.body);
        expect(res.status).toBe(401);
      });
    }
  });
});
