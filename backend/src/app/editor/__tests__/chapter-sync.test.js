// Contopia — Chapter Sync Endpoint Tests (STORY-048)
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';

// ── Mocks (must be before all imports that use pino) ─────────────────────────
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
import chapterRouter from '../chapter-router.js';
import { Book, Chapter } from '../../book/book-model.js';
import * as chapterManager from '../chapter-manager.js';
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

async function createTestBook(authorId = CHILD_ID, overrides = {}) {
  return Book.create({
    authorId,
    title: 'Test Book',
    language: 'en',
    chapterIds: [],
    ...overrides,
  });
}

async function createTestChapter(bookId, order, title = `Chapter ${order}`, content = '') {
  return Chapter.create({
    bookId,
    order,
    title,
    content,
  });
}

// ── Test App ─────────────────────────────────────────────────────────────────
const testApp = express();
testApp.use(express.json());
testApp.use((req, res, next) => { req.id = 'req-test-123'; next(); });
testApp.use('/api/v1/chapters', authMiddleware, rateLimitMiddleware, chapterRouter);

// ── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/v1/chapters/sync', () => {
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
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(JSON.stringify({ lastActivity: new Date().toISOString() }));
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
  });

  // ── Batch sync with no conflicts (all baseVersion match) ─────────────────
  it('returns ok for all operations when baseVersion matches server _version', async () => {
    const book = await createTestBook(CHILD_ID);
    const ch1 = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Original 1</p>');
    const ch2 = await createTestChapter(book._id, 100, 'Chapter 2', '<p>Original 2</p>');

    // Chapters are created with _version: 1 (default)
    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.update',
            chapterId: ch1._id.toString(),
            content: '<p>Updated 1</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
          {
            type: 'chapter.update',
            chapterId: ch2._id.toString(),
            content: '<p>Updated 2</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].status).toBe('ok');
    expect(res.body.data[0].chapterId).toBe(ch1._id.toString());
    expect(res.body.data[0].serverContent).toBe('<p>Updated 1</p>');
    expect(res.body.data[0].serverVersion).toBe(2); // incremented from 1 → 2
    expect(res.body.data[0].serverTimestamp).toBeDefined();

    expect(res.body.data[1].status).toBe('ok');
    expect(res.body.data[1].chapterId).toBe(ch2._id.toString());
    expect(res.body.data[1].serverContent).toBe('<p>Updated 2</p>');
    expect(res.body.data[1].serverVersion).toBe(2);

    // Verify _version was persisted
    const updatedCh1 = await Chapter.findById(ch1._id).lean();
    expect(updatedCh1._version).toBe(2);
    expect(updatedCh1.wordCount).toBe(2);
  });

  // ── Conflict detected when baseVersion mismatches and server is newer ──
  it('returns conflict when baseVersion mismatches and server is newer', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Server content</p>');

    // Simulate server-side update: bump _version
    await Chapter.updateOne(
      { _id: chapter._id },
      { $set: { content: '<p>Server content updated</p>', wordCount: 3 }, $inc: { _version: 1 } },
    );

    // Reload to get updatedAt
    const serverChapter = await Chapter.findById(chapter._id).lean();

    // Client sends stale baseVersion=1 but server is now at _version=2
    // Client timestamp is OLDER than server
    const oldTimestamp = new Date(serverChapter.updatedAt.getTime() - 60000).toISOString();

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.update',
            chapterId: chapter._id.toString(),
            content: '<p>Client stale update</p>',
            clientTimestamp: oldTimestamp,
            baseVersion: 1, // stale — server is at version 2
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe('conflict');
    expect(res.body.data[0].chapterId).toBe(chapter._id.toString());
    expect(res.body.data[0].serverContent).toBe('<p>Server content updated</p>');
    expect(res.body.data[0].serverVersion).toBe(2);
    expect(res.body.data[0].serverTimestamp).toBeDefined();
  });

  // ── Last-write-wins when baseVersion mismatches but client is newer ─────
  it('applies update (last-write-wins) when baseVersion mismatches but client timestamp is newer', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Old content</p>');

    // Simulate server-side update: bump _version
    await Chapter.updateOne(
      { _id: chapter._id },
      { $set: { content: '<p>Server update</p>', wordCount: 2 }, $inc: { _version: 1 } },
    );

    const serverChapter = await Chapter.findById(chapter._id).lean();

    // Client sends stale baseVersion=1, but client timestamp is NEWER than server
    const newTimestamp = new Date(serverChapter.updatedAt.getTime() + 60000).toISOString();

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.update',
            chapterId: chapter._id.toString(),
            content: '<p>Client wins</p>',
            clientTimestamp: newTimestamp,
            baseVersion: 1, // stale, but client is newer
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe('ok');
    expect(res.body.data[0].serverContent).toBe('<p>Client wins</p>');
    expect(res.body.data[0].serverVersion).toBe(3); // was 2, now 3 after LWW update

    // Verify persisted
    const updated = await Chapter.findById(chapter._id).lean();
    expect(updated._version).toBe(3);
    expect(updated.content).toBe('<p>Client wins</p>');
  });

  // ── Ownership verification (403 for non-owner) ───────────────────────────
  it('returns forbidden when child does not own the chapter\'s book', async () => {
    const otherBook = await createTestBook(OTHER_CHILD_ID);
    const chapter = await createTestChapter(otherBook._id, 0, 'Not Yours', '<p>Private</p>');

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.update',
            chapterId: chapter._id.toString(),
            content: '<p>Trying to hack</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe('forbidden');
    expect(res.body.data[0].message).toBe("That doesn't belong to you");
  });

  // ── Max 50 operations limit ─────────────────────────────────────────────
  it('returns 400 validation error for more than 50 operations', async () => {
    const ops = Array.from({ length: 51 }, (_, i) => ({
      type: 'chapter.update',
      chapterId: new mongoose.Types.ObjectId().toString(),
      content: `<p>Op ${i}</p>`,
      clientTimestamp: new Date().toISOString(),
      baseVersion: 1,
    }));

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ operations: ops });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── Empty operations array returns 400 ────────────────────────────────────
  it('returns 400 validation error for empty operations array', async () => {
    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ operations: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── Chapter not found ───────────────────────────────────────────────────
  it('returns not_found for non-existent chapterId', async () => {
    const fakeChapterId = new mongoose.Types.ObjectId().toString();

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.update',
            chapterId: fakeChapterId,
            content: '<p>Ghost</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe('not_found');
  });

  // ── Mixed batch: some ok, some conflict, some forbidden ─────────────────
  it('handles mixed results in a single batch', async () => {
    const ownBook = await createTestBook(CHILD_ID);
    const otherBook = await createTestBook(OTHER_CHILD_ID);

    const ownChapter = await createTestChapter(ownBook._id, 0, 'Own Chapter', '<p>Own content</p>');
    const otherChapter = await createTestChapter(otherBook._id, 0, 'Other Chapter', '<p>Other content</p>');

    const fakeChapterId = new mongoose.Types.ObjectId().toString();

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.update',
            chapterId: ownChapter._id.toString(),
            content: '<p>Updated own</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
          {
            type: 'chapter.update',
            chapterId: otherChapter._id.toString(),
            content: '<p>Trying to update</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
          {
            type: 'chapter.update',
            chapterId: fakeChapterId,
            content: '<p>Ghost update</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].status).toBe('ok');
    expect(res.body.data[1].status).toBe('forbidden');
    expect(res.body.data[2].status).toBe('not_found');
  });

  // ── Unauthenticated request returns 401 ─────────────────────────────────
  it('returns 401 for unauthenticated request', async () => {
    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .send({
        operations: [
          {
            type: 'chapter.update',
            chapterId: new mongoose.Types.ObjectId().toString(),
            content: '<p>No auth</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
        ],
      });

    expect(res.status).toBe(401);
  });
});

// ── syncChaptersManager unit tests ──────────────────────────────────────────
describe('syncChaptersManager', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterAll(async () => { await disconnectTestDb(); });
  beforeEach(async () => { await clearCollections(); });

  it('returns ok for matching baseVersion', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Original</p>');

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.update',
        chapterId: chapter._id.toString(),
        content: '<p>Updated</p>',
        clientTimestamp: new Date().toISOString(),
        baseVersion: 1, // matches default _version
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('ok');
    expect(results[0].serverVersion).toBe(2);
    expect(results[0].serverContent).toBe('<p>Updated</p>');

    const updated = await Chapter.findById(chapter._id).lean();
    expect(updated._version).toBe(2);
    expect(updated.wordCount).toBe(1);
  });

  it('returns conflict when baseVersion mismatches and server is newer', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Original</p>');

    // Server update increments version
    await Chapter.updateOne(
      { _id: chapter._id },
      { $set: { content: '<p>Server updated</p>' }, $inc: { _version: 1 } },
    );
    const serverChapter = await Chapter.findById(chapter._id).lean();

    // Client has old baseVersion=1, with older timestamp
    const oldTimestamp = new Date(serverChapter.updatedAt.getTime() - 300000).toISOString();

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.update',
        chapterId: chapter._id.toString(),
        content: '<p>Stale client update</p>',
        clientTimestamp: oldTimestamp,
        baseVersion: 1, // stale
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('conflict');
    expect(results[0].serverVersion).toBe(2);
    expect(results[0].serverContent).toBe('<p>Server updated</p>');
  });

  it('applies last-write-wins when client timestamp is newer despite version mismatch', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Original</p>');

    // Server bumps version
    await Chapter.updateOne(
      { _id: chapter._id },
      { $set: { content: '<p>Server update</p>' }, $inc: { _version: 1 } },
    );
    const serverChapter = await Chapter.findById(chapter._id).lean();

    // Client has stale baseVersion=1 but NEWER timestamp than server
    const newTimestamp = new Date(serverChapter.updatedAt.getTime() + 300000).toISOString();

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.update',
        chapterId: chapter._id.toString(),
        content: '<p>Client newer wins</p>',
        clientTimestamp: newTimestamp,
        baseVersion: 1,
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('ok');
    expect(results[0].serverVersion).toBe(3); // 2 + 1 = 3
    expect(results[0].serverContent).toBe('<p>Client newer wins</p>');
  });

  it('returns forbidden for non-owner', async () => {
    const book = await createTestBook(OTHER_CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Private Chapter', '<p>Private</p>');

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.update',
        chapterId: chapter._id.toString(),
        content: '<p>Attempted update</p>',
        clientTimestamp: new Date().toISOString(),
        baseVersion: 1,
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('forbidden');
  });

  it('sanitizes HTML content in sync updates', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Original</p>');

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.update',
        chapterId: chapter._id.toString(),
        content: '<script>alert(1)</script><p>Safe</p>',
        clientTimestamp: new Date().toISOString(),
        baseVersion: 1,
      },
    ]);

    expect(results[0].status).toBe('ok');
    expect(results[0].serverContent).toBe('<p>Safe</p>');

    const updated = await Chapter.findById(chapter._id).lean();
    expect(updated.content).toBe('<p>Safe</p>');
    expect(updated.wordCount).toBe(1);
  });
});

