// Contopia — Chapter Router Integration Tests (supertest + in-memory MongoDB)
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

// Mock express-rate-limit (included for safety; not directly used by chapter-router)
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
import chapterRouter from '../chapter-router.js';
import { Book, Chapter } from '../../book/book-model.js';
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
testApp.use('/api/v1/chapters', authMiddleware, rateLimitMiddleware, chapterRouter);

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Chapter Router', () => {
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

    // Default redis mocks for authenticated routes
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(JSON.stringify({ lastActivity: new Date().toISOString() }));
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
  });

  // ── PUT /:chapterId — Update chapter (happy path) ──────────────────────
  it('PUT /api/v1/chapters/:chapterId — 200 updates title and computes wordCount', async () => {
    // Arrange: create a book (owned by CHILD_ID) and a chapter
    const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en' });
    const chapter = await Chapter.create({
      bookId: book._id,
      order: 100,
      title: 'Original Title',
      content: 'old content',
    });

    // Act
    const res = await request(testApp)
      .put(`/api/v1/chapters/${chapter._id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: 'Updated', content: 'new content here' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
    // wordCount should be auto-computed from content: "new content here" → 3 words
    expect(res.body.data.wordCount).toBe(3);
    expect(res.body.meta.requestId).toBe('req-test-123');
  });

  // ── PUT /:chapterId — 403 not owner ────────────────────────────────────
  it('PUT /api/v1/chapters/:chapterId — 403 not owner', async () => {
    // Arrange: create a book owned by OTHER_CHILD_ID and a chapter for it
    const otherBook = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Mine', language: 'en' });
    const chapter = await Chapter.create({
      bookId: otherBook._id,
      order: 100,
      title: 'Ch 1',
      content: 'secret',
    });

    // Act
    const res = await request(testApp)
      .put(`/api/v1/chapters/${chapter._id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: 'Hacked' });

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── PUT /:chapterId — 400 empty body ───────────────────────────────────
  it('PUT /api/v1/chapters/:chapterId — 400 VALIDATION_ERROR for empty body', async () => {
    // Arrange: create a book and chapter (ownership irrelevant since validation happens first)
    const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en' });
    const chapter = await Chapter.create({
      bookId: book._id,
      order: 100,
      title: 'Ch 1',
    });

    // Act: send empty body {} — the refine check requires at least one field
    const res = await request(testApp)
      .put(`/api/v1/chapters/${chapter._id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
