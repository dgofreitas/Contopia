// Contopia — Publish Book Route Integration Tests (supertest + in-memory MongoDB)
// STORY-020: Publish Book to Shelf
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

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../auth/auth-manager.js', () => ({
  hashToken: vi.fn((t) => `hashed:${t}`),
}));

// ── Imports ──────────────────────────────────────────────────────────────────
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';
import { authMiddleware } from '../../common/auth-middleware.js';
import { rateLimitMiddleware } from '../../common/rate-limit-middleware.js';
import bookRouter from '../book-router.js';
import { Book, Chapter } from '../book-model.js';
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
describe('Publish Book Route', () => {
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

  // ── 1. Publish book with at least 1 chapter with content → 200 ──────────
  it('POST /:bookId/publish — 200 when book has at least one chapter with content', async () => {
    // Arrange: create a draft book + chapter with content
    const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', status: 'draft' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'Once upon a time...' });

    // Act
    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.publishedAt).toBeDefined();
  });

  // ── 2. Publish book with 0 chapters → 422 EMPTY_CONTENT ────────────────
  it('POST /:bookId/publish — 422 EMPTY_CONTENT when book has 0 chapters', async () => {
    // Arrange: draft book with no chapters
    const book = await Book.create({ authorId: CHILD_ID, title: 'Empty Book', status: 'draft' });

    // Act
    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('EMPTY_CONTENT');
  });

  // ── 3. Publish book with chapters but all empty content → 422 EMPTY_CONTENT
  it('POST /:bookId/publish — 422 EMPTY_CONTENT when all chapters have empty content', async () => {
    // Arrange: book with chapter whose content is empty string
    const book = await Book.create({ authorId: CHILD_ID, title: 'No Content Book', status: 'draft' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1', content: '' });

    // Act
    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('EMPTY_CONTENT');
  });

  // ── 4. Publish book with chapter that has only whitespace → 422 EMPTY_CONTENT
  it('POST /:bookId/publish — 422 EMPTY_CONTENT when chapter has only whitespace', async () => {
    // Arrange: book with chapter whose content is only spaces/newlines
    const book = await Book.create({ authorId: CHILD_ID, title: 'Whitespace Book', status: 'draft' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1', content: '   \n\t  ' });

    // Act
    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('EMPTY_CONTENT');
  });

  // ── 5. Publish already-published book → 200 OK (idempotent) ─────────────
  it('POST /:bookId/publish — 200 idempotent when book already published', async () => {
    // Arrange: create a book with content and publish it
    const book = await Book.create({ authorId: CHILD_ID, title: 'Already Published', status: 'draft' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'Some content' });

    // First publish
    const firstRes = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);
    expect(firstRes.status).toBe(200);

    const originalPublishedAt = firstRes.body.data.publishedAt;

    // Act: publish again (idempotent)
    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert: still 200, status unchanged, publishedAt unchanged
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.publishedAt).toBe(originalPublishedAt);
  });

  // ── 6. Publish book owned by another user → 403 FORBIDDEN ──────────────
  it('POST /:bookId/publish — 403 FORBIDDEN when book belongs to another user', async () => {
    // Arrange: book owned by OTHER_CHILD_ID
    const book = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Yours', status: 'draft' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'Content' });

    // Act: try to publish with CHILD_ID token
    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── 7. Publish non-existent book → 404 NOT_FOUND ──────────────────────
  it('POST /:bookId/publish — 404 NOT_FOUND for non-existent book', async () => {
    // Arrange: fake book ID
    const fakeId = new mongoose.Types.ObjectId();

    // Act
    const res = await request(testApp)
      .post(`/api/v1/books/${fakeId}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── 8. Publish without auth header → 401 ──────────────────────────────
  it('POST /:bookId/publish — 401 without Authorization header', async () => {
    const book = await Book.create({ authorId: CHILD_ID, title: 'Auth Test Book', status: 'draft' });

    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`);

    expect(res.status).toBe(401);
  });

  // ── 9. Publish book with exactly one chapter with content → 200 OK ────
  it('POST /:bookId/publish — 200 when exactly one chapter has content among multiple', async () => {
    // Arrange: book with one content chapter and one empty chapter
    const book = await Book.create({ authorId: CHILD_ID, title: 'Mixed Chapters', status: 'draft' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Empty Ch', content: '' });
    await Chapter.create({ bookId: book._id, order: 2, title: 'Content Ch', content: 'Hello world' });

    // Act
    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
  });

  // ── 10. Publish sets publishedAt timestamp → verify it's a Date ──────
  it('POST /:bookId/publish — publishedAt is a valid ISO date string', async () => {
    // Arrange
    const beforePublish = new Date();
    const book = await Book.create({ authorId: CHILD_ID, title: 'Date Check Book', status: 'draft' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'Content here' });

    // Act
    const res = await request(testApp)
      .post(`/api/v1/books/${book._id}/publish`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert: publishedAt is set and is a valid date
    expect(res.status).toBe(200);
    expect(res.body.data.publishedAt).toBeDefined();
    const publishedAt = new Date(res.body.data.publishedAt);
    expect(publishedAt.getTime()).toBeGreaterThan(0);
    expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime());
  });
});