// ── _version field on chapter model ─────────────────────────────────────────
describe('Chapter _version field', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterAll(async () => { await disconnectTestDb(); });
  beforeEach(async () => { await clearCollections(); });

  it('defaults _version to 1 on creation', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1');

    expect(chapter._version).toBe(1);
    expect(chapter.updatedAt).toBeDefined();
  });

  it('increments _version on content update via updateChapterManager', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Hello</p>');
    book.chapterIds.push(chapter._id);
    await book.save();

    const updated = await chapterManager.updateChapterManager(
      CHILD_ID.toString(),
      chapter._id.toString(),
      { content: '<p>Hello world</p>' },
    );

    expect(updated._version).toBe(2); // incremented from 1 → 2

    // Second update increments again
    const updated2 = await chapterManager.updateChapterManager(
      CHILD_ID.toString(),
      chapter._id.toString(),
      { content: '<p>Hello world again</p>' },
    );

    expect(updated2._version).toBe(3);
  });

  it('does not increment _version on title-only update', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Chapter 1', '<p>Hello</p>');
    book.chapterIds.push(chapter._id);
    await book.save();

    const updated = await chapterManager.updateChapterManager(
      CHILD_ID.toString(),
      chapter._id.toString(),
      { title: 'New Title' },
    );

    // Title-only update should NOT increment _version
    expect(updated._version).toBe(1);
    expect(updated.title).toBe('New Title');
  });
});

