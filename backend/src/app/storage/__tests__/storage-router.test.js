// Contopia — Storage Router Integration Tests
// STORY-006: Secure Asset Storage & CDN Setup
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';

// ── Mocks (must be before all imports that use them) ──────────────────────────
// vi.mock factories are hoisted — cannot reference outer-scope variables.

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

// Mock storage-manager entirely (it has sharp/S3 dependencies)
vi.mock('../storage-manager.js', () => ({
  uploadAssetManager: vi.fn(),
  getSignedUrlManager: vi.fn(),
  purgeAssetsByAuthorManager: vi.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';
import { authMiddleware } from '../../common/auth-middleware.js';
import { rateLimitMiddleware } from '../../common/rate-limit-middleware.js';
import storageRouter from '../storage-router.js';
import * as storageManager from '../storage-manager.js';
import { Book } from '../../book/book-model.js';
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
testApp.use('/api/v1', authMiddleware, rateLimitMiddleware);
testApp.use('/api/v1', storageRouter);

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Storage Router', () => {
  const validToken = makeAccessToken();
  let bookId;

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

    // Create a book owned by CHILD_ID
    const book = await Book.create({ authorId: CHILD_ID, title: 'Test Book' });
    bookId = book._id.toString();
  });

  // ── Upload: valid image → manager called, 201 ────────────────────────────
  it('POST /api/v1/books/:bookId/assets — 201 with valid file', async () => {
    const fakeAssetId = new mongoose.Types.ObjectId().toString();
    storageManager.uploadAssetManager.mockResolvedValue({
      assetId: fakeAssetId,
      url: 'https://minio.example.com/presigned-url',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);

    const res = await request(testApp)
      .post(`/api/v1/books/${bookId}/assets`)
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.assetId).toBe(fakeAssetId);
    expect(res.body.data.url).toBe('https://minio.example.com/presigned-url');
    expect(res.body.data.expiresAt).toBeDefined();
    expect(res.body.meta.requestId).toBe('req-test-456');
  });

  // ── Upload: no file → 400 ──────────────────────────────────────────────
  it('POST /api/v1/books/:bookId/assets — 400 INVALID_FILE_TYPE for no file', async () => {
    const res = await request(testApp)
      .post(`/api/v1/books/${bookId}/assets`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  // ── Upload: invalid bookId format → 400 ──────────────────────────────────
  it('POST /api/v1/books/:bookId/assets — 400 for invalid bookId format', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);

    const res = await request(testApp)
      .post('/api/v1/books/not-a-valid-id/assets')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
  });

  // ── Upload: manager throws 404 → 404 ────────────────────────────────────
  it('POST /api/v1/books/:bookId/assets — 404 NOT_FOUND for non-existent book', async () => {
    const notFoundError = new Error("We couldn't find that book");
    notFoundError.status = 404;
    notFoundError.code = 'NOT_FOUND';
    storageManager.uploadAssetManager.mockRejectedValue(notFoundError);

    const fakeBookId = new mongoose.Types.ObjectId().toString();
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);

    const res = await request(testApp)
      .post(`/api/v1/books/${fakeBookId}/assets`)
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── Upload: manager throws 403 (not owner) → 403 ─────────────────────────
  it('POST /api/v1/books/:bookId/assets — 403 FORBIDDEN for non-owner', async () => {
    const forbiddenError = new Error("You don't have permission to see this.");
    forbiddenError.status = 403;
    forbiddenError.code = 'FORBIDDEN';
    storageManager.uploadAssetManager.mockRejectedValue(forbiddenError);

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);

    const res = await request(testApp)
      .post(`/api/v1/books/${bookId}/assets`)
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── Upload: manager throws 400 (invalid file type) → 400 ──────────────────
  it('POST /api/v1/books/:bookId/assets — 400 INVALID_FILE_TYPE for bad file', async () => {
    const invalidError = new Error("Oops! We only accept pictures (PNG, JPG, WebP).");
    invalidError.status = 400;
    invalidError.code = 'INVALID_FILE_TYPE';
    storageManager.uploadAssetManager.mockRejectedValue(invalidError);

    const fakeBuffer = Buffer.from('MZ\x90\x00' + 'A'.repeat(100));

    const res = await request(testApp)
      .post(`/api/v1/books/${bookId}/assets`)
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', fakeBuffer, { filename: 'malware.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  // ── Upload: manager throws 413 (file too large) → 413 ──────────────────
  it('POST /api/v1/books/:bookId/assets — 413 PAYLOAD_TOO_LARGE for oversized file', async () => {
    const tooLargeError = new Error('This file is too big! Try a smaller picture.');
    tooLargeError.status = 413;
    tooLargeError.code = 'PAYLOAD_TOO_LARGE';
    storageManager.uploadAssetManager.mockRejectedValue(tooLargeError);

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);

    const res = await request(testApp)
      .post(`/api/v1/books/${bookId}/assets`)
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', pngBuffer, { filename: 'big.png', contentType: 'image/png' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  // ── Download: valid asset → 302 redirect ─────────────────────────────────
  it('GET /api/v1/assets/:assetId — 302 redirect to presigned URL', async () => {
    const fakeAssetId = new mongoose.Types.ObjectId().toString();
    storageManager.getSignedUrlManager.mockResolvedValue({
      url: 'https://minio.example.com/presigned-url',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    const res = await request(testApp)
      .get(`/api/v1/assets/${fakeAssetId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe('https://minio.example.com/presigned-url');
    expect(storageManager.getSignedUrlManager).toHaveBeenCalledWith({
      childId: CHILD_ID,
      assetId: fakeAssetId,
    });
  });

  // ── Download: without auth → 401 ────────────────────────────────────────
  it('GET /api/v1/assets/:assetId — 401 without Authorization header', async () => {
    const fakeAssetId = new mongoose.Types.ObjectId().toString();

    const res = await request(testApp)
      .get(`/api/v1/assets/${fakeAssetId}`);

    expect(res.status).toBe(401);
  });

  // ── Download: manager throws 403 (not owner) → 403 ──────────────────────
  it('GET /api/v1/assets/:assetId — 403 FORBIDDEN for non-owner', async () => {
    const fakeAssetId = new mongoose.Types.ObjectId().toString();
    const forbiddenError = new Error("You don't have permission to see this.");
    forbiddenError.status = 403;
    forbiddenError.code = 'FORBIDDEN';
    storageManager.getSignedUrlManager.mockRejectedValue(forbiddenError);

    const otherToken = makeAccessToken(OTHER_CHILD_ID);
    const res = await request(testApp)
      .get(`/api/v1/assets/${fakeAssetId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ── Download: manager throws 404 → 404 ───────────────────────────────────
  it('GET /api/v1/assets/:assetId — 404 NOT_FOUND for non-existent asset', async () => {
    const fakeAssetId = new mongoose.Types.ObjectId().toString();
    const notFoundError = new Error("We couldn't find that picture.");
    notFoundError.status = 404;
    notFoundError.code = 'NOT_FOUND';
    storageManager.getSignedUrlManager.mockRejectedValue(notFoundError);

    const res = await request(testApp)
      .get(`/api/v1/assets/${fakeAssetId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── Download: invalid assetId format → 400 ──────────────────────────────
  it('GET /api/v1/assets/:assetId — 400 for invalid assetId format', async () => {
    const res = await request(testApp)
      .get('/api/v1/assets/not-a-valid-id')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
  });
});