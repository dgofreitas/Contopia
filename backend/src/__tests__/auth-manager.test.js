// Contopia — Auth Manager Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock crypto at module level ──────────────────────────────────────────────
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal();
  const mockHash = { update: vi.fn().mockReturnThis(), digest: vi.fn().mockReturnValue('mocked-hash') };
  return {
    ...actual,
    default: { ...actual.default, createHash: vi.fn().mockReturnValue(mockHash) },
    createHash: vi.fn().mockReturnValue(mockHash),
  };
});

vi.mock('jsonwebtoken');
vi.mock('../app/auth/auth-dao.js');
vi.mock('../config/redis.js');
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

const JWT_SECRET = 'test-secret';
const TH = 'mocked-hash';

// Now import
import jwt from 'jsonwebtoken';
import * as authManager from '../app/auth/auth-manager.js';
import * as authDao from '../app/auth/auth-dao.js';
import redis from '../config/redis.js';

// Add mocks for newer DAO functions (auto-mock may not cover all)
authDao.findPendingChildByParent = vi.fn();
authDao.findPendingChildByParentAndName = vi.fn();
authDao.findChildByIdWithPassword = vi.fn();
authDao.updateChildPassword = vi.fn();
authDao.createAuditLog = vi.fn().mockReturnValue({ catch: vi.fn() });