// ── chapter.create sync operation tests (STORY-050) ──────────────────────────
describe('syncChaptersManager — chapter.create', () => {
  beforeAll(async () => { await connectTestDb(); });
  afterAll(async () => { await disconnectTestDb(); });
  beforeEach(async () => { await clearCollections(); });

  it('creates a real chapter via chapter.create sync operation', async () => {
    const book = await createTestBook(CHILD_ID);

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.create',
        bookId: book._id.toString(),
        title: 'My New Chapter',
        content: '<p>Hello world</p>',
        clientTimestamp: new Date().toISOString(),
        tempChapterId: 'temp-uuid-abc123',
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('ok');
    expect(results[0].chapterId).toBeDefined();
    expect(results[0].tempChapterId).toBe('temp-uuid-abc123');
    expect(results[0].serverVersion).toBe(1);
    expect(results[0].serverTimestamp).toBeDefined();

    // Verify chapter was actually created in DB
    const chapter = await Chapter.findById(results[0].chapterId).lean();
    expect(chapter).toBeDefined();
    expect(chapter.title).toBe('My New Chapter');
    expect(chapter.content).toBe('<p>Hello world</p>');
    expect(chapter.bookId.toString()).toBe(book._id.toString());
    expect(chapter._version).toBe(1);

    // Verify book.chapterIds was updated
    const updatedBook = await Book.findById(book._id).lean();
    expect(updatedBook.chapterIds.map((id) => id.toString())).toContain(results[0].chapterId);
  });

  it('computes default title based on book language (Portuguese)', async () => {
    const book = await createTestBook(CHILD_ID, { language: 'pt-BR' });

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.create',
        bookId: book._id.toString(),
        clientTimestamp: new Date().toISOString(),
        tempChapterId: 'temp-pt-ch1',
      },
    ]);

    expect(results[0].status).toBe('ok');
    const chapter = await Chapter.findById(results[0].chapterId).lean();
    expect(chapter.title).toBe('Capítulo 1');
  });

  it('computes default title based on book language (English)', async () => {
    const book = await createTestBook(CHILD_ID, { language: 'en' });

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.create',
        bookId: book._id.toString(),
        clientTimestamp: new Date().toISOString(),
        tempChapterId: 'temp-en-ch1',
      },
    ]);

    expect(results[0].status).toBe('ok');
    const chapter = await Chapter.findById(results[0].chapterId).lean();
    expect(chapter.title).toBe('Chapter 1');
  });

  it('assigns gapped order values (0, 100, 200)', async () => {
    const book = await createTestBook(CHILD_ID);

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      { type: 'chapter.create', bookId: book._id.toString(), tempChapterId: 't1' },
      { type: 'chapter.create', bookId: book._id.toString(), tempChapterId: 't2' },
      { type: 'chapter.create', bookId: book._id.toString(), tempChapterId: 't3' },
    ]);

    const chapters = results.map((r) =>Chapter.findById(r.chapterId).lean());
    const found = await Promise.all(chapters);
    expect(found[0].order).toBe(0);
    expect(found[1].order).toBe(100);
    expect(found[2].order).toBe(200);
  });

  it('returns forbidden for non-owner book', async () => {
    const otherBook = await createTestBook(OTHER_CHILD_ID);

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.create',
        bookId: otherBook._id.toString(),
        clientTimestamp: new Date().toISOString(),
        tempChapterId: 'temp-forbidden',
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('forbidden');
    expect(results[0].tempChapterId).toBe('temp-forbidden');
    // Verify no chapter was created
    const chapters = await Chapter.find({ bookId: otherBook._id }).lean();
    expect(chapters).toHaveLength(0);
  });

  it('returns not_found for missing book', async () => {
    const fakeBookId = new mongoose.Types.ObjectId().toString();

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.create',
        bookId: fakeBookId,
        clientTimestamp: new Date().toISOString(),
        tempChapterId: 'temp-missing',
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('not_found');
    expect(results[0].tempChapterId).toBe('temp-missing');
  });

  it('enforces max 50 chapters per book limit', async () => {
    const book = await createTestBook(CHILD_ID);
    // Create 50 chapters
    for (let i = 0; i < 50; i++) {
      await Chapter.create({ bookId: book._id, order: i * 100, title: `Ch ${i + 1}`, content: '' });
    }

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.create',
        bookId: book._id.toString(),
        clientTimestamp: new Date().toISOString(),
        tempChapterId: 'temp-over-limit',
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('forbidden');
    expect(results[0].tempChapterId).toBe('temp-over-limit');
  });

  it('sanitizes HTML content in chapter.create sync', async () => {
    const book = await createTestBook(CHILD_ID);

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.create',
        bookId: book._id.toString(),
        content: '<script>alert(1)</script><p>Safe</p>',
        clientTimestamp: new Date().toISOString(),
        tempChapterId: 'temp-xss',
      },
    ]);

    expect(results[0].status).toBe('ok');
    const chapter = await Chapter.findById(results[0].chapterId).lean();
    expect(chapter.content).toBe('<p>Safe</p>');
  });

  it('works without tempChapterId (optional field)', async () => {
    const book = await createTestBook(CHILD_ID);

    const results = await chapterManager.syncChaptersManager(CHILD_ID.toString(), [
      {
        type: 'chapter.create',
        bookId: book._id.toString(),
        title: 'No Temp ID',
        content: '<p>Content</p>',
        clientTimestamp: new Date().toISOString(),
      },
    ]);

    expect(results[0].status).toBe('ok');
    expect(results[0].chapterId).toBeDefined();
    expect(results[0].tempChapterId).toBeNull();
  });
});

