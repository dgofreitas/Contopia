// Contopia — Import Router Integration Tests (supertest + in-memory MongoDB)
// STORY-045: TXT File Import
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';

// ── Mocks (must be before all imports that use them) ──────────────────────────
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
import importRouter from '../import-router.js';
import { Book, Chapter, ActivityLog } from '../../book/book-model.js';
import redis from '../../../config/redis.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const CHILD_ID = new mongoose.Types.ObjectId().toString();

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
testApp.use((req, res, next) => { req.id = 'req-test-import'; next(); });
testApp.use('/api/v1/import', authMiddleware, rateLimitMiddleware, importRouter);

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Import Router', () => {
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

  // ── 1. POST /api/v1/import/txt with valid TXT → 201 + book + chapter ─────
  it('should import valid TXT file and return 201 with book and chapter', async () => {
    const txtContent = 'First paragraph\n\nSecond paragraph\n\nThird paragraph';
    const buffer = Buffer.from(txtContent);

    const res = await request(testApp)
      .post('/api/v1/import/txt')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', buffer, { filename: 'my-story.txt', contentType: 'text/plain' });

    expect(res.status).toBe(201);
    expect(res.body.data.book).toBeDefined();
    expect(res.body.data.chapter).toBeDefined();
    expect(res.body.data.book.title).toBe('my-story');
    expect(res.body.data.book.source).toBe('imported');
    expect(res.body.data.book.importFormat).toBe('txt');
    expect(res.body.data.book.isEditable).toBe(false);
    expect(res.body.data.chapter.content).toBe('First paragraph\n\nSecond paragraph\n\nThird paragraph');
  });

  // ── 2. POST /api/v1/import/txt with .docx file → 400 INVALID_FILE_TYPE ─────
  it('should reject non-TXT MIME type with 400 INVALID_FILE_TYPE', async () => {
    const buffer = Buffer.from('Word document content');

    const res = await request(testApp)
      .post('/api/v1/import/txt')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', buffer, { filename: 'document.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  // ── 3. POST /api/v1/import/txt with no file → 400 NO_FILE ──────────────────
  it('should reject request with no file with 400 NO_FILE', async () => {
    const res = await request(testApp)
      .post('/api/v1/import/txt')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_FILE');
  });

  // ── 4. POST /api/v1/import/txt without auth → 401 ─────────────────────────
  it('should reject request without auth with 401', async () => {
    const buffer = Buffer.from('Hello world');

    const res = await request(testApp)
      .post('/api/v1/import/txt')
      .attach('file', buffer, { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(401);
  });

  // ── 5. XSS content in TXT → sanitized before storage (NFR-SEC-04) ──────────
  it('should sanitize null bytes and control characters from content', async () => {
    const unsafeContent = 'Para 1\x00with\x01null\x07bytes\n\nPara\t2\n\nPara 3';
    const buffer = Buffer.from(unsafeContent);

    const res = await request(testApp)
      .post('/api/v1/import/txt')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', buffer, { filename: 'xss.txt', contentType: 'text/plain' });

    expect(res.status).toBe(201);
    const content = res.body.data.chapter.content;
    expect(content).not.toContain('\x00');
    expect(content).not.toContain('\x01');
    expect(content).not.toContain('\x07');
    // Preserves newlines and tabs
    expect(content).toContain('\n');
    expect(content).toContain('\t');
  });

  // ── 6. Dangerous MIME type → DANGEROUS_FILE ────────────────────────────
  it('should reject dangerous MIME type with DANGEROUS_FILE', async () => {
    const buffer = Buffer.from('malicious content');

    const res = await request(testApp)
      .post('/api/v1/import/txt')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', buffer, { filename: 'malware.exe', contentType: 'application/x-executable' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DANGEROUS_FILE');
  });

  // ── Additional: Verify book and chapter persisted in database ──────────
  it('should create book with imported source and chapter in database', async () => {
    const txtContent = 'Chapter content here';
    const buffer = Buffer.from(txtContent);

    const res = await request(testApp)
      .post('/api/v1/import/txt')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', buffer, { filename: 'persisted.txt', contentType: 'text/plain' });

    expect(res.status).toBe(201);

    // Verify book in DB
    const books = await Book.find({ authorId: CHILD_ID });
    expect(books).toHaveLength(1);
    expect(books[0].source).toBe('imported');
    expect(books[0].importFormat).toBe('txt');
    expect(books[0].isEditable).toBe(false);
    expect(books[0].title).toBe('persisted');

    // Verify chapter in DB
    const chapters = await Chapter.find({ bookId: books[0]._id });
    expect(chapters).toHaveLength(1);
    expect(chapters[0].content).toBe('Chapter content here');
    expect(chapters[0].wordCount).toBe(3);

    // Verify activity log
    const logs = await ActivityLog.find({ action: 'book.import_txt' });
    expect(logs).toHaveLength(1);
    expect(logs[0].actorId.toString()).toBe(CHILD_ID);
  });
});