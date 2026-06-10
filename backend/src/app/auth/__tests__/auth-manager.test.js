// Contopia — Auth Manager Tests (co-located)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// ── Mock crypto at module level (so internal hashToken calls go through mock) ─
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal();
  const mockHash = {
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mocked-hash-value'),
  };
  return {
    ...actual,
    default: { ...actual.default, createHash: vi.fn().mockReturnValue(mockHash) },
    createHash: vi.fn().mockReturnValue(mockHash),
  };
});

vi.mock('jsonwebtoken');
vi.mock('../auth-dao.js', () => ({
  findChildById: vi.fn(),
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
}));
vi.mock('../../../config/redis.js');
vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Now safe to import
import * as authManager from '../auth-manager.js';
import * as authDao from '../auth-dao.js';
import redis from '../../../config/redis.js';

describe('Auth Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Token Generation ──────────────────────────────────────────────────────

  describe('generateVerificationToken', () => {
    it('should generate token with correct claims and 72h expiry', () => {
      const parent = { _id: 'parent123', email: 'test@example.com' };
      const child = { _id: 'child123' };
      jwt.sign.mockReturnValue('mock-token');

      const result = authManager.generateVerificationToken(parent, child);
      expect(result).toBe('mock-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'parent123', email: 'test@example.com', childId: 'child123', type: 'email_verification' },
        JWT_SECRET,
        { expiresIn: '72h' }
      );
    });
  });

  describe('generateAccessToken', () => {
    it('should generate access token with correct claims and 30m expiry', () => {
      const child = { _id: 'child123', parentId: 'parent123' };
      jwt.sign.mockReturnValue('mock-access');

      const result = authManager.generateAccessToken(child);
      expect(result).toBe('mock-access');
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'child123', parentId: 'parent123', role: 'child', type: 'access' },
        JWT_SECRET,
        { expiresIn: '30m' }
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct claims and 7d expiry', () => {
      const child = { _id: 'child123' };
      jwt.sign.mockReturnValue('mock-refresh');

      const result = authManager.generateRefreshToken(child);
      expect(result).toBe('mock-refresh');
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'child123', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
    });
  });

  describe('hashToken', () => {
    it('should hash a JWT string', () => {
      // crypto is mocked to return 'mocked-hash-value'
      const result = authManager.hashToken('any-token');
      expect(result).toBe('mocked-hash-value');
    });
  });

  // ── childLogin ────────────────────────────────────────────────────────────

  describe('childLogin', () => {
    it('should login child successfully', async () => {
      const child = {
        _id: 'c1', parentId: 'p1', firstName: 'João', isActive: true, onboardingCompleted: false,
      };
      authDao.findChildById.mockResolvedValue(child);
      // childLogin calls: generateAccessToken(no sid), generateRefreshToken, generateAccessToken(with sid)
      jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh').mockReturnValueOnce('access');
      redis.set.mockResolvedValue('OK');

      const result = await authManager.childLogin({ childId: 'c1', parentId: 'p1' });
      expect(result).toMatchObject({
        accessToken: 'access', childId: 'c1', childFirstName: 'João', isOnboardingComplete: false,
        method: 'id', refreshAvailable: true, refreshToken: 'refresh',
      });
      expect(result.sessionId).toMatch(/^sess_/);
      expect(redis.set).toHaveBeenCalledWith(
        'refresh:c1', 'mocked-hash-value', 'EX', 604800
      );
    });

    it('should succeed even when Redis fails (non-blocking)', async () => {
      const child = {
        _id: 'c1', parentId: 'p1', firstName: 'A', isActive: true, onboardingCompleted: true,
      };
      authDao.findChildById.mockResolvedValue(child);
      // childLogin calls: generateAccessToken(no sid), generateRefreshToken, generateAccessToken(with sid)
      jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh').mockReturnValueOnce('access');
      redis.set.mockRejectedValue(new Error('Redis down'));

      const result = await authManager.childLogin({ childId: 'c1', parentId: 'p1' });
      expect(result.accessToken).toBe('access');
      expect(result.isOnboardingComplete).toBe(true);
    });

    it('should throw NOT_FOUND when child does not exist', async () => {
      authDao.findChildById.mockResolvedValue(null);
      await expect(
        authManager.childLogin({ childId: 'x', parentId: 'p1' })
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should throw FORBIDDEN when parentId mismatch', async () => {
      authDao.findChildById.mockResolvedValue({ _id: 'c1', parentId: 'other', isActive: true });
      await expect(
        authManager.childLogin({ childId: 'c1', parentId: 'p1' })
      ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    });

    it('should throw NOT_VERIFIED when child inactive', async () => {
      authDao.findChildById.mockResolvedValue({ _id: 'c1', parentId: 'p1', isActive: false });
      await expect(
        authManager.childLogin({ childId: 'c1', parentId: 'p1' })
      ).rejects.toMatchObject({ code: 'NOT_VERIFIED', status: 403 });
    });
  });
});
