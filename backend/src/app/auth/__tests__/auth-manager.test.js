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
  findChildrenByParentId: vi.fn(),
  findActiveChildByParentAndName: vi.fn(),
  createChild: vi.fn(),
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
  findParentByEmail: vi.fn(),
  hashIdentifier: vi.fn((v) => `hashed:${v}`),
}));
vi.mock('../../book/book-dao.js', () => ({
  createActivityLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
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
import * as bookDao from '../../book/book-dao.js';
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

  // ── checkParentEmail (STORY-062) ─────────────────────────────────────────

  describe('checkParentEmail (STORY-062)', () => {
    const defaultParams = {
      email: 'parent@example.com',
      ip: '127.0.0.1',
      deviceHint: 'TestAgent/1.0',
    };

    it('should return { exists: true } when parent is found', async () => {
      authDao.findParentByEmail.mockResolvedValue({
        _id: 'parent123',
        email: 'parent@example.com',
      });

      const result = await authManager.checkParentEmail(defaultParams);

      expect(result).toEqual({ exists: true });
      expect(authDao.findParentByEmail).toHaveBeenCalledWith('parent@example.com');
    });

    it('should return { exists: false } when parent is not found', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);

      const result = await authManager.checkParentEmail(defaultParams);

      expect(result).toEqual({ exists: false });
      expect(authDao.findParentByEmail).toHaveBeenCalledWith('parent@example.com');
    });

    it('should call createAuditLog with EMAIL_CHECK event and hashed email', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);

      await authManager.checkParentEmail(defaultParams);

      expect(authDao.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'unknown',
          sessionId: 'email_check',
          event: 'EMAIL_CHECK',
          ip: '127.0.0.1',
          deviceHint: 'TestAgent/1.0',
          emailHash: 'hashed:parent@example.com',
        }),
      );
    });

    it('should call hashIdentifier with the provided email', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);

      await authManager.checkParentEmail(defaultParams);

      expect(authDao.hashIdentifier).toHaveBeenCalledWith('parent@example.com');
    });

    it('should not throw when createAuditLog fails (fire-and-forget)', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createAuditLog.mockReturnValue({
        catch: vi.fn((fn) => fn(new Error('Audit log failed'))),
      });

      // Should not throw — fire-and-forget with .catch()
      const result = await authManager.checkParentEmail(defaultParams);
      expect(result).toEqual({ exists: false });
    });

    it('should introduce jitter delay between 50-150ms', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);

      const start = Date.now();
      await authManager.checkParentEmail(defaultParams);
      const elapsed = Date.now() - start;

      // Jitter is Math.random() * 100 + 50, so min 50ms, max 150ms
      // Allow tolerance for setTimeout precision
      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(elapsed).toBeLessThanOrEqual(200);
    });

    it('should have timing variance < 200ms between exists and not-exists calls', async () => {
      // Measure timing for exists: true (parent found)
      authDao.findParentByEmail.mockResolvedValue({ _id: 'p1', email: 'a@b.com' });
      const startExists = Date.now();
      await authManager.checkParentEmail(defaultParams);
      const elapsedExists = Date.now() - startExists;

      // Measure timing for exists: false (parent not found)
      authDao.findParentByEmail.mockResolvedValue(null);
      const startNotExists = Date.now();
      await authManager.checkParentEmail(defaultParams);
      const elapsedNotExists = Date.now() - startNotExists;

      const variance = Math.abs(elapsedExists - elapsedNotExists);
      // Both include 50-150ms jitter, so variance should be < 200ms
      expect(variance).toBeLessThan(200);
    });

    it('should not disclose PII in return value', async () => {
      authDao.findParentByEmail.mockResolvedValue({
        _id: 'parent123',
        email: 'parent@example.com',
        lastLogin: new Date(),
      });

      const result = await authManager.checkParentEmail(defaultParams);

      // Only { exists: boolean } — no PII
      expect(result).toEqual({ exists: true });
      expect(Object.keys(result)).toEqual(['exists']);
      expect(typeof result.exists).toBe('boolean');
    });

    it('should handle missing optional params gracefully', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);

      const result = await authManager.checkParentEmail({ email: 'test@example.com' });

      expect(result).toEqual({ exists: false });
    });
  });

  // ── createChildProfile (STORY-063) ──────────────────────────────────────

  describe('createChildProfile (STORY-063)', () => {
    const parentId = 'parent123';
    const createdChild = {
      _id: '64abc123def4567890123456',
      parentId,
      firstName: 'Julia',
      avatarSeed: 'julia-seed',
      dateOfBirth: '2018-05-12',
    };

    it('should pass dateOfBirth to createChild when provided', async () => {
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(createdChild);

      await authManager.createChildProfile({
        parentId,
        firstName: 'Julia',
        avatarSeed: 'julia-seed',
        dateOfBirth: '2018-05-12',
      });

      expect(authDao.createChild).toHaveBeenCalledWith({
        parentId,
        firstName: 'Julia',
        avatarSeed: 'julia-seed',
        dateOfBirth: '2018-05-12',
      });
    });

    it('should not pass dateOfBirth when undefined', async () => {
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue({ ...createdChild, dateOfBirth: null });

      await authManager.createChildProfile({
        parentId,
        firstName: 'Julia',
        avatarSeed: 'julia-seed',
      });

      expect(authDao.createChild).toHaveBeenCalledWith({
        parentId,
        firstName: 'Julia',
        avatarSeed: 'julia-seed',
        dateOfBirth: undefined,
      });
    });

    it('should create CHILD_CREATED activity log with hashed childId metadata', async () => {
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(createdChild);

      await authManager.createChildProfile({
        parentId,
        firstName: 'Julia',
        dateOfBirth: '2018-05-12',
      });

      expect(bookDao.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: parentId,
          actorType: 'parent',
          action: 'CHILD_CREATED',
          targetId: createdChild._id,
          targetType: 'child',
        })
      );
      // metadata.childId should be a SHA-256 hash of the childId string.
      // crypto is mocked at module level → returns 'mocked-hash-value'.
      const callArgs = bookDao.createActivityLog.mock.calls[0][0];
      expect(callArgs.metadata.childId).toBe('mocked-hash-value');
    });

    it('should throw CHILD_LIMIT_REACHED when parent has 5 children', async () => {
      authDao.findChildrenByParentId.mockResolvedValue([
        { _id: 'c1' }, { _id: 'c2' }, { _id: 'c3' }, { _id: 'c4' }, { _id: 'c5' },
      ]);

      await expect(
        authManager.createChildProfile({ parentId, firstName: 'Sixth' })
      ).rejects.toMatchObject({ code: 'CHILD_LIMIT_REACHED', status: 409 });

      expect(authDao.createChild).not.toHaveBeenCalled();
    });

    it('should throw ACCOUNT_EXISTS when active child name already exists', async () => {
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.findActiveChildByParentAndName.mockResolvedValue({ _id: 'existing', firstName: 'Julia' });

      await expect(
        authManager.createChildProfile({ parentId, firstName: 'Julia' })
      ).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS', status: 409 });

      expect(authDao.createChild).not.toHaveBeenCalled();
    });

    it('should return { child } on success', async () => {
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(createdChild);

      const result = await authManager.createChildProfile({
        parentId,
        firstName: 'Julia',
        dateOfBirth: '2018-05-12',
      });

      expect(result.child).toEqual(createdChild);
    });

    it('should not throw when createActivityLog fails (fire-and-forget)', async () => {
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(createdChild);
      bookDao.createActivityLog.mockReturnValueOnce({
        catch: vi.fn((fn) => fn(new Error('Audit log failed'))),
      });

      const result = await authManager.createChildProfile({
        parentId,
        firstName: 'Julia',
        dateOfBirth: '2018-05-12',
      });

      expect(result.child).toEqual(createdChild);
    });
  });
});
