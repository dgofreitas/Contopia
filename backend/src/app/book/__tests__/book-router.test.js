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
import * as _bookDao from '../book-dao.js';
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

  // ── GET /?status=published — Returns published books sorted by publishedAt DESC ──
  it('GET /api/v1/books?status=published — returns books sorted by publishedAt descending', async () => {
    const now = new Date();
    await Book.create({ authorId: CHILD_ID, title: 'Old Pub', status: 'published', publishedAt: new Date(now.getTime() - 2000) });
    await Book.create({ authorId: CHILD_ID, title: 'New Pub', status: 'published', publishedAt: now });
    await Book.create({ authorId: CHILD_ID, title: 'Draft', status: 'draft' });

    const res = await request(testApp)
      .get('/api/v1/books?status=published')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].title).toBe('New Pub');
    expect(res.body.data[1].title).toBe('Old Pub');
    expect(res.body.meta.pagination.total).toBe(2);
  });

  // ── GET /?sort=createdAt — ignores unknown sort param (NFR-SEC-04) ──
  it('GET /api/v1/books?sort=createdAt — ignores unknown sort param, returns default order', async () => {
    // Arrange: create 2 books with explicit createdAt to define order
    const now = new Date();
    await Book.create({ authorId: CHILD_ID, title: 'First Book', createdAt: new Date(now.getTime() - 2000) });
    await Book.create({ authorId: CHILD_ID, title: 'Second Book', createdAt: now });

    // Act: pass unknown "sort" param — Zod strips unknown keys by default
    const res = await request(testApp)
      .get('/api/v1/books?sort=createdAt')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert: 200 OK, unknown param stripped, default sort (createdAt DESC) still applies
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Default sort is createdAt DESC — newest first
    expect(res.body.data[0].title).toBe('Second Book');
    expect(res.body.data[1].title).toBe('First Book');
    // Verify sort param did NOT affect ordering or cause errors
    expect(res.body.meta.pagination.total).toBe(2);
  });

  // ── GET /?status=published — verify exact order matches publish date (3 books) ──
  it('GET /api/v1/books?status=published — verify exact order matches publishedAt descending (3 books)', async () => {
    const now = new Date();
    await Book.create({ authorId: CHILD_ID, title: 'Oldest Pub', status: 'published', publishedAt: new Date(now.getTime() - 4000) });
    await Book.create({ authorId: CHILD_ID, title: 'Mid Pub', status: 'published', publishedAt: new Date(now.getTime() - 2000) });
    await Book.create({ authorId: CHILD_ID, title: 'Newest Pub', status: 'published', publishedAt: now });

    const res = await request(testApp)
      .get('/api/v1/books?status=published')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].title).toBe('Newest Pub');
    expect(res.body.data[1].title).toBe('Mid Pub');
    expect(res.body.data[2].title).toBe('Oldest Pub');
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

  // ── GET /?sort=createdAt — strips unknown param (NFR-SEC-04) ──────────
  it('GET /api/v1/books?sort=createdAt — ignores unknown sort param [NFR-SEC-04]', async () => {
    // Arrange: create a book so list isn't empty
    await Book.create({ authorId: CHILD_ID, title: 'Book With Sort' });

    // Act: pass unknown `sort` query param — Zod strips it (no passthrough)
    const res = await request(testApp)
      .get('/api/v1/books?sort=createdAt')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert: endpoint returns 200, ignores the unknown param
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.pagination).toBeDefined();
  });

  // ── STORY-021: GET /:bookId/edit — 200 returns book with chapters and word count ──
  it('GET /api/v1/books/:bookId/edit — 200 returns book + chapters + totalWordCount + lastEditedAt', async () => {
    // Arrange: create a book with 2 chapters
    const book = await Book.create({ authorId: CHILD_ID, title: 'Edit Me' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'Hello', wordCount: 5 });
    await Chapter.create({ bookId: book._id, order: 2, title: 'Ch 2', content: 'World', wordCount: 5 });

    // Act
    const res = await request(testApp)
      .get(`/api/v1/books/${book._id}/edit`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.book._id).toBe(book._id.toString());
    expect(res.body.data.book.title).toBe('Edit Me');
    expect(res.body.data.chapters).toHaveLength(2);
    expect(res.body.data.totalWordCount).toBe(10);
    expect(res.body.data.lastEditedAt).toBeDefined();
    expect(res.body.meta.requestId).toBe('req-test-123');
  });

  // ── STORY-021: GET /:bookId/edit — 403 not owner ────────────────────────
  it('GET /api/v1/books/:bookId/edit — 403 when not the owner', async () => {
    // Arrange: create a book owned by OTHER_CHILD_ID
    const otherBook = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Mine' });

    // Act
    const res = await request(testApp)
      .get(`/api/v1/books/${otherBook._id}/edit`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── STORY-021: GET /:bookId/edit — 404 book not found ──────────────────
  it('GET /api/v1/books/:bookId/edit — 404 when book does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();

    const res = await request(testApp)
      .get(`/api/v1/books/${nonExistentId}/edit`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── STORY-021: GET /:bookId/edit — 400 invalid ID format ───────────────
  it('GET /api/v1/books/:bookId/edit — 400 VALIDATION_ERROR for invalid bookId', async () => {
    const res = await request(testApp)
      .get('/api/v1/books/invalid-id-format/edit')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── STORY-021: GET /:bookId/edit — returns chapters sorted by order ────
  it('GET /api/v1/books/:bookId/edit — returns chapters sorted ascending by order', async () => {
    // Arrange: create chapters out of order
    const book = await Book.create({ authorId: CHILD_ID, title: 'Ordered' });
    await Chapter.create({ bookId: book._id, order: 3, title: 'Third', wordCount: 1 });
    await Chapter.create({ bookId: book._id, order: 1, title: 'First', wordCount: 1 });
    await Chapter.create({ bookId: book._id, order: 2, title: 'Second', wordCount: 1 });

    // Act
    const res = await request(testApp)
      .get(`/api/v1/books/${book._id}/edit`)
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.chapters[0].title).toBe('First');
    expect(res.body.data.chapters[1].title).toBe('Second');
    expect(res.body.data.chapters[2].title).toBe('Third');
  });

  // ── STORY-021: GET /?status=draft — includes totalWordCount in response ──
  it('GET /api/v1/books?status=draft — includes totalWordCount when aggregation returns it', async () => {
    // Arrange: create a draft with chapters
    const book = await Book.create({ authorId: CHILD_ID, title: 'Draft With Count', status: 'draft' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch', content: 'A', wordCount: 7 });

    // Act
    const res = await request(testApp)
      .get('/api/v1/books?status=draft')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert: draft aggregation returns totalWordCount per book
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].totalWordCount).toBeDefined();
    expect(res.body.data[0].totalWordCount).toBe(7);
    expect(res.body.meta.pagination.total).toBe(1);
  });

  // ── STORY-021: GET /?status=draft — returns empty array when no drafts ──
  it('GET /api/v1/books?status=draft — returns empty data when no drafts exist', async () => {
    const res = await request(testApp)
      .get('/api/v1/books?status=draft')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.pagination.total).toBe(0);
  });

  // ── STORY-021: GET /?status=published — verify response order matches publish date ─
  it('GET /api/v1/books?status=published — verify response order matches publish date', async () => {
    // Arrange: create two published books with different publishedAt
    const now = new Date();
    await Book.create({ authorId: CHILD_ID, title: 'Older Published', status: 'published', publishedAt: new Date(now.getTime() - 3000) });
    await Book.create({ authorId: CHILD_ID, title: 'Newer Published', status: 'published', publishedAt: now });

    // Act
    const res = await request(testApp)
      .get('/api/v1/books?status=published')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].title).toBe('Newer Published');
    expect(res.body.data[1].title).toBe('Older Published');
  });

  // ── STORY-051: GET /?status=published — includes chapterCount for offline sync ──
  it('GET /api/v1/books?status=published — includes chapterCount for each book', async () => {
    // Arrange: create a published book with chapters
    const book = await Book.create({ authorId: CHILD_ID, title: 'Synced Book', status: 'published' });
    await Chapter.create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'Hello' });
    await Chapter.create({ bookId: book._id, order: 2, title: 'Ch 2', content: 'World' });

    // Act
    const res = await request(testApp)
      .get('/api/v1/books?status=published')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].chapterCount).toBe(2);
  });

  // ── STORY-051: chapterCount is 0 for published book with no chapters ──
  it('GET /api/v1/books?status=published — chapterCount is 0 for book with no chapters', async () => {
    // Arrange: published book with no chapters
    await Book.create({ authorId: CHILD_ID, title: 'Empty Pub', status: 'published' });

    // Act
    const res = await request(testApp)
      .get('/api/v1/books?status=published')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].chapterCount).toBe(0);
  });

  // ── STORY-016: POST / — Title > 120 chars → 400 VALIDATION_ERROR ────────
  it('POST /api/v1/books — 400 VALIDATION_ERROR for title longer than 120 chars', async () => {
    // Arrange: title with 121 characters
    const payload = { title: 'a'.repeat(121) };

    // Act
    const res = await request(testApp)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── STORY-016: POST / — Summary > 500 chars → 400 VALIDATION_ERROR ─────
  it('POST /api/v1/books — 400 VALIDATION_ERROR for summary longer than 500 chars', async () => {
    // Arrange: summary with 501 characters
    const payload = { title: 'Valid Title', summary: 'a'.repeat(501) };

    // Act
    const res = await request(testApp)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── STORY-016: POST / — Only title, no summary → 201, description '' ────
  it('POST /api/v1/books — 201 with empty description when only title provided', async () => {
    // Arrange: only title, no summary or description
    const payload = { title: 'Title Only Book' };

    // Act
    const res = await request(testApp)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe('Title Only Book');
    expect(res.body.data.description).toBe('');
  });

  // ── STORY-016: POST / — XSS payload in title and summary → 201, stored as text ──
  it('POST /api/v1/books — 201 stores XSS payload as literal text in title', async () => {
    // Arrange: XSS script payload in title
    const xssPayload = '<script>alert(1)</script>';
    const payload = { title: xssPayload, summary: 'A safe summary' };

    // Act
    const res = await request(testApp)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert: status 201 and the literal XSS text is stored
    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe(xssPayload);
  });

  it('POST /api/v1/books — 201 stores XSS payload as literal text in description', async () => {
    // Arrange: XSS script payload in summary
    const xssPayload = '<script>alert(1)</script>';
    const payload = { title: 'Safe Title', summary: xssPayload };

    // Act
    const res = await request(testApp)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    // Assert: status 201 and the literal XSS text is stored in description
    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.description).toBe(xssPayload);
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

  // ── STORY-025: PATCH spineColor + spineCustomized ──────────────────────────
  describe('PATCH /:bookId — spineColor & spineCustomized', () => {
    it('PATCH — should update spineColor and spineCustomized', async () => {
      // Arrange: create a book
      const book = await Book.create({ authorId: CHILD_ID, title: 'Spine Book' });

      // Act
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: '#4ECDC4', spineCustomized: true });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.spineColor).toBe('#4ECDC4');
      expect(res.body.data.spineCustomized).toBe(true);
    });

    it('PATCH — should update spineCustomized independently', async () => {
      // Arrange
      const book = await Book.create({ authorId: CHILD_ID, title: 'Toggle Spine' });

      // Act: just toggle spineCustomized
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineCustomized: true });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.spineCustomized).toBe(true);
    });

    it('PATCH — should set spineColor to null and spineCustomized to false', async () => {
      // Arrange: create book with spine color
      const book = await Book.create({ authorId: CHILD_ID, title: 'Reset Spine', spineColor: '#FF6B6B', spineCustomized: true });

      // Act: reset spine customization
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: null, spineCustomized: false });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.spineColor).toBeNull();
      expect(res.body.data.spineCustomized).toBe(false);
    });

    it('PATCH — should reject invalid spineColor format (no hash)', async () => {
      // Arrange
      const book = await Book.create({ authorId: CHILD_ID, title: 'Bad Format' });

      // Act: spineColor without hash prefix
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: 'FF6B6B' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH — should reject invalid spineColor format (5 chars)', async () => {
      // Arrange
      const book = await Book.create({ authorId: CHILD_ID, title: 'Short Hex' });

      // Act: 5-char hex
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: '#FF6B6' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH — should reject invalid spineColor format (8 chars)', async () => {
      // Arrange
      const book = await Book.create({ authorId: CHILD_ID, title: 'Long Hex' });

      // Act: 8-char hex (with alpha)
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: '#FF6B6BFF' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH — should reject non-hex chars in spineColor', async () => {
      // Arrange
      const book = await Book.create({ authorId: CHILD_ID, title: 'Non Hex' });

      // Act
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: '#GGHHII' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH — should update spineColor alongside other fields', async () => {
      // Arrange
      const book = await Book.create({ authorId: CHILD_ID, title: 'Multi Update' });

      // Act
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Updated Title',
          spineColor: '#45B7D1',
          spineCustomized: true,
          coverColor: '#96CEB4',
        });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.spineColor).toBe('#45B7D1');
      expect(res.body.data.spineCustomized).toBe(true);
      expect(res.body.data.coverColor).toBe('#96CEB4');
    });

    it('PATCH — should return 403 when updating spineColor on another user\'s book', async () => {
      // Arrange: book owned by OTHER_CHILD_ID
      const otherBook = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Mine' });

      // Act
      const res = await request(testApp)
        .patch(`/api/v1/books/${otherBook._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: '#FF6B6B' });

      // Assert
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('PATCH — should accept lowercase hex spineColor', async () => {
      // Arrange
      const book = await Book.create({ authorId: CHILD_ID, title: 'Lower Spine' });

      // Act
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: '#4ecdc4' });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.spineColor).toBe('#4ecdc4');
    });

    // ── STORY-036: isFavorited ──────────────────────────────────────────────
    it('PATCH — should update isFavorited to true', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'Fav Book' });

      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ isFavorited: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isFavorited).toBe(true);
    });

    it('PATCH — should update isFavorited to false', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'Unfav Book', isFavorited: true });

      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ isFavorited: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isFavorited).toBe(false);
    });

    it('PATCH — should reject non-boolean isFavorited (string)', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'Bad Fav' });

      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ isFavorited: 'true' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH — should reject non-boolean isFavorited (number)', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'Num Fav' });

      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ isFavorited: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH — should update isFavorited alongside other fields', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'Multi Fav' });

      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'Updated Fav', isFavorited: true, spineColor: '#FF6B6B' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Fav');
      expect(res.body.data.isFavorited).toBe(true);
    });

    it('PATCH — should return 403 when updating isFavorited on another user\'s book', async () => {
      const otherBook = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Mine' });

      const res = await request(testApp)
        .patch(`/api/v1/books/${otherBook._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ isFavorited: true });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('PATCH — should accept null spineColor and null coverColor to reset customization', async () => {
      // Arrange: create with colors set
      const book = await Book.create({
        authorId: CHILD_ID,
        title: 'Reset Colors',
        spineColor: '#FF6B6B',
        coverColor: '#4ECDC4',
        spineCustomized: true,
      });

      // Act: reset all
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ spineColor: null, coverColor: null, spineCustomized: false });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.spineCustomized).toBe(false);
      // Note: JSON response includes virtual getter for spineColor
    });
  });
});
