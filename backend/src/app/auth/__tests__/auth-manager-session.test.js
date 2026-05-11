// Contopia — Auth Manager Session Tests (STORY-002)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// ── Mocks at module level ──────────────────────────────────────────────────
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
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
  compare: vi.fn(),
}));

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

import * as authManager from '../auth-manager.js';
import * as authDao from '../auth-dao.js';
import redis from '../../../config/redis.js';
import bcrypt from 'bcryptjs';

describe('Auth Manager — Session Functions (STORY-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createSession ────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('should create session in Redis and return sessionId + refreshAvailable', async () => {
      redis.keys.mockResolvedValue([]); // no old sessions
      redis.set.mockResolvedValue('OK');

      const result = await authManager.createSession({
        childId: 'child1',
        parentId: 'parent1',
        accessToken: 'at',
        refreshToken: 'rt',
        ip: '127.0.0.1',
        deviceHint: 'ContopiaApp/1.0',
      });

      expect(result.sessionId).toMatch(/^sess_/);
      expect(result.refreshAvailable).toBe(true);

      // Verify session stored in Redis with TTL
      const sessionCall = redis.set.mock.calls.find(
        (c) => c[0].startsWith('session:child1:sess_'),
      );
      expect(sessionCall).toBeDefined();
      expect(sessionCall[2]).toBe('EX');
      expect(sessionCall[3]).toBe(1800); // SESSION_TTL_SECONDS

      // Verify refresh hash stored
      const refreshCall = redis.set.mock.calls.find(
        (c) => c[0] === 'refresh:child1',
      );
      expect(refreshCall).toBeDefined();
      expect(refreshCall[2]).toBe('EX');
      expect(refreshCall[3]).toBe(604800); // REFRESH_TTL_SECONDS
    });

    it('should destroy old sessions for same child (single-session policy)', async () => {
      const oldSessionData = JSON.stringify({
        sessionId: 'sess_old123',
        childId: 'child1',
      });
      redis.keys.mockResolvedValue(['session:child1:sess_old123']);
      redis.get.mockResolvedValueOnce(oldSessionData); // get old session data
      redis.del.mockResolvedValue(1);
      redis.set.mockResolvedValue('OK');

      const result = await authManager.createSession({
        childId: 'child1',
        parentId: 'parent1',
        accessToken: 'new-at',
        refreshToken: 'new-rt',
      });

      expect(result.sessionId).toMatch(/^sess_/);
      // Old session key should be deleted
      expect(redis.del).toHaveBeenCalledWith('session:child1:sess_old123');
    });

    it('should set refreshAvailable=false when Redis fails on refresh set', async () => {
      redis.keys.mockResolvedValue([]);
      // First set (session) succeeds, second set (refresh) fails
      redis.set
        .mockResolvedValueOnce('OK')
        .mockRejectedValueOnce(new Error('Redis down'));

      const result = await authManager.createSession({
        childId: 'child1',
        parentId: 'parent1',
        accessToken: 'at',
        refreshToken: 'rt',
      });

      expect(result.sessionId).toMatch(/^sess_/);
      expect(result.refreshAvailable).toBe(false);
    });

    it('should still create session when Redis keys scan fails', async () => {
      redis.keys.mockRejectedValue(new Error('Redis scan down'));
      redis.set.mockResolvedValue('OK');

      const result = await authManager.createSession({
        childId: 'child1',
        parentId: 'parent1',
        accessToken: 'at',
        refreshToken: 'rt',
      });

      expect(result.sessionId).toMatch(/^sess_/);
    });
  });

  // ── loginWithPassword ────────────────────────────────────────────────────

  describe('loginWithPassword', () => {
    const childWithPassword = {
      _id: 'child1',
      parentId: 'parent1',
      firstName: 'João',
      isActive: true,
      onboardingCompleted: true,
      password: '$2a$10$hashedpassword',
    };

    it('should return tokens + sessionId on valid credentials', async () => {
      authDao.findChildByIdWithPassword.mockResolvedValue(childWithPassword);
      bcrypt.compare.mockResolvedValue(true);
      // jwt.sign calls: accessToken (no sid), refreshToken, accessToken (with sid)
      jwt.sign
        .mockReturnValueOnce('access-no-sid')
        .mockReturnValueOnce('refresh-token')
        .mockReturnValueOnce('access-with-sid');
      redis.keys.mockResolvedValue([]);
      redis.set.mockResolvedValue('OK');

      const result = await authManager.loginWithPassword({
        childId: 'child1',
        password: 'mypassword',
        ip: '127.0.0.1',
        deviceHint: 'ContopiaApp',
      });

      expect(result).toMatchObject({
        accessToken: 'access-with-sid',
        refreshToken: 'refresh-token',
        childId: 'child1',
        childFirstName: 'João',
        isOnboardingComplete: true,
        method: 'password',
      });
      expect(result.sessionId).toMatch(/^sess_/);
      // Login attempts reset on success
      expect(redis.del).toHaveBeenCalledWith('loginAttempts:127.0.0.1');
    });

    it('should throw NOT_FOUND when child not found', async () => {
      authDao.findChildByIdWithPassword.mockResolvedValue(null);

      await expect(
        authManager.loginWithPassword({ childId: 'missing', password: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should throw NOT_VERIFIED when child inactive', async () => {
      authDao.findChildByIdWithPassword.mockResolvedValue({
        ...childWithPassword,
        isActive: false,
      });

      await expect(
        authManager.loginWithPassword({ childId: 'child1', password: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_VERIFIED', status: 403 });
    });

    it('should throw INVALID_CREDENTIALS when password not set', async () => {
      authDao.findChildByIdWithPassword.mockResolvedValue({
        ...childWithPassword,
        password: null,
      });

      await expect(
        authManager.loginWithPassword({ childId: 'child1', password: 'x' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    });

    it('should throw INVALID_CREDENTIALS when password mismatch', async () => {
      authDao.findChildByIdWithPassword.mockResolvedValue(childWithPassword);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authManager.loginWithPassword({ childId: 'child1', password: 'wrong' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    });

    it('should enforce single-session: new login revokes old session', async () => {
      const oldSessionData = JSON.stringify({
        sessionId: 'sess_old999',
        childId: 'child1',
      });
      authDao.findChildByIdWithPassword.mockResolvedValue(childWithPassword);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce('at1')
        .mockReturnValueOnce('rt1')
        .mockReturnValueOnce('at2');
      // First call to keys (createSession scan for old sessions)
      redis.keys.mockResolvedValue(['session:child1:sess_old999']);
      redis.get.mockResolvedValueOnce(oldSessionData);
      redis.del.mockResolvedValue(1);
      redis.set.mockResolvedValue('OK');

      const result = await authManager.loginWithPassword({
        childId: 'child1',
        password: 'pass',
        ip: '10.0.0.1',
      });

      expect(result.sessionId).toMatch(/^sess_/);
      // Old session key deleted
      expect(redis.del).toHaveBeenCalledWith('session:child1:sess_old999');
      // Login attempts reset
      expect(redis.del).toHaveBeenCalledWith('loginAttempts:10.0.0.1');
    });
  });

  // ── loginWithMagicLink ───────────────────────────────────────────────────

  describe('loginWithMagicLink', () => {
    it('should return magicLinkSent:true and parentEmail', async () => {
      authDao.findParentByEmail.mockResolvedValue({
        _id: 'p1',
        isVerified: true,
      });
      authDao.findActiveChildByParentAndName.mockResolvedValue({
        _id: 'c1',
        firstName: 'João',
      });

      const result = await authManager.loginWithMagicLink({
        parentEmail: 'p@ex.com',
        childFirstName: 'João',
      });

      expect(result).toEqual({ magicLinkSent: true, parentEmail: 'p@ex.com' });
    });

    it('should throw NOT_FOUND when parent not found or not verified', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);

      await expect(
        authManager.loginWithMagicLink({ parentEmail: 'nx@ex.com', childFirstName: 'João' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should throw NOT_FOUND when parent found but not verified', async () => {
      authDao.findParentByEmail.mockResolvedValue({ _id: 'p1', isVerified: false });

      await expect(
        authManager.loginWithMagicLink({ parentEmail: 'p@ex.com', childFirstName: 'João' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should throw NOT_FOUND when child not found for parent+name', async () => {
      authDao.findParentByEmail.mockResolvedValue({ _id: 'p1', isVerified: true });
      authDao.findActiveChildByParentAndName.mockResolvedValue(null);

      await expect(
        authManager.loginWithMagicLink({ parentEmail: 'p@ex.com', childFirstName: 'Unknown' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should blacklist tokens, delete session, and return loggedOut:true', async () => {
      redis.set.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);
      // jwt.decode for access token
      jwt.decode.mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 1800 });
      // jwt.decode for refresh token
      jwt.decode.mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 604800 });

      const result = await authManager.logout({
        childId: 'child1',
        sessionId: 'sess_abc123',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        ip: '127.0.0.1',
        deviceHint: 'ContopiaApp',
      });

      expect(result).toEqual({ loggedOut: true });

      // Access token blacklisted
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^bl:/),
        '1',
        'EX',
        expect.any(Number),
      );

      // Session deleted
      expect(redis.del).toHaveBeenCalledWith('session:child1:sess_abc123');

      // Refresh hash deleted
      expect(redis.del).toHaveBeenCalledWith('refresh:child1');
    });

    it('should blacklist tokens with session TTL fallback when jwt.decode fails', async () => {
      redis.set.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);
      jwt.decode.mockReturnValue(null); // malformed token

      await authManager.logout({
        childId: 'child1',
        sessionId: 'sess_fallback',
        accessToken: 'bad-token',
        refreshToken: 'bad-refresh',
      });

      // Check that blacklistToken was called with SESSION_TTL_SECONDS fallback
      const blCalls = redis.set.mock.calls.filter((c) => c[0].startsWith('bl:'));
      // At least 2 blacklist sets (access + refresh)
      expect(blCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should succeed even when Redis del fails (non-blocking)', async () => {
      redis.set.mockResolvedValue('OK');
      redis.del.mockRejectedValue(new Error('Redis down'));
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1800 });

      const result = await authManager.logout({
        childId: 'child1',
        sessionId: 'sess_redisdown',
        accessToken: 'at',
        refreshToken: null,
      });

      expect(result).toEqual({ loggedOut: true });
    });

    it('should handle missing accessToken gracefully', async () => {
      redis.set.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);

      const result = await authManager.logout({
        childId: 'child1',
        sessionId: 'sess_noat',
        accessToken: null,
        refreshToken: null,
      });

      expect(result).toEqual({ loggedOut: true });
    });
  });

  // ── refreshSession ────────────────────────────────────────────────────────

  describe('refreshSession', () => {
    it('should rotate tokens and return new access+refresh', async () => {
      jwt.verify.mockReturnValue({ sub: 'child1', type: 'refresh' });
      redis.exists.mockResolvedValue(0); // not blacklisted
      redis.get.mockResolvedValueOnce('mocked-hash-value'); // stored refresh hash matches
      authDao.findChildById.mockResolvedValue({
        _id: 'child1',
        parentId: 'parent1',
        firstName: 'João',
      });
      // Session lookup
      redis.keys.mockResolvedValue(['session:child1:sess_abc123']);
      redis.get.mockResolvedValueOnce(JSON.stringify({
        sessionId: 'sess_abc123',
        childId: 'child1',
        lastActivity: new Date().toISOString(),
      }));
      redis.set.mockResolvedValue('OK');
      redis.expire.mockResolvedValue(1);
      // New tokens
      jwt.sign
        .mockReturnValueOnce('new-access')
        .mockReturnValueOnce('new-refresh');
      // jwt.decode for old refresh token blacklist
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 60000 });

      const result = await authManager.refreshSession({
        refreshToken: 'valid-rt',
        ip: '127.0.0.1',
      });

      expect(result).toMatchObject({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        childId: 'child1',
        childFirstName: 'João',
      });

      // Old refresh token should be blacklisted
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^bl:/),
        '1',
        'EX',
        expect.any(Number),
      );

      // New refresh hash stored
      const refreshSetCall = redis.set.mock.calls.find(
        (c) => c[0] === 'refresh:child1',
      );
      expect(refreshSetCall).toBeDefined();
    });

    it('should throw INVALID_REFRESH_TOKEN when JWT verify fails', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(
        authManager.refreshSession({ refreshToken: 'bad-rt' }),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', status: 401 });
    });

    it('should throw INVALID_REFRESH_TOKEN when token type is not refresh', async () => {
      jwt.verify.mockReturnValue({ sub: 'child1', type: 'access' });

      await expect(
        authManager.refreshSession({ refreshToken: 'not-refresh' }),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', status: 401 });
    });

    it('should throw TOKEN_REVOKED when token is blacklisted', async () => {
      jwt.verify.mockReturnValue({ sub: 'child1', type: 'refresh' });
      redis.exists.mockResolvedValue(1); // blacklisted

      await expect(
        authManager.refreshSession({ refreshToken: 'revoked-rt' }),
      ).rejects.toMatchObject({ code: 'TOKEN_REVOKED', status: 401 });
    });

    it('should throw INVALID_REFRESH_TOKEN when stored hash does not match', async () => {
      jwt.verify.mockReturnValue({ sub: 'child1', type: 'refresh' });
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue('different-hash'); // mismatch

      await expect(
        authManager.refreshSession({ refreshToken: 'tampered-rt' }),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', status: 401 });
    });

    it('should throw NOT_FOUND when child deleted between sessions', async () => {
      jwt.verify.mockReturnValue({ sub: 'child1', type: 'refresh' });
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue('mocked-hash-value'); // hash matches
      authDao.findChildById.mockResolvedValue(null);

      await expect(
        authManager.refreshSession({ refreshToken: 'valid-rt' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should succeed even when Redis is unavailable for session lookup', async () => {
      jwt.verify.mockReturnValue({ sub: 'child1', type: 'refresh' });
      redis.exists.mockResolvedValue(0);
      // First get: refresh hash check
      redis.get.mockResolvedValueOnce('mocked-hash-value');
      authDao.findChildById.mockResolvedValue({
        _id: 'child1',
        parentId: 'parent1',
        firstName: 'Ana',
      });
      // Session lookup fails
      redis.keys.mockRejectedValue(new Error('Redis down'));
      // New refresh hash store fails too
      redis.set.mockRejectedValue(new Error('Redis down'));
      jwt.sign
        .mockReturnValueOnce('new-access')
        .mockReturnValueOnce('new-refresh');
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 60000 });

      const result = await authManager.refreshSession({
        refreshToken: 'valid-rt',
      });

      expect(result.accessToken).toBe('new-access');
      expect(result.childFirstName).toBe('Ana');
    });
  });

  // ── getCurrentUser ───────────────────────────────────────────────────────

  describe('getCurrentUser', () => {
    it('should return child info + session metadata', async () => {
      authDao.findChildById.mockResolvedValue({
        _id: 'child1',
        firstName: 'João',
        onboardingCompleted: true,
      });
      redis.keys.mockResolvedValue(['session:child1:sess_abc123']);
      redis.get.mockResolvedValue(JSON.stringify({
        sessionId: 'sess_abc123',
        childId: 'child1',
        createdAt: '2025-06-01T10:00:00Z',
        lastActivity: '2025-06-01T10:25:00Z',
      }));

      const result = await authManager.getCurrentUser('child1');

      expect(result).toEqual({
        childId: 'child1',
        childFirstName: 'João',
        isOnboardingComplete: true,
        sessionCreatedAt: '2025-06-01T10:00:00Z',
        lastActivity: '2025-06-01T10:25:00Z',
      });
    });

    it('should return null session metadata when no session found', async () => {
      authDao.findChildById.mockResolvedValue({
        _id: 'child1',
        firstName: 'João',
        onboardingCompleted: false,
      });
      redis.keys.mockResolvedValue([]);

      const result = await authManager.getCurrentUser('child1');

      expect(result).toMatchObject({
        childId: 'child1',
        childFirstName: 'João',
        isOnboardingComplete: false,
        sessionCreatedAt: null,
        lastActivity: null,
      });
    });

    it('should throw NOT_FOUND when child not found', async () => {
      authDao.findChildById.mockResolvedValue(null);

      await expect(
        authManager.getCurrentUser('missing'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('should return null session metadata when Redis fails', async () => {
      authDao.findChildById.mockResolvedValue({
        _id: 'child1',
        firstName: 'Ana',
        onboardingCompleted: false,
      });
      redis.keys.mockRejectedValue(new Error('Redis down'));

      const result = await authManager.getCurrentUser('child1');

      expect(result.sessionCreatedAt).toBeNull();
      expect(result.lastActivity).toBeNull();
    });
  });

  // ── blacklistToken ───────────────────────────────────────────────────────

  describe('blacklistToken', () => {
    it('should store token hash in Redis with TTL', async () => {
      redis.set.mockResolvedValue('OK');

      await authManager.blacklistToken('some-jwt', 1800);

      expect(redis.set).toHaveBeenCalledWith(
        'bl:mocked-hash-value',
        '1',
        'EX',
        1800,
      );
    });

    it('should use minimum TTL of 1 second', async () => {
      redis.set.mockResolvedValue('OK');

      await authManager.blacklistToken('some-jwt', 0);

      expect(redis.set).toHaveBeenCalledWith(
        'bl:mocked-hash-value',
        '1',
        'EX',
        1,
      );
    });

    it('should not throw when Redis fails', async () => {
      redis.set.mockRejectedValue(new Error('Redis down'));

      await expect(
        authManager.blacklistToken('some-jwt', 1800),
      ).resolves.toBeUndefined();
    });
  });
});