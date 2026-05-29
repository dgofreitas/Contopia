// Contopia — Reader Preferences API Integration Tests
// STORY-032: Font Size & Theme Settings
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ReadingPreferences } from '../reading-preferences-model.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

// ── Mock Redis (required by auth-middleware) ──────────────────────────────────
vi.mock('../../../config/redis.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(JSON.stringify({ sessionId: 'sess_test', childId: '507f1f77bcf86cd799439001', lastActivity: new Date().toISOString() })),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    quit: vi.fn().mockResolvedValue(undefined),
  },
  status: 'ready',
}));

// ── Mock pino ────────────────────────────────────────────────────────────────
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

// Use the real JWT_SECRET from setup
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function generateToken(childId, parentId = '507f1f77bcf86cd799439099') {
  return jwt.sign({ sub: childId, type: 'access', parentId, sid: 'sess_test' }, JWT_SECRET);
}

async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.id = 'test-request-id';
    next();
  });
  const readerRouter = (await import('../reader-router.js')).default;
  app.use('/api/v1/reader', readerRouter);
  return app;
}

describe('Reader Preferences API', () => {
  let app;
  let childId;
  let token;

  beforeAll(async () => {
    await connectTestDb();
    app = await buildApp();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
    childId = new mongoose.Types.ObjectId().toString();
    token = generateToken(childId);
    // Re-set default mock for Redis
    const redis = await import('../../../config/redis.js');
    redis.default.get.mockResolvedValue(JSON.stringify({ sessionId: 'sess_test', childId, lastActivity: new Date().toISOString() }));
    redis.default.exists.mockResolvedValue(0);
  });

  // ── GET /api/v1/reader/preferences ──────────────────────────────────────────

  describe('GET /preferences — authenticated', () => {
    it('should return default preferences when none exist', async () => {
      const res = await request(app)
        .get('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        fontSize: 'medium',
        theme: 'light',
        readingMode: 'paginated',
      });
      expect(res.body.data.childId).toBe(childId);
      expect(res.body.data.updatedAt).toBeNull();
    });

    it('should return stored preferences', async () => {
      await ReadingPreferences.create({
        childId,
        fontSize: 'large',
        theme: 'dark',
        readingMode: 'scroll',
      });

      const res = await request(app)
        .get('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        fontSize: 'large',
        theme: 'dark',
        readingMode: 'scroll',
      });
      expect(res.body.data.childId).toBe(childId);
      expect(res.body.data.updatedAt).not.toBeNull();
    });
  });

  // ── GET /preferences — unauthenticated ──────────────────────────────────────

  describe('GET /preferences — unauthenticated', () => {
    it('should return 401 when no auth header', async () => {
      const res = await request(app)
        .get('/api/v1/reader/preferences');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ── PUT /preferences — authenticated with valid data ────────────────────────

  describe('PUT /preferences — create and update', () => {
    it('should create preferences with partial data', async () => {
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ fontSize: 'large' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        fontSize: 'large',
        theme: 'light',
        readingMode: 'paginated',
      });
    });

    it('should update existing preferences (partial update)', async () => {
      // Create initial preferences
      await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ fontSize: 'small', theme: 'sepia' });

      // Partial update: change only theme
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'dark' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        fontSize: 'small',
        theme: 'dark',
        readingMode: 'paginated',
      });
    });

    it('should update all fields at once', async () => {
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ fontSize: 'large', theme: 'dark', readingMode: 'scroll' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        fontSize: 'large',
        theme: 'dark',
        readingMode: 'scroll',
      });
    });

    it('should persist update in database', async () => {
      await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ fontSize: 'small' });

      // Verify via direct DB query
      const doc = await ReadingPreferences.findOne({ childId });
      expect(doc).not.toBeNull();
      expect(doc.fontSize).toBe('small');
      expect(doc.theme).toBe('light');
      expect(doc.readingMode).toBe('paginated');
    });
  });

  // ── PUT /preferences — validation ──────────────────────────────────────────

  describe('PUT /preferences — validation', () => {
    it('should reject invalid fontSize value', async () => {
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ fontSize: 'extra-large' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid theme value', async () => {
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'neon' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid readingMode value', async () => {
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ readingMode: 'continuous' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty body (no fields provided)', async () => {
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject XSS injection in enum fields', async () => {
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ fontSize: '<script>alert("xss")</script>' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── PUT /preferences — unauthenticated ─────────────────────────────────────

  describe('PUT /preferences — unauthenticated', () => {
    it('should return 401 when no auth header', async () => {
      const res = await request(app)
        .put('/api/v1/reader/preferences')
        .send({ fontSize: 'large' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ── Index verification ──────────────────────────────────────────────────────

  describe('Model - unique index on childId', () => {
    it('should enforce unique index on childId', async () => {
      await ReadingPreferences.createIndexes();
      await ReadingPreferences.create({ childId });

      await expect(
        ReadingPreferences.create({ childId }),
      ).rejects.toThrow();
    });

    it('should allow different children to have preferences', async () => {
      const child1 = new mongoose.Types.ObjectId();
      const child2 = new mongoose.Types.ObjectId();

      await ReadingPreferences.create({ childId: child1 });
      await ReadingPreferences.create({ childId: child2 });

      const count = await ReadingPreferences.countDocuments();
      expect(count).toBe(2);
    });
  });

  describe('Model - default values', () => {
    it('should default fontSize to medium', async () => {
      const prefs = await ReadingPreferences.create({ childId: new mongoose.Types.ObjectId() });
      expect(prefs.fontSize).toBe('medium');
    });

    it('should default theme to light', async () => {
      const prefs = await ReadingPreferences.create({ childId: new mongoose.Types.ObjectId() });
      expect(prefs.theme).toBe('light');
    });

    it('should default readingMode to paginated', async () => {
      const prefs = await ReadingPreferences.create({ childId: new mongoose.Types.ObjectId() });
      expect(prefs.readingMode).toBe('paginated');
    });
  });

  describe('Model - enum validation', () => {
    it('should reject invalid fontSize', async () => {
      await expect(
        ReadingPreferences.create({ childId: new mongoose.Types.ObjectId(), fontSize: 'huge' }),
      ).rejects.toThrow();
    });

    it('should reject invalid theme', async () => {
      await expect(
        ReadingPreferences.create({ childId: new mongoose.Types.ObjectId(), theme: 'neon' }),
      ).rejects.toThrow();
    });

    it('should reject invalid readingMode', async () => {
      await expect(
        ReadingPreferences.create({ childId: new mongoose.Types.ObjectId(), readingMode: 'rapid' }),
      ).rejects.toThrow();
    });
  });
});