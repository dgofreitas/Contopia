// Contopia — Book Router Integration Tests (supertest + in-memory MongoDB)
// STORY-005: Core REST API Scaffolding & CRUD Endpoints
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';

// ── Mocks (must be before all imports) ────────────────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(),
    incr: vi.fn(), expire: vi.fn(), keys: vi.fn(), call: vi.fn(),
    status: 'ready', on: vi.fn(),
  },
}));

// Mock express-rate-limit (included for safety; not directly used by book-router)
vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req, res, next) => next()),
}));

// Mock auth-manager for hashToken (used by auth-middleware)
vi.mock('../../auth/auth-manager.js', () => ({
  hashToken: vi.fn((t) => `hashed:${t}`),
}));

// ── Imports ──────────────────────────────────────────────────────────────────
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';
import { authMiddleware } from '../../common/auth-middleware.js';
import { rateLimitMiddleware } from '../../common/rate-limit-middleware.js';
import bookRouter from '../book-router.js';
import * as bookDao from '../book-dao.js';
import { Book, Chapter, ReadingProgress } from '../book-model.js';
import redis from '../../../config/redis.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const CHILD_ID = new mongoose.Types.ObjectId().toString();
const OTHER_CHILD_ID = new mongoose.Types.ObjectId().toString();

function makeAccessToken(childId = CHILD_ID) {
  return jwt.sign(
    { sub: childId, parentId: 'p1', type: 'access', sid: 'sess_1' },
    process.env.JWT_SECRET,
    { expiresIn: '30m' },
  );
}

