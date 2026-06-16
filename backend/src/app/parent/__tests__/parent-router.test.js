// Contopia — Parent Router Tests (STORY-053: Activity Routes)
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';
import { Readable } from 'node:stream';

// ── Mocks (must be before all imports) ────────────────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(),
    incr: vi.fn(), expire: vi.fn(), keys: vi.fn(), call: vi.fn(),
    ttl: vi.fn(), status: 'ready', on: vi.fn(), scanIterator: vi.fn(),
  },
}));

vi.mock('../../auth/auth-manager.js', () => ({
  hashToken: vi.fn((t) => `hashed:${t}`),
}));

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../parent-manager.js', () => ({
  getChildActivitySummary: vi.fn(),
  getChildBookList: vi.fn(),
  getParentDashboardData: vi.fn(),
  exportChildData: vi.fn(),
  requestAccountDeletion: vi.fn(),
  cancelAccountDeletion: vi.fn(),
  getDeletionStatus: vi.fn(),
}));

vi.mock('../parent-dao.js', () => ({
  findParentByIdWithChild: vi.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';
import { parentAuthMiddleware } from '../../common/auth-middleware.js';
import parentRouter from '../parent-router.js';
import * as parentManager from '../parent-manager.js';
import * as parentDao from '../parent-dao.js';
import redis from '../../../config/redis.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const PARENT_ID = new mongoose.Types.ObjectId().toString();

function makeParentToken() {
  return jwt.sign(
    { sub: PARENT_ID, type: 'access', role: 'parent', sid: 'sess_parent' },
    process.env.JWT_SECRET,
    { expiresIn: '30m' },
  );
}

// ── Test App ──────────────────────────────────────────────────────────────────
const testApp = express();
testApp.use(express.json());
testApp.use((req, res, next) => { req.id = 'req-test-123'; next(); });
testApp.use('/api/parent', parentRouter);

describe('Parent Router — STORY-053', () => {
  const validToken = makeParentToken();

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    vi.clearAllMocks();

    // Default redis mocks for parentAuthMiddleware:
    // exists(bl:hash) → 0 (not blacklisted)
    // asyncIterator: simulate a parent session scan with one result
    const mockAsyncIterator = async function* () {
      yield `parentSession:${PARENT_ID}:sess_parent`;
    };
    redis.scanIterator.mockReturnValue(mockAsyncIterator());
    redis.get.mockImplementation((key) => {
      if (key === `parentSession:${PARENT_ID}:sess_parent`) {
        return Promise.resolve(JSON.stringify({ sessionId: 'sess_parent', lastActivity: new Date().toISOString() }));
      }
      return Promise.resolve(JSON.stringify({ lastActivity: new Date().toISOString() }));
    });
    redis.set.mockResolvedValue('OK');
    redis.exists.mockResolvedValue(0);
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    redis.ttl.mockResolvedValue(1800);
  });

  // ── GET /dashboard — STORY-058 ────────────────────────────────────────────────

  describe('GET /api/parent/dashboard', () => {
    it('should return 200 with dashboard data for parent with children', async () => {
      // Arrange
      parentManager.getParentDashboardData.mockResolvedValue({
        email: 'parent@example.com',
        children: [
          { childId: 'c1', firstName: 'Julia', avatarSeed: 'seed1', onboardingCompleted: true, createdAt: '2026-01-15T10:00:00Z' },
          { childId: 'c2', firstName: 'Carlos', avatarSeed: 'seed2', onboardingCompleted: false, createdAt: '2026-03-20T14:30:00Z' },
        ],
        hasChildren: true,
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('parent@example.com');
      expect(res.body.data.hasChildren).toBe(true);
      expect(res.body.data.children).toHaveLength(2);
      expect(res.body.data.children[0].firstName).toBe('Julia');
      expect(res.body.data.children[1].firstName).toBe('Carlos');
    });

    it('should return 200 with empty state when parent has no children', async () => {
      // Arrange
      parentManager.getParentDashboardData.mockResolvedValue({
        email: 'newparent@example.com',
        children: [],
        hasChildren: false,
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('newparent@example.com');
      expect(res.body.data.hasChildren).toBe(false);
      expect(res.body.data.children).toEqual([]);
    });

    it('should return 404 when parent not found', async () => {
      // Arrange
      parentManager.getParentDashboardData.mockRejectedValue({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Parent not found',
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      // Act
      const res = await request(testApp).get('/api/parent/dashboard');

      // Assert
      expect(res.status).toBe(401);
    });

    it('should call getParentDashboardData with parentId from auth', async () => {
      // Arrange
      parentManager.getParentDashboardData.mockResolvedValue({
        email: 'parent@example.com',
        children: [],
        hasChildren: false,
      });

      // Act
      await request(testApp)
        .get('/api/parent/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(parentManager.getParentDashboardData).toHaveBeenCalledWith(PARENT_ID);
    });

    it('should return 500 with generic message when manager throws unexpected error', async () => {
      // Arrange
      parentManager.getParentDashboardData.mockRejectedValue(new Error('Unexpected DB error'));

      // Act
      const res = await request(testApp)
        .get('/api/parent/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('Something went wrong — please try again later');
    });
  });

  // ── GET /activity/summary ────────────────────────────────────────────────────

  describe('GET /api/parent/activity/summary', () => {
    it('should return 200 with activity summary data', async () => {
      // Arrange
      parentManager.getChildActivitySummary.mockResolvedValue({
        booksWritten: 5,
        booksRead: 3,
        readingTimeMinutes: 45,
        childFirstName: 'Julia',
        childId: 'c1',
        hasActivity: true,
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/activity/summary')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.booksWritten).toBe(5);
      expect(res.body.data.booksRead).toBe(3);
      expect(res.body.data.readingTimeMinutes).toBe(45);
      expect(res.body.data.hasActivity).toBe(true);
    });

    it('should return 200 with empty state when no activity', async () => {
      // Arrange
      parentManager.getChildActivitySummary.mockResolvedValue({
        booksWritten: 0,
        booksRead: 0,
        readingTimeMinutes: 0,
        childFirstName: 'Julia',
        childId: 'c1',
        hasActivity: false,
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/activity/summary')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.hasActivity).toBe(false);
      expect(res.body.data.booksWritten).toBe(0);
    });

    it('should call parentManager.getChildActivitySummary with correct parentId', async () => {
      // Arrange
      parentManager.getChildActivitySummary.mockResolvedValue({
        booksWritten: 0, booksRead: 0, readingTimeMinutes: 0,
        childFirstName: null, childId: null, hasActivity: false,
      });

      // Act
      await request(testApp)
        .get('/api/parent/activity/summary')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(parentManager.getChildActivitySummary).toHaveBeenCalledWith(PARENT_ID);
    });

    it('should return 401 without auth token', async () => {
      // Act
      const res = await request(testApp).get('/api/parent/activity/summary');

      // Assert
      expect(res.status).toBe(401);
    });

    it('should return 503 when redis is unavailable', async () => {
      // Arrange
      redis.scanIterator.mockReturnValue((async function* () {
        throw new Error('Redis down');
      })());

      // Act
      const res = await request(testApp)
        .get('/api/parent/activity/summary')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should return 500 and generic message when manager throws', async () => {
      // Arrange
      parentManager.getChildActivitySummary.mockRejectedValue(new Error('Unexpected DB error'));

      // Act
      const res = await request(testApp)
        .get('/api/parent/activity/summary')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('Something went wrong — please try again later');
    });
  });

  // ── GET /activity/books ────────────────────────────────────────────────────

  describe('GET /api/parent/activity/books', () => {
    it('should return 200 with paginated book list', async () => {
      // Arrange
      parentManager.getChildBookList.mockResolvedValue({
        books: [
          { bookId: 'b1', title: 'A Aventura', coverThumbnailUrl: '/thumb.png', status: 'published', updatedAt: '2026-06-05T10:00:00Z' },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/activity/books')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.books).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.books[0].title).toBe('A Aventura');
    });

    it('should pass query params limit and offset to manager', async () => {
      // Arrange
      parentManager.getChildBookList.mockResolvedValue({ books: [], total: 0, limit: 10, offset: 5 });

      // Act
      await request(testApp)
        .get('/api/parent/activity/books?limit=10&offset=5')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(parentManager.getChildBookList).toHaveBeenCalledWith(PARENT_ID, { limit: 10, skip: 5 });
    });

    it('should use default limit=20 and offset=0 when not specified', async () => {
      // Arrange
      parentManager.getChildBookList.mockResolvedValue({ books: [], total: 0, limit: 20, offset: 0 });

      // Act
      await request(testApp)
        .get('/api/parent/activity/books')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(parentManager.getChildBookList).toHaveBeenCalledWith(PARENT_ID, { limit: 20, skip: 0 });
    });

    it('should enforce max limit of 100', async () => {
      // Arrange
      parentManager.getChildBookList.mockResolvedValue({ books: [], total: 0, limit: 100, offset: 0 });

      // Act
      await request(testApp)
        .get('/api/parent/activity/books?limit=999')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(parentManager.getChildBookList).toHaveBeenCalledWith(PARENT_ID, { limit: 100, skip: 0 });
    });

    it('should enforce min limit of 1 when negative', async () => {
      // Arrange
      parentManager.getChildBookList.mockResolvedValue({ books: [], total: 0, limit: 1, offset: 0 });

      // Act: parseInt('-5') = -5, Math.max(-5, 1) = 1
      await request(testApp)
        .get('/api/parent/activity/books?limit=-5')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(parentManager.getChildBookList).toHaveBeenCalledWith(PARENT_ID, { limit: 1, skip: 0 });
    });

    it('should default to 20 when limit is 0 (falsy)', async () => {
      // Arrange
      parentManager.getChildBookList.mockResolvedValue({ books: [], total: 0, limit: 20, offset: 0 });

      // Act
      await request(testApp)
        .get('/api/parent/activity/books?limit=0')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert: parseInt('0') is 0 which is falsy, so defaults to 20
      expect(parentManager.getChildBookList).toHaveBeenCalledWith(PARENT_ID, { limit: 20, skip: 0 });
    });

    it('should not allow negative offset', async () => {
      // Arrange
      parentManager.getChildBookList.mockResolvedValue({ books: [], total: 0, limit: 20, offset: 0 });

      // Act
      await request(testApp)
        .get('/api/parent/activity/books?offset=-5')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(parentManager.getChildBookList).toHaveBeenCalledWith(PARENT_ID, { limit: 20, skip: 0 });
    });

    it('should return 401 without auth token', async () => {
      // Act
      const res = await request(testApp).get('/api/parent/activity/books');

      // Assert
      expect(res.status).toBe(401);
    });
  });

  // ── STORY-054 Routes ──────────────────────────────────────────────────────────

  // ── GET /export — Data Export as ZIP ──────────────────────────────────────────
  describe('GET /api/parent/export', () => {
    it('should return 200 with ZIP stream for valid parent', async () => {
      // Arrange: mock archive as a readable stream
      const mockStream = new Readable({ read() { this.push('zip-data'); this.push(null); } });
      parentManager.exportChildData.mockResolvedValue({
        archive: mockStream,
        childFirstName: 'Julia',
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/export')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/zip');
      expect(res.headers['content-disposition']).toContain('contopia-export-Julia-');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(testApp).get('/api/parent/export');
      expect(res.status).toBe(401);
    });

    it('should return 404 when parent has no child', async () => {
      parentManager.exportChildData.mockRejectedValue({
        status: 404,
        code: 'NOT_FOUND',
        message: 'No child account found',
      });

      const res = await request(testApp)
        .get('/api/parent/export')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should stream archive to response and set headers', async () => {
      // Arrange
      const mockStream = new Readable({ read() { this.push(null); } });
      parentManager.exportChildData.mockResolvedValue({
        archive: mockStream,
        childFirstName: 'Julia',
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/export')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/zip');
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="contopia-export-Julia-\d{4}-\d{2}-\d{2}\.zip"$/);
    });

    it('should return 500 with generic message when manager throws unexpected error', async () => {
      parentManager.exportChildData.mockRejectedValue(new Error('Unexpected DB error'));

      const res = await request(testApp)
        .get('/api/parent/export')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('Something went wrong — please try again later');
    });

    it('should handle archive stream error gracefully', async () => {
      // Create a stream that will emit an error
      const mockStream = new Readable({
        read() {
          this.destroy(new Error('Archive error'));
        },
      });
      parentManager.exportChildData.mockResolvedValue({
        archive: mockStream,
        childFirstName: 'Julia',
      });

      const res = await request(testApp)
        .get('/api/parent/export')
        .set('Authorization', `Bearer ${validToken}`);

      // Should still get a response (error handler fires if headers not sent)
      expect(res.status).toBe(500);
    });
  });

  // ── GET /deletion-request/status — Check pending deletion (STORY-054 FIX) ──
  describe('GET /api/parent/deletion-request/status', () => {
    it('should return 200 with hasPendingDeletion true when deletion is pending', async () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      parentManager.getDeletionStatus.mockResolvedValue({
        hasPendingDeletion: true,
        childId: 'child-123',
        expiresAt,
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/deletion-request/status')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.hasPendingDeletion).toBe(true);
      expect(res.body.data.childId).toBe('child-123');
      expect(res.body.data.expiresAt).toBe(expiresAt);
    });

    it('should return 200 with hasPendingDeletion false when no deletion is pending', async () => {
      // Arrange
      parentManager.getDeletionStatus.mockResolvedValue({
        hasPendingDeletion: false,
      });

      // Act
      const res = await request(testApp)
        .get('/api/parent/deletion-request/status')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.hasPendingDeletion).toBe(false);
      expect(res.body.data.childId).toBeUndefined();
      expect(res.body.data.expiresAt).toBeUndefined();
    });

    it('should call getDeletionStatus with parentId from auth token', async () => {
      // Arrange
      parentManager.getDeletionStatus.mockResolvedValue({ hasPendingDeletion: false });

      // Act
      await request(testApp)
        .get('/api/parent/deletion-request/status')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(parentManager.getDeletionStatus).toHaveBeenCalledWith(PARENT_ID);
    });

    it('should return 401 without auth token', async () => {
      // Act
      const res = await request(testApp).get('/api/parent/deletion-request/status');

      // Assert
      expect(res.status).toBe(401);
    });

    it('should return 500 with generic message when manager throws unexpected error', async () => {
      // Arrange
      parentManager.getDeletionStatus.mockRejectedValue(new Error('Unexpected DB error'));

      // Act
      const res = await request(testApp)
        .get('/api/parent/deletion-request/status')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('Something went wrong — please try again later');
    });
  });

  // ── POST /deletion-request — Request Account Deletion ────────────────────────
  describe('POST /api/parent/deletion-request', () => {
    it('should return 200 with deletion request details when confirmText is DELETE', async () => {
      // Arrange
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: new mongoose.Types.ObjectId().toString(), firstName: 'Julia' },
      });
      parentManager.requestAccountDeletion.mockImplementation(async ({ confirmText }) => {
        if (confirmText === 'DELETE') {
          return {
            deletionRequestId: new mongoose.Types.ObjectId().toString(),
            childId: 'c1',
            status: 'pending',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            confirmationEmailSent: true,
          };
        }
        const err = new Error('Confirmation text must be "DELETE"');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      });

      // Act
      const res = await request(testApp)
        .post('/api/parent/deletion-request')
        .send({ confirmText: 'DELETE' })
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.confirmationEmailSent).toBe(true);
    });

    it('should return 400 when confirmText is not DELETE', async () => {
      // Act
      const res = await request(testApp)
        .post('/api/parent/deletion-request')
        .send({ confirmText: 'delete' })
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when confirmText is missing', async () => {
      const res = await request(testApp)
        .post('/api/parent/deletion-request')
        .send({})
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when parent has no child', async () => {
      // Manager throws NOT_FOUND when child not found (resolved internally by manager)
      parentManager.requestAccountDeletion.mockRejectedValue({
        code: 'NOT_FOUND',
        status: 404,
        message: 'No child account found',
      });

      const res = await request(testApp)
        .post('/api/parent/deletion-request')
        .send({ confirmText: 'DELETE' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(testApp)
        .post('/api/parent/deletion-request')
        .send({ confirmText: 'DELETE' });
      expect(res.status).toBe(401);
    });

    it('should return 409 when deletion already pending', async () => {
      parentDao.findParentByIdWithChild.mockResolvedValue({
        parent: { _id: PARENT_ID },
        child: { _id: new mongoose.Types.ObjectId().toString(), firstName: 'Julia' },
      });
      parentManager.requestAccountDeletion.mockRejectedValue({
        status: 409,
        code: 'DELETION_ALREADY_PENDING',
        message: 'A deletion request is already pending for this account',
      });

      const res = await request(testApp)
        .post('/api/parent/deletion-request')
        .send({ confirmText: 'DELETE' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DELETION_ALREADY_PENDING');
    });
  });

  // ── POST /deletion-request/cancel — Cancel Account Deletion ───────────────────
  describe('POST /api/parent/deletion-request/cancel', () => {
    const childId = new mongoose.Types.ObjectId().toString();

    it('should return 200 with cancelled status', async () => {
      parentManager.cancelAccountDeletion.mockResolvedValue({
        deletionRequestId: new mongoose.Types.ObjectId().toString(),
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });

      const res = await request(testApp)
        .post('/api/parent/deletion-request/cancel')
        .send({ childId })
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should return 400 with invalid childId format', async () => {
      const res = await request(testApp)
        .post('/api/parent/deletion-request/cancel')
        .send({ childId: 'not-a-valid-id' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when no pending request exists', async () => {
      parentManager.cancelAccountDeletion.mockRejectedValue({
        status: 404,
        code: 'NOT_FOUND',
        message: 'No pending deletion request found for this child',
      });

      const res = await request(testApp)
        .post('/api/parent/deletion-request/cancel')
        .send({ childId })
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(testApp)
        .post('/api/parent/deletion-request/cancel')
        .send({ childId });
      expect(res.status).toBe(401);
    });
  });
});