// Contopia — Auth Router: DELETE /account Integration Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock auth-dao.js (used by auth-manager)
vi.mock('../auth-dao.js', () => ({
  findParentByEmail: vi.fn(),
  findParentByVerificationTokenHash: vi.fn(),
  createParent: vi.fn(),
  updateParentVerification: vi.fn(),
  markParentVerified: vi.fn(),
  clearParentVerificationToken: vi.fn(),
  findChildById: vi.fn(),
  findActiveChildByParentAndName: vi.fn(),
  findPendingChildByParentAndName: vi.fn(),
  createChild: vi.fn(),
  activateChild: vi.fn(),
  findPendingChildByParent: vi.fn(),
  findChildByIdWithPassword: vi.fn(),
  updateChildPassword: vi.fn(),
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
  softDeleteChildById: vi.fn(),
  hardDeleteChildById: vi.fn(),
}));

// Mock storage-manager (used by auth-manager)
vi.mock('../storage/storage-manager.js', () => ({
  purgeAssetsByAuthorManager: vi.fn().mockResolvedValue(undefined),
}));

// Mock redis with required methods (auth-middleware calls redis.get for session)
vi.mock('../../../config/redis.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(JSON.stringify({ sessionId: 'sess_test123', childId: 'child123', createdAt: new Date().toISOString(), lastActivity: new Date().toISOString() })),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    scanIterator: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
    quit: vi.fn().mockResolvedValue(undefined),
    call: vi.fn(),
    status: 'ready',
  },
  status: 'ready',
}));

// Mock jsonwebtoken — verify returns a valid session with sid
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn().mockReturnValue({ sub: 'child123', type: 'access', parentId: 'p1', sid: 'sess_test123' }),
  },
}));

// Mock email-service
vi.mock('../common/email-service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock pino
vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import after mocks
import authRouter from '../auth-router.js';
import * as authDao from '../auth-dao.js';

function buildApp() {
  const app = express();
  app.use((req, res, next) => {
    req.id = 'test-request-id';
    next();
  });
  app.use('/api/auth', authRouter);
  return app;
}

describe('DELETE /api/auth/account', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it('should return 200 and { deleted: true } when account is deleted', async () => {
    authDao.findChildById.mockResolvedValue({ _id: 'child123', firstName: 'João' });
    authDao.softDeleteChildById.mockResolvedValue({ _id: 'child123', deletedAt: new Date() });

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { deleted: true },
      meta: { requestId: 'test-request-id' },
    });
  });

  it('should return 401 when no authorization header is provided', async () => {
    const res = await request(app).delete('/api/auth/account');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});