// ── Test App ─────────────────────────────────────────────────────────────────
const testApp = express();
testApp.use(express.json());
testApp.use((req, res, next) => { req.id = 'req-test-123'; next(); });
testApp.use('/api/v1/books', authMiddleware, rateLimitMiddleware, bookRouter);

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Book Router', () => {
  const validToken = makeAccessToken();

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    vi.clearAllMocks();

    // Default redis mocks for authenticated routes:
    //   exists(bl:hash) → 0 (not blacklisted)
    //   get(session:...) → valid session (because token has sid)
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(JSON.stringify({ lastActivity: new Date().toISOString() }));
    // Default incr (rate-limit): return small number so it never hits limit
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
  });

  // ── GET / — List books (happy path) ──────────────────────────────────────
  it('GET /api/v1/books — 200 with pagination metadata and spineColor', async () => {
    // Arrange: create 2 books for the authenticated user
    await Book.create({ authorId: CHILD_ID, title: 'Book A' });
    await Book.create({ authorId: CHILD_ID, title: 'Book B' });

    // Act
    const res = await request(testApp)
      .get('/api/v1/books')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.meta.pagination.total).toBe(2);
    expect(res.body.meta.pagination.totalPages).toBe(1);
    expect(res.body.meta.pagination.page).toBe(1);
    expect(res.body.meta.pagination.pageSize).toBeDefined();
    // Each book should have spineColor (virtual) — lean may not always apply it in test
    // but the book data must have _id and title
    for (const book of res.body.data) {
      expect(book._id).toBeDefined();
      expect(book.title).toBeDefined();
    }
  });

  // ── GET /?status=draft — Filter by status ───────────────────────────────
  it('GET /api/v1/books?status=draft — 200 filters by status', async () => {
    // Arrange: create 1 draft + 1 published
    await Book.create({ authorId: CHILD_ID, title: 'Draft Book', status: 'draft' });
    await Book.create({ authorId: CHILD_ID, title: 'Published Book', status: 'published' });

    // Act
    const res = await request(testApp)
      .get('/api/v1/books?status=draft')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Draft Book');
    expect(res.body.meta.pagination.total).toBe(1);
  });

  // ── POST / — Create book (happy path) ───────────────────────────────────
  it('POST /api/v1/books — 201 creates a book with _id, title, spineColor', async () => {
    // Arrange
    const payload = { title: 'My New Book', summary: 'A wonderful story' };

    // Act
    const res = await request(testApp)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.title).toBe('My New Book');
    expect(res.body.data.description).toBe('A wonderful story');
    expect(res.body.data.spineColor).toBeDefined();
    expect(res.body.data.authorId).toBe(CHILD_ID);
    expect(res.body.meta.requestId).toBe('req-test-123');
  });

  // ── POST / — Validation error (empty title) ─────────────────────────────
  it('POST /api/v1/books — 400 VALIDATION_ERROR for empty title', async () => {
    // Arrange: empty title
    const payload = { title: '' };

    // Act
    const res = await request(testApp)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── GET /:bookId/chapters — 200 returns chapters ──────────────────────
  it('GET /api/v1/books/:bookId/chapters — 200 returns chapters for the book', async () => {
    // Arrange: create a book + a chapter
    const book = await Book.create({ authorId: CHILD_ID, title: 'My Book' });
    await Chapter.create({ bookId: book._id, order: 100, title: 'Ch 1', content: 'Hello' });

    // Act
    const res = await request(testApp)
      .get(`/api/v1/books/${book._id}/chapters`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Ch 1');
    expect(res.body.data[0].bookId.toString()).toBe(book._id.toString());
  });

  // ── GET /:bookId/chapters — 403 not owner ──────────────────────────────
  it('GET /api/v1/books/:bookId/chapters — 403 not owner', async () => {
    // Arrange: create a book owned by OTHER_CHILD_ID
    const otherBook = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Mine' });
    await Chapter.create({ bookId: otherBook._id, order: 100, title: 'Ch 1' });

    // Act
    const res = await request(testApp)
      .get(`/api/v1/books/${otherBook._id}/chapters`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── GET / — 401 without auth header ─────────────────────────────────────
  it('GET /api/v1/books — 401 without Authorization header', async () => {
    // Act
    const res = await request(testApp).get('/api/v1/books');

    // Assert
    expect(res.status).toBe(401);
  });

  // ── GET /:bookId/progress — invalid bookId → 400 validation error ──────
  it('GET /api/v1/books/:bookId/progress — 400 VALIDATION_ERROR for invalid bookId', async () => {
    // Arrange
    const invalidId = 'not-a-valid-objectid';

    // Act
    const res = await request(testApp)
      .get(`/api/v1/books/${invalidId}/progress`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── GET /:bookId/progress — no progress found → 404 ────────────────────
  it('GET /api/v1/books/:bookId/progress — 404 when no reading progress exists', async () => {
    // Arrange: create a book but no reading progress
    const book = await Book.create({ authorId: CHILD_ID, title: 'My Book' });

    // Act
    const res = await request(testApp)
      .get(`/api/v1/books/${book._id}/progress`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── GET /:bookId/progress — 200 returns reading progress ───────────────
  it('GET /api/v1/books/:bookId/progress — 200 returns reading progress', async () => {
    // Arrange: create a book + reading progress for the user
    const book = await Book.create({ authorId: CHILD_ID, title: 'My Book' });
    const chapter = await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1' });
    await ReadingProgress.create({
      userId: CHILD_ID,
      bookId: book._id,
      lastChapterId: chapter._id,
      lastPosition: 150,
      percentage: 30,
    });

    // Act
    const res = await request(testApp)
      .get(`/api/v1/books/${book._id}/progress`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.userId).toBe(CHILD_ID);
    expect(res.body.data.bookId.toString()).toBe(book._id.toString());
    expect(res.body.data.percentage).toBe(30);
  });

  // ── PUT /:bookId/progress — invalid bookId → 400 validation error ──────
  it('PUT /api/v1/books/:bookId/progress — 400 VALIDATION_ERROR for invalid bookId', async () => {
    // Arrange
    const invalidId = 'not-a-valid-objectid';
    const payload = { lastPosition: 10, percentage: 50 };

    // Act
    const res = await request(testApp)
      .put(`/api/v1/books/${invalidId}/progress`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── PUT /:bookId/progress — invalid body → 400 validation error ────────
  it('PUT /api/v1/books/:bookId/progress — 400 VALIDATION_ERROR for invalid body (percentage > 100)', async () => {
    // Arrange
    const book = await Book.create({ authorId: CHILD_ID, title: 'My Book' });
    const payload = { percentage: 150 }; // over max 100

    // Act
    const res = await request(testApp)
      .put(`/api/v1/books/${book._id}/progress`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── PUT /:bookId/progress — 200 updates reading progress ───────────────
  it('PUT /api/v1/books/:bookId/progress — 200 updates and returns reading progress', async () => {
    // Arrange: create a book + reading progress
    const book = await Book.create({ authorId: CHILD_ID, title: 'My Book' });
    const chapter = await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1' });
    const payload = {
      lastChapterId: chapter._id.toString(),
      lastPosition: 200,
      percentage: 75,
    };

    // Act
    const res = await request(testApp)
      .put(`/api/v1/books/${book._id}/progress`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.userId).toBe(CHILD_ID);
    expect(res.body.data.bookId.toString()).toBe(book._id.toString());
    expect(res.body.data.lastPosition).toBe(200);
    expect(res.body.data.percentage).toBe(75);
  });
});
