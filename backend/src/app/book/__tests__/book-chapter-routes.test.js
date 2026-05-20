// Contopia — Book Chapter Router Integration Tests (supertest + in-memory MongoDB)
// STORY-017: Chapter-Based Writing & CRUD — POST, DELETE, PATCH /reorder
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
import bookRouter from '../../book/book-router.js';
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
testApp.use((req, res, next) => { req.id = 'req-test-456'; next(); });
testApp.use('/api/v1/books', authMiddleware, rateLimitMiddleware, bookRouter);

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Book Chapter Routes (STORY-017)', () => {
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

  // ── POST /:bookId/chapters — Create Chapter ──────────────────────────────

  describe('POST /api/v1/books/:bookId/chapters', () => {
    it('201 — creates a chapter with default title', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });

      const res = await request(testApp)
        .post(`/api/v1/books/${book._id}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Chapter 1');
      expect(res.body.data.order).toBe(0);
      expect(res.body.data.bookId).toBe(book._id.toString());
      expect(res.body.data.content).toBe('');
      expect(res.body.meta.requestId).toBe('req-test-456');
    });

    it('201 — creates chapter with Portuguese default title', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'Meu Livro', language: 'pt-BR', chapterIds: [] });

      const res = await request(testApp)
        .post(`/api/v1/books/${book._id}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Capítulo 1');
    });

    it('201 — creates chapter with custom title', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });

      const res = await request(testApp)
        .post(`/api/v1/books/${book._id}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'My Custom Chapter' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('My Custom Chapter');
    });

    it('201 — increments order for subsequent chapters', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });

      // Create first chapter
      await request(testApp)
        .post(`/api/v1/books/${book._id}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      // Create second chapter
      const res = await request(testApp)
        .post(`/api/v1/books/${book._id}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Chapter 2');
      expect(res.body.data.order).toBe(100);
    });

    it('403 — rejects non-owner from creating chapter', async () => {
      const book = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Mine', language: 'en', chapterIds: [] });

      // Using CHILD_ID's token (not the owner)
      const res = await request(testApp)
        .post(`/api/v1/books/${book._id}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('404 — returns 404 for non-existent book', async () => {
      const fakeBookId = new mongoose.Types.ObjectId().toString();

      const res = await request(testApp)
        .post(`/api/v1/books/${fakeBookId}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('409 — rejects when 50 chapters already exist', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'Full Book', language: 'en', chapterIds: [] });
      // Create 50 chapters directly
      for (let i = 0; i < 50; i++) {
        const ch = await Chapter.create({ bookId: book._id, order: i * 100, title: `Ch ${i + 1}` });
        book.chapterIds.push(ch._id);
      }
      await book.save();

      const res = await request(testApp)
        .post(`/api/v1/books/${book._id}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CHAPTER_LIMIT_REACHED');
    });

    it('400 — validates invalid bookId param', async () => {
      const res = await request(testApp)
        .post('/api/v1/books/invalid-id/chapters')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('400 — validates body with title too long', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });
      const longTitle = 'x'.repeat(201);

      const res = await request(testApp)
        .post(`/api/v1/books/${book._id}/chapters`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: longTitle });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── DELETE /:bookId/chapters/:chapterId — Delete Chapter ──────────────────

  describe('DELETE /api/v1/books/:bookId/chapters/:chapterId', () => {
    it('204 — soft-deletes a chapter successfully', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });
      const ch = await Chapter.create({ bookId: book._id, order: 0, title: 'Chapter 1' });
      book.chapterIds.push(ch._id);
      await book.save();

      const res = await request(testApp)
        .delete(`/api/v1/books/${book._id}/chapters/${ch._id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Verify chapter is soft-deleted
      const deleted = await Chapter.findById(ch._id).lean();
      expect(deleted.deletedAt).not.toBeNull();
    });

    it('204 — reorders remaining chapters after delete', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });
      const ch1 = await Chapter.create({ bookId: book._id, order: 0, title: 'Chapter 1' });
      const ch2 = await Chapter.create({ bookId: book._id, order: 100, title: 'Chapter 2' });
      const ch3 = await Chapter.create({ bookId: book._id, order: 200, title: 'Chapter 3' });
      book.chapterIds.push(ch1._id, ch2._id, ch3._id);
      await book.save();

      // Delete ch2 (order 100)
      await request(testApp)
        .delete(`/api/v1/books/${book._id}/chapters/${ch2._id}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Verify remaining chapters have gapped ordering
      const remaining = await Chapter.find({ bookId: book._id, deletedAt: null }).sort({ order: 1 }).lean();
      expect(remaining).toHaveLength(2);
      expect(remaining[0].order).toBe(0);
      expect(remaining[1].order).toBe(100);
    });

    it('403 — rejects non-owner from deleting chapter', async () => {
      const book = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Mine', language: 'en', chapterIds: [] });
      const ch = await Chapter.create({ bookId: book._id, order: 0, title: 'Chapter 1' });
      book.chapterIds.push(ch._id);
      await book.save();

      const res = await request(testApp)
        .delete(`/api/v1/books/${book._id}/chapters/${ch._id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('404 — returns 404 for non-existent book', async () => {
      const fakeBookId = new mongoose.Types.ObjectId().toString();
      const fakeChapterId = new mongoose.Types.ObjectId().toString();

      const res = await request(testApp)
        .delete(`/api/v1/books/${fakeBookId}/chapters/${fakeChapterId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
    });

    it('400 — validates invalid params', async () => {
      const res = await request(testApp)
        .delete('/api/v1/books/invalid-id/chapters/also-invalid')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── PATCH /:bookId/chapters/reorder — Reorder Chapters ────────────────────

  describe('PATCH /api/v1/books/:bookId/chapters/reorder', () => {
    it('200 — reorders chapters successfully', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });
      const ch1 = await Chapter.create({ bookId: book._id, order: 0, title: 'Chapter 1' });
      const ch2 = await Chapter.create({ bookId: book._id, order: 100, title: 'Chapter 2' });
      const ch3 = await Chapter.create({ bookId: book._id, order: 200, title: 'Chapter 3' });
      book.chapterIds.push(ch1._id, ch2._id, ch3._id);
      await book.save();

      // Reorder: ch3 first, ch1 second, ch2 third
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}/chapters/reorder`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          chapters: [
            { id: ch3._id.toString(), order: 0 },
            { id: ch1._id.toString(), order: 100 },
            { id: ch2._id.toString(), order: 200 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]._id).toBe(ch3._id.toString());
      expect(res.body.data[0].order).toBe(0);
      expect(res.body.data[1]._id).toBe(ch1._id.toString());
      expect(res.body.data[1].order).toBe(100);
    });

    it('403 — rejects non-owner from reordering', async () => {
      const book = await Book.create({ authorId: OTHER_CHILD_ID, title: 'Not Mine', language: 'en', chapterIds: [] });
      const ch1 = await Chapter.create({ bookId: book._id, order: 0, title: 'Ch 1' });

      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}/chapters/reorder`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          chapters: [
            { id: ch1._id.toString(), order: 0 },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('400 — validates empty chapters array', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });

      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}/chapters/reorder`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ chapters: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('400 — validates invalid chapter ID format in reorder', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });

      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}/chapters/reorder`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          chapters: [
            { id: 'invalid-id', order: 0 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('409 — returns REORDER_MISMATCH when chapter IDs do not belong to book', async () => {
      const book = await Book.create({ authorId: CHILD_ID, title: 'My Book', language: 'en', chapterIds: [] });
      const ch1 = await Chapter.create({ bookId: book._id, order: 0, title: 'Chapter 1' });
      const ch2 = await Chapter.create({ bookId: book._id, order: 100, title: 'Chapter 2' });
      book.chapterIds.push(ch1._id, ch2._id);
      await book.save();

      const fakeChapterId = new mongoose.Types.ObjectId().toString();

      // Send 2 items matching active count, but one has a fake ID
      const res = await request(testApp)
        .patch(`/api/v1/books/${book._id}/chapters/reorder`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          chapters: [
            { id: ch1._id.toString(), order: 0 },
            { id: fakeChapterId, order: 100 },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REORDER_MISMATCH');
    });

    it('400 — validates invalid bookId param in reorder', async () => {
      const res = await request(testApp)
        .patch('/api/v1/books/invalid-id/chapters/reorder')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ chapters: [{ id: new mongoose.Types.ObjectId().toString(), order: 0 }] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});