describe('Auth Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVerificationToken', () => {
    it('should generate token with correct claims and expiry', () => {
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
    it('should generate access token with correct claims', () => {
      const child = { _id: 'child123', parentId: 'parent123' };
      jwt.sign.mockReturnValue('mock-access-token');

      const result = authManager.generateAccessToken(child);
      expect(result).toBe('mock-access-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'child123', parentId: 'parent123', role: 'child', type: 'access' },
        JWT_SECRET,
        { expiresIn: '30m' }
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct claims', () => {
      const child = { _id: 'child123' };
      jwt.sign.mockReturnValue('mock-refresh-token');

      const result = authManager.generateRefreshToken(child);
      expect(result).toBe('mock-refresh-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'child123', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
    });
  });

  describe('hashToken', () => {
    it('should generate deterministic SHA-256 hash', () => {
      const result = authManager.hashToken('test-token');
      expect(result).toBe(TH);
    });
  });

  describe('registerParentAndChild', () => {
    it('should create new parent and child when parent does not exist', async () => {
      const parent = { _id: 'parent123', email: 'new@example.com' };
      const child = { _id: 'child123', firstName: 'João' };

      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createParent.mockResolvedValue(parent);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(child);
      authDao.updateParentVerification.mockResolvedValue({});
      jwt.sign.mockReturnValue('mock-verification-token');

      const result = await authManager.registerParentAndChild({
        parentEmail: 'new@example.com',
        childFirstName: 'João',
      });

      expect(result.parent).toEqual(parent);
      expect(result.child).toEqual(child);
      expect(result.token).toBe('mock-verification-token');
      expect(result.tokenHash).toBeDefined();
    });

    it('should use existing parent when parent exists', async () => {
      const parent = { _id: 'parent123', email: 'existing@example.com' };
      const child = { _id: 'child123', firstName: 'João' };

      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue(child);
      authDao.updateParentVerification.mockResolvedValue({});
      jwt.sign.mockReturnValue('mock-verification-token');

      const result = await authManager.registerParentAndChild({
        parentEmail: 'existing@example.com',
        childFirstName: 'João',
      });

      expect(authDao.createParent).not.toHaveBeenCalled();
      expect(result.parent).toEqual(parent);
    });

    it('should throw ACCOUNT_EXISTS when duplicate active child exists', async () => {
      const parent = { _id: 'parent123', email: 'existing@example.com' };
      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findActiveChildByParentAndName.mockResolvedValue({ _id: 'child123', firstName: 'João', isActive: true });

      await expect(
        authManager.registerParentAndChild({
          parentEmail: 'existing@example.com',
          childFirstName: 'João',
        })
      ).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS', status: 409 });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'parent123',
        email: 'test@example.com',
        verificationToken: TH,
        verificationTokenExpires: new Date(Date.now() + 3600000),
      });
      jwt.verify.mockReturnValue({
        sub: 'parent123', email: 'test@example.com', childId: 'child123', type: 'email_verification',
      });
      authDao.markParentVerified.mockResolvedValue({});
      authDao.clearParentVerificationToken.mockResolvedValue({});
      authDao.activateChild.mockResolvedValue({});

      const result = await authManager.verifyEmail('valid-token');
      expect(result).toEqual({ childId: 'child123' });
      expect(authDao.markParentVerified).toHaveBeenCalledWith('parent123');
      expect(authDao.clearParentVerificationToken).toHaveBeenCalledWith('parent123');
      expect(authDao.activateChild).toHaveBeenCalledWith('child123');
    });

    it('should throw TOKEN_NOT_FOUND when token not found', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue(null);
      await expect(authManager.verifyEmail('invalid-token')).rejects.toMatchObject({
        code: 'TOKEN_NOT_FOUND', status: 404,
      });
    });

    it('should throw TOKEN_EXPIRED when token expired', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'parent123',
        verificationToken: TH,
        verificationTokenExpires: new Date(Date.now() - 3600000),
      });
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired'); error.name = 'TokenExpiredError'; throw error;
      });
      await expect(authManager.verifyEmail('expired-token')).rejects.toMatchObject({
        code: 'TOKEN_EXPIRED', status: 410,
      });
    });

    it('should throw INVALID_TOKEN when token type is wrong', async () => {
      authDao.findParentByVerificationTokenHash.mockResolvedValue({
        _id: 'parent123',
        verificationToken: TH,
        verificationTokenExpires: new Date(Date.now() + 3600000),
      });
      jwt.verify.mockReturnValue({
        sub: 'parent123', email: 'test@example.com', childId: 'child123', type: 'wrong_type',
      });
      await expect(authManager.verifyEmail('wrong-type-token')).rejects.toMatchObject({
        code: 'INVALID_TOKEN', status: 400,
      });
    });
  });

  describe('resendVerification', () => {
    it('should resend verification successfully', async () => {
      const parent = { _id: 'parent123', email: 'test@example.com', isVerified: false };
      const child = { _id: 'child123', firstName: 'João', isActive: false };

      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findPendingChildByParent.mockResolvedValue(child);
      jwt.sign.mockReturnValue('new-mock-token');
      authDao.updateParentVerification.mockResolvedValue({});

      const result = await authManager.resendVerification('test@example.com');
      expect(result.token).toBe('new-mock-token');
      expect(result.parentId).toBe('parent123');
      expect(result.childFirstName).toBe('João');
    });

    it('should throw NOT_FOUND when parent not found', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);
      await expect(
        authManager.resendVerification('nonexistent@example.com')
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should throw NOT_FOUND when parent already verified', async () => {
      authDao.findParentByEmail.mockResolvedValue({ _id: 'parent123', email: 'test@example.com', isVerified: true });
      await expect(
        authManager.resendVerification('test@example.com')
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });
  });

  describe('childLogin', () => {
    it('should login child successfully', async () => {
      const child = {
        _id: 'child123', parentId: 'parent123', firstName: 'João',
        isActive: true, onboardingCompleted: false,
      };
      authDao.findChildById.mockResolvedValue(child);
      // childLogin calls: generateAccessToken (no sid), generateRefreshToken, generateAccessToken (with sid)
      jwt.sign.mockReturnValueOnce('mock-access-token').mockReturnValueOnce('mock-refresh-token').mockReturnValueOnce('mock-access-token');
      redis.set.mockResolvedValue('OK');

      const result = await authManager.childLogin({ childId: 'child123', parentId: 'parent123' });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        childId: 'child123',
        childFirstName: 'João',
        isOnboardingComplete: false,
        method: 'id',
        refreshAvailable: true,
        refreshToken: 'mock-refresh-token',
        sessionId: result.sessionId, // dynamic — just check it exists
      });
      expect(result.sessionId).toMatch(/^sess_/);
      expect(redis.set).toHaveBeenCalledWith('refresh:child123', TH, 'EX', 7 * 24 * 60 * 60);
    });

    it('should succeed when Redis set fails (non-blocking)', async () => {
      const child = {
        _id: 'child123', parentId: 'parent123', firstName: 'A',
        isActive: true, onboardingCompleted: true,
      };
      authDao.findChildById.mockResolvedValue(child);
      jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh').mockReturnValueOnce('access');
      redis.set.mockRejectedValue(new Error('Redis down'));

      const result = await authManager.childLogin({ childId: 'child123', parentId: 'parent123' });
      expect(result.accessToken).toBe('access');
      expect(result.isOnboardingComplete).toBe(true);
    });

    it('should throw NOT_FOUND when child not found', async () => {
      authDao.findChildById.mockResolvedValue(null);
      await expect(
        authManager.childLogin({ childId: 'nonexistent', parentId: 'parent123' })
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should throw FORBIDDEN when parentId mismatch', async () => {
      authDao.findChildById.mockResolvedValue({
        _id: 'child123', parentId: 'different-parent', isActive: true,
      });
      await expect(
        authManager.childLogin({ childId: 'child123', parentId: 'parent123' })
      ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    });

    it('should throw NOT_VERIFIED when child not active', async () => {
      authDao.findChildById.mockResolvedValue({
        _id: 'child123', parentId: 'parent123', isActive: false,
      });
      await expect(
        authManager.childLogin({ childId: 'child123', parentId: 'parent123' })
      ).rejects.toMatchObject({ code: 'NOT_VERIFIED', status: 403 });
    });
  });

  describe('registerParentAndChildIdempotent', () => {
    it('should return resent:true and resend when pending child exists', async () => {
      const parent = { _id: 'parent123', email: 'test@example.com' };
      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findPendingChildByParentAndName.mockResolvedValue({ _id: 'child123', firstName: 'João', isActive: false });
      jwt.sign.mockReturnValue('resent-token');
      authDao.updateParentVerification.mockResolvedValue({});

      const result = await authManager.registerParentAndChildIdempotent({
        parentEmail: 'test@example.com',
        childFirstName: 'João',
      });

      expect(result.resent).toBe(true);
      expect(result.token).toBe('resent-token');
      expect(authDao.createChild).not.toHaveBeenCalled();
    });

    it('should return resent:false and register when no pending child exists', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createParent.mockResolvedValue({ _id: 'parent456', email: 'new@example.com' });
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);
      authDao.createChild.mockResolvedValue({ _id: 'child456', firstName: 'João' });
      authDao.updateParentVerification.mockResolvedValue({});
      jwt.sign.mockReturnValue('new-token');

      const result = await authManager.registerParentAndChildIdempotent({
        parentEmail: 'new@example.com',
        childFirstName: 'João',
      });

      expect(result.resent).toBe(false);
      expect(result.parent._id).toBe('parent456');
      expect(result.child._id).toBe('child456');
    });

    it('should throw ACCOUNT_EXISTS when duplicate active child exists', async () => {
      const parent = { _id: 'parent123', email: 'existing@example.com' };
      authDao.findParentByEmail.mockResolvedValue(parent);
      authDao.findPendingChildByParentAndName.mockResolvedValue(null);
      authDao.findActiveChildByParentAndName.mockResolvedValue({ _id: 'child123', firstName: 'João', isActive: true });

      await expect(
        authManager.registerParentAndChildIdempotent({
          parentEmail: 'existing@example.com',
          childFirstName: 'João',
        })
      ).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS', status: 409 });
    });
  });
});
