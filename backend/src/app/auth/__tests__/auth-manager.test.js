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

  // ── registerParentAndChild ────────────────────────────────────────────────

  describe('registerParentAndChild', () => {
    it('should create new parent + child when parent does not exist', async () => {
      const parent = { _id: 'p1', email: 'new@ex.com' };
      const child = { _id: 'c1', firstName: 'João' };

      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createParent.mockResolvedValue(parent);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(child);
      authDao.updateParentVerification.mockResolvedValue({});
      jwt.sign.mockReturnValue('vt');

      const result = await authManager.registerParentAndChild({
        parentEmail: 'new@ex.com',
        childFirstName: 'João',
      });

      expect(result.parent).toEqual(parent);
      expect(result.child).toEqual(child);
      expect(result.token).toBe('vt');
      expect(authDao.createParent).toHaveBeenCalledWith({ email: 'new@ex.com' });
      expect(authDao.createChild).toHaveBeenCalledWith({ parentId: 'p1', firstName: 'João' });
    });

    it('should reuse existing parent without creating a new one', async () => {
      const parent = { _id: 'p1', email: 'old@ex.com' };
      const child = { _id: 'c1', firstName: 'João' };

      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(child);
      authDao.updateParentVerification.mockResolvedValue({});
      jwt.sign.mockReturnValue('vt');

      const result = await authManager.registerParentAndChild({
        parentEmail: 'old@ex.com',
        childFirstName: 'João',
      });

      expect(authDao.createParent).not.toHaveBeenCalled();
      expect(result.parent).toEqual(parent);
    });

    it('should throw ACCOUNT_EXISTS when active child with same name exists', async () => {
      const parent = { _id: 'p1', email: 'e@ex.com' };
      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findActiveChildByParentAndName.mockResolvedValue({ _id: 'c99', isActive: true });

      await expect(
        authManager.registerParentAndChild({ parentEmail: 'e@ex.com', childFirstName: 'João' })
      ).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS', status: 409 });
    });

    it('should store hashed token + expiry on parent', async () => {
      const parent = { _id: 'p1', email: 'e@ex.com' };
      const child = { _id: 'c1', firstName: 'João' };
      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(child);
      authDao.updateParentVerification.mockResolvedValue({});
      jwt.sign.mockReturnValue('vt');

      await authManager.registerParentAndChild({ parentEmail: 'e@ex.com', childFirstName: 'João' });

      expect(authDao.updateParentVerification).toHaveBeenCalledTimes(1);
      const [pId, data] = authDao.updateParentVerification.mock.calls[0];
      expect(pId).toBe('p1');
      expect(data.verificationToken).toBe('mocked-hash-value');
      expect(data.verificationTokenExpires).toBeInstanceOf(Date);
      const diff = data.verificationTokenExpires.getTime() - Date.now();
      expect(diff).toBeGreaterThan(71 * 3600 * 1000);
      expect(diff).toBeLessThan(73 * 3600 * 1000);
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    const TH = 'mocked-hash-value';

    it('should verify → mark parent verified, clear token, activate child', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'p1',
        verificationToken: TH,
        verificationTokenExpires: new Date(Date.now() + 3600000),
      });
      jwt.verify.mockReturnValue({
        sub: 'p1', email: 'e@ex.com', childId: 'c1', type: 'email_verification',
      });
      authDao.markParentVerified.mockResolvedValue({});
      authDao.clearParentVerificationToken.mockResolvedValue({});
      authDao.activateChild.mockResolvedValue({});

      const result = await authManager.verifyEmail('token');
      expect(result).toEqual({ childId: 'c1' });
      expect(authDao.markParentVerified).toHaveBeenCalledWith('p1');
      expect(authDao.clearParentVerificationToken).toHaveBeenCalledWith('p1');
      expect(authDao.activateChild).toHaveBeenCalledWith('c1');
    });

    it('should throw TOKEN_NOT_FOUND when lookup returns null', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue(null);
      await expect(authManager.verifyEmail('x')).rejects.toMatchObject({ code: 'TOKEN_NOT_FOUND', status: 404 });
    });

    it('should throw TOKEN_EXPIRED when JWT TokenExpiredError', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'p1', verificationToken: TH, verificationTokenExpires: new Date(Date.now() + 3600000),
      });
      jwt.verify.mockImplementation(() => { const e = new Error('e'); e.name = 'TokenExpiredError'; throw e; });
      await expect(authManager.verifyEmail('x')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED', status: 410 });
    });

    it('should throw INVALID_TOKEN when JWT JsonWebTokenError', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'p1', verificationToken: TH, verificationTokenExpires: new Date(Date.now() + 3600000),
      });
      jwt.verify.mockImplementation(() => { const e = new Error('e'); e.name = 'JsonWebTokenError'; throw e; });
      await expect(authManager.verifyEmail('x')).rejects.toMatchObject({ code: 'INVALID_TOKEN', status: 400 });
    });

    it('should throw INVALID_TOKEN when token type is wrong', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'p1', verificationToken: TH, verificationTokenExpires: new Date(Date.now() + 3600000),
      });
      jwt.verify.mockReturnValue({ type: 'access' });
      await expect(authManager.verifyEmail('x')).rejects.toMatchObject({ code: 'INVALID_TOKEN', status: 400 });
    });

    it('should throw INVALID_TOKEN when hash mismatch', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'p1', verificationToken: 'different-hash', verificationTokenExpires: new Date(Date.now() + 3600000),
      });
      jwt.verify.mockReturnValue({ sub: 'p1', childId: 'c1', type: 'email_verification' });
      await expect(authManager.verifyEmail('x')).rejects.toMatchObject({ code: 'INVALID_TOKEN', status: 400 });
    });

    it('should throw TOKEN_EXPIRED when DB-level expiry in the past', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'p1', verificationToken: TH, verificationTokenExpires: new Date('2020-01-01'),
      });
      jwt.verify.mockReturnValue({ sub: 'p1', childId: 'c1', type: 'email_verification' });
      await expect(authManager.verifyEmail('x')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED', status: 410 });
    });
  });

  // ── resendVerification ────────────────────────────────────────────────────

  describe('resendVerification', () => {
    it('should resend verification for pending child', async () => {
      const parent = { _id: 'p1', email: 'e@ex.com', isVerified: false };
      const child = { _id: 'c1', firstName: 'João', isActive: false };

      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findPendingChildByParent.mockResolvedValue(child);
      jwt.sign.mockReturnValue('new-token');
      authDao.updateParentVerification.mockResolvedValue({});

      const result = await authManager.resendVerification('e@ex.com');
      expect(result.token).toBe('new-token');
      expect(result.parentId).toBe('p1');
      expect(result.childFirstName).toBe('João');
      expect(authDao.updateParentVerification).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when parent does not exist', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);
      await expect(authManager.resendVerification('x@x.com')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should throw NOT_FOUND when parent already verified', async () => {
      authDao.findParentByEmail.mockResolvedValue({ _id: 'p1', isVerified: true });
      await expect(authManager.resendVerification('x@x.com')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should throw NOT_FOUND when no pending child exists', async () => {
      authDao.findParentByEmail.mockResolvedValue({ _id: 'p1', email: 'e@ex.com', isVerified: false });
      authDao.findPendingChildByParent.mockResolvedValue(null);

      await expect(authManager.resendVerification('e@ex.com')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
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