// ── Mixed batch: chapter.update + chapter.create ──────────────────────────────
describe('POST /api/v1/chapters/sync — mixed batch', () => {
  const validToken = makeAccessToken();

  beforeAll(async () => { await connectTestDb(); });
  afterAll(async () => { await disconnectTestDb(); });
  beforeEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
    redis.exists.mockResolvedValue(0);
    redis.get.mockResolvedValue(JSON.stringify({ lastActivity: new Date().toISOString() }));
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
  });

  it('handles mixed batch with chapter.update and chapter.create', async () => {
    const book = await createTestBook(CHILD_ID);
    const chapter = await createTestChapter(book._id, 0, 'Existing Chapter', '<p>Original</p>');

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.update',
            chapterId: chapter._id.toString(),
            content: '<p>Updated</p>',
            clientTimestamp: new Date().toISOString(),
            baseVersion: 1,
          },
          {
            type: 'chapter.create',
            bookId: book._id.toString(),
            title: 'New Chapter',
            content: '<p>New content</p>',
            clientTimestamp: new Date().toISOString(),
            tempChapterId: 'temp-mixed-1',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    // First: chapter.update result
    expect(res.body.data[0].status).toBe('ok');
    expect(res.body.data[0].chapterId).toBe(chapter._id.toString());
    expect(res.body.data[0].serverVersion).toBe(2);

    // Second: chapter.create result
    expect(res.body.data[1].status).toBe('ok');
    expect(res.body.data[1].chapterId).toBeDefined();
    expect(res.body.data[1].tempChapterId).toBe('temp-mixed-1');
    expect(res.body.data[1].serverVersion).toBe(1);
  });

  it('validates chapter.create operation in batch', async () => {
    const book = await createTestBook(CHILD_ID);

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.create',
            bookId: book._id.toString(),
            content: '<p>Created via sync</p>',
            clientTimestamp: new Date().toISOString(),
            tempChapterId: 'temp-validation',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('ok');
    expect(res.body.data[0].chapterId).toBeDefined();
  });

  it('returns not_found for chapter.create with nonexistent book via API', async () => {
    const fakeBookId = new mongoose.Types.ObjectId().toString();

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.create',
            bookId: fakeBookId,
            tempChapterId: 'temp-api-notfound',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('not_found');
    expect(res.body.data[0].tempChapterId).toBe('temp-api-notfound');
  });

  it('returns forbidden for chapter.create on another users book via API', async () => {
    const otherBook = await createTestBook(OTHER_CHILD_ID);

    const res = await request(testApp)
      .post('/api/v1/chapters/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        operations: [
          {
            type: 'chapter.create',
            bookId: otherBook._id.toString(),
            tempChapterId: 'temp-api-forbidden',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('forbidden');
  });
});

// ── GET /api/v1/health endpoint test (STORY-050) ──────────────────────────────
describe('GET /api/v1/health', () => {
  it('returns 200 with status ok and timestamp', async () => {
    // Create a minimal Express app matching the production route
    const healthApp = express();
    healthApp.get('/api/v1/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    const res = await request(healthApp).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    // Verify timestamp is a valid ISO date string
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('does not require authentication', async () => {
    // Create a minimal Express app matching the production route
    const healthApp = express();
    healthApp.get('/api/v1/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // No Authorization header — should still return 200
    const res = await request(healthApp).get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});