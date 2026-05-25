// Contopia — Storage Router Integration Tests (STORY-027)
// Tests for POST /books/:bookId/assets with ?type=cover
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ok, fail } from '../app/common/response-envelope.js';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// Mock storage-manager
vi.mock('../app/storage/storage-manager.js', () => ({
  uploadAssetManager: vi.fn(),
  getSignedUrlManager: vi.fn(),
}));

// Mock validation middleware
vi.mock('../app/common/validation-middleware.js', () => ({
  validate: () => (req, _res, next) => {
    req._params = { bookId: req.params.bookId };
    next();
  },
}));

import storageRouter from '../app/storage/storage-router.js';
import * as storageManager from '../app/storage/storage-manager.js';

function createApp() {
  const app = express();
  app.use(express.json());
  // Auth middleware mock (sets req.childId)
  app.use((req, _res, next) => {
    req.childId = '507f1f77bcf86cd799439011';
    req.id = 'test-request-id';
    next();
  });
  app.use(storageRouter);
  return app;
}

describe('storage-router — POST /books/:bookId/assets', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('should return 201 for cover upload with ?type=cover', async () => {
    storageManager.uploadAssetManager.mockResolvedValue({
      assetId: 'cover-asset-123',
      thumbnailAssetId: 'thumb-asset-456',
      thumbnailUrl: 'https://s3.example.com/thumb.jpg',
      fullUrl: 'https://s3.example.com/cover.jpg',
      dominantColor: '#4a9b6e',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    const res = await request(app)
      .post('/books/507f1f77bcf86cd799439012/assets?type=cover')
      .attach('file', Buffer.from('fake-image'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      assetId: 'cover-asset-123',
      thumbnailUrl: expect.any(String),
      fullUrl: expect.any(String),
      dominantColor: '#4a9b6e',
    });
  });

  it('should call uploadAssetManager with type=cover when ?type=cover', async () => {
    storageManager.uploadAssetManager.mockResolvedValue({
      assetId: 'cover-asset-123',
      fullUrl: 'https://s3.example.com/cover.jpg',
    });

    await request(app)
      .post('/books/507f1f77bcf86cd799439012/assets?type=cover')
      .attach('file', Buffer.from('fake-image'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(storageManager.uploadAssetManager).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: '507f1f77bcf86cd799439011',
        bookId: '507f1f77bcf86cd799439012',
        type: 'cover',
      })
    );
  });

  it('should call uploadAssetManager with type=upload when no ?type param', async () => {
    storageManager.uploadAssetManager.mockResolvedValue({
      assetId: 'generic-asset',
      url: 'https://s3.example.com/file.jpg',
      expiresAt: new Date().toISOString(),
    });

    await request(app)
      .post('/books/507f1f77bcf86cd799439012/assets')
      .attach('file', Buffer.from('fake-image'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(storageManager.uploadAssetManager).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'upload' })
    );
  });

  it('should return 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/books/507f1f77bcf86cd799439012/assets?type=cover');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('should return error from storage-manager with correct status', async () => {
    const err = new Error("We couldn't find that book");
    err.status = 404;
    err.code = 'NOT_FOUND';
    storageManager.uploadAssetManager.mockRejectedValue(err);

    const res = await request(app)
      .post('/books/507f1f77bcf86cd799439012/assets?type=cover')
      .attach('file', Buffer.from('fake-image'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 413 for multer file size limit', async () => {
    // Supertest attach with >5MB buffer triggers multer LIMIT_FILE_SIZE
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024);
    const res = await request(app)
      .post('/books/507f1f77bcf86cd799439012/assets?type=cover')
      .attach('file', bigBuffer, { filename: 'big.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
