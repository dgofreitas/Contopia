// Contopia — Auth Manager: parentLogin, parentLogout, parentRefreshSession, logSessionExpired Tests (STORY-060)
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
  findParentById: vi.fn(),
  findParentByIdWithPassword: vi.fn(),
  createParent: vi.fn(),
  findChildrenByParentId: vi.fn(),
  updateParentLastLogin: vi.fn(),
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
  hashIdentifier: vi.fn((v) => `hashed:${v}`),
}));
vi.mock('../../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(),
    incr: vi.fn(), expire: vi.fn(), keys: vi.fn(), call: vi.fn(),
    scanIterator: vi.fn(() => (async function* () {})()),
    status: 'ready', on: vi.fn(),
  },
}));
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
  compare: vi.fn(),
}));

import * as authManager from '../auth-manager.js';
import * as authDao from '../auth-dao.js';
import redis from '../../../config/redis.js';
import bcrypt from 'bcryptjs';

describe('Auth Manager — Parent Auth (STORY-060)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── parentLogin ──────────────────────────────────────────────────────────

  describe('parentLogin', () => {
    const validParent = {
      _id: 'parent123',
      email: 'parent@example.com',
      password: '$2a$10$hashedpassword',
    };

    it('should login parent successfully and create session', async () => {
      authDao.findParentByEmail.mockResolvedValue(validParent);
      authDao.findParentByIdWithPassword.mockResolvedValue(validParent);
      bcrypt.compare.mockResolvedValue(true);
      authDao.findChildrenByParentId.mockResolvedValue([
        { _id: 'c1', firstName: 'Julia', avatarSeed: 'seed1' },
      ]);
      authDao.updateParentLastLogin.mockResolvedValue(validParent);
      jwt.sign
        .mockReturnValueOnce('parent-access-token')
        .mockReturnValueOnce('parent-refresh-token');
      redis.set.mockResolvedValue('OK');

      const result = await authManager.parentLogin({
        email: 'parent@example.com',
        password: 'StrongPass1',
        ip: '127.0.0.1',
        deviceHint: 'Mozilla/5.0',
      });

      expect(result).toMatchObject({
        accessToken: 'parent-access-token',
        refreshToken: 'parent-refresh-token',
        parentId: 'parent123',
        email: 'parent@example.com',
        refreshAvailable: true,
      });
      expect(result.sessionId).toMatch(/^psess_/);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].firstName).toBe('Julia');
      // Verify audit log was created
      expect(authDao.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'PARENT_SESSION_CREATED' })
      );
    });

    it('should throw INVALID_CREDENTIALS when parent not found', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);

      await expect(
        authManager.parentLogin({ email: 'none@example.com', password: 'x' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });

      // Verify LOGIN_FAILED audit was logged
      expect(authDao.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'LOGIN_FAILED' })
      );
    });

    it('should throw INVALID_CREDENTIALS when password not set', async () => {
      authDao.findParentByEmail.mockResolvedValue(validParent);
      authDao.findParentByIdWithPassword.mockResolvedValue({ ...validParent, password: null });

      await expect(
        authManager.parentLogin({ email: 'parent@example.com', password: 'x' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });

      expect(authDao.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'LOGIN_FAILED' })
      );
    });

    it('should throw INVALID_CREDENTIALS when password does not match', async () => {
      authDao.findParentByEmail.mockResolvedValue(validParent);
      authDao.findParentByIdWithPassword.mockResolvedValue(validParent);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authManager.parentLogin({ email: 'parent@example.com', password: 'wrong' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });

      expect(authDao.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'LOGIN_FAILED' })
      );
    });

    it('should reset login attempts on success', async () => {
      authDao.findParentByEmail.mockResolvedValue(validParent);
      authDao.findParentByIdWithPassword.mockResolvedValue(validParent);
      bcrypt.compare.mockResolvedValue(true);
      authDao.findChildrenByParentId.mockResolvedValue([]);
      jwt.sign
        .mockReturnValueOnce('access')
        .mockReturnValueOnce('refresh');
      redis.set.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);

      await authManager.parentLogin({
        email: 'parent@example.com',
        password: 'StrongPass1',
        ip: '10.0.0.1',
      });

      expect(redis.del).toHaveBeenCalledWith('loginAttemptsParent:10.0.0.1');
    });
  });

  // ── parentLogout ─────────────────────────────────────────────────────────

  describe('parentLogout', () => {
    it('should blacklist tokens, delete session, and log SESSION_LOGOUT', async () => {
      jwt.decode
        .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 600 }) // access token
        .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 86400 }); // refresh token
      redis.set.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);

      const result = await authManager.parentLogout({
        parentId: 'parent123',
        sessionId: 'psess_abc',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        ip: '127.0.0.1',
        deviceHint: 'Mozilla/5.0',
      });

      expect(result).toEqual({ loggedOut: true });

      // Verify tokens blacklisted (hashToken returns 'mocked-hash-value' via crypto mock)
      expect(redis.set).toHaveBeenCalledWith(
        'bl:mocked-hash-value', '1', 'EX', expect.any(Number)
      );
      expect(redis.set).toHaveBeenCalledWith(
        'bl:mocked-hash-value', '1', 'EX', expect.any(Number)
      );

      // Verify session deleted
      expect(redis.del).toHaveBeenCalledWith('parentSession:parent123:psess_abc');
      expect(redis.del).toHaveBeenCalledWith('parentRefresh:parent123');

      // Verify audit logs
      expect(authDao.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'PARENT_LOGOUT' })
      );
      expect(authDao.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'SESSION_LOGOUT' })
      );
    });

    it('should handle missing tokens gracefully', async () => {
      redis.del.mockResolvedValue(1);

      const result = await authManager.parentLogout({
        parentId: 'parent123',
        sessionId: 'psess_abc',
        accessToken: null,
        refreshToken: null,
      });

      expect(result).toEqual({ loggedOut: true });
      expect(redis.del).toHaveBeenCalledWith('parentSession:parent123:psess_abc');
    });

    it('should not throw when Redis is unavailable', async () => {
      redis.set.mockRejectedValue(new Error('Redis down'));
      redis.del.mockRejectedValue(new Error('Redis down'));

      await expect(
        authManager.parentLogout({
          parentId: 'parent123',
          sessionId: 'psess_abc',
          accessToken: 'token',
          refreshToken: 'refresh',
        })
      ).resolves.toEqual({ loggedOut: true });
    });
  });

  // ── parentRefreshSession ──────────────────────────────────────────────────

  describe('parentRefreshSession', () => {
    const validDecoded = {
      sub: 'parent123',
      role: 'parent',
      type: 'parent_refresh',
    };

    it('should refresh session and rotate tokens', async () => {
      jwt.verify.mockReturnValue(validDecoded);
      jwt.decode
        .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 86400 }) // old refresh
        .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 86400 }); // new refresh
      redis.get.mockResolvedValue('mocked-hash-value');
      redis.exists.mockResolvedValue(0);
      redis.set.mockResolvedValue('OK');
      redis.expire.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authManager.parentRefreshSession({
        refreshToken: 'old-refresh-token',
        ip: '127.0.0.1',
        deviceHint: 'Mozilla/5.0',
      });

      expect(result).toMatchObject({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        parentId: 'parent123',
      });

      // Verify new refresh hash stored (first set call)
      expect(redis.set).toHaveBeenCalledWith(
        'parentRefresh:parent123', 'mocked-hash-value', 'EX', 604800
      );

      // Verify old refresh token blacklisted (hashToken returns 'mocked-hash-value')
      expect(redis.set).toHaveBeenCalledWith(
        'bl:mocked-hash-value', '1', 'EX', expect.any(Number)
      );

      // Verify audit log
      expect(authDao.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'SESSION_REFRESHED' })
      );
    });

    it('should throw INVALID_REFRESH_TOKEN when JWT verification fails', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(
        authManager.parentRefreshSession({ refreshToken: 'bad-token' })
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', status: 401 });
    });

    it('should throw INVALID_REFRESH_TOKEN when token type is wrong', async () => {
      jwt.verify.mockReturnValue({ sub: 'p1', type: 'access', role: 'parent' });

      await expect(
        authManager.parentRefreshSession({ refreshToken: 'wrong-type' })
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', status: 401 });
    });

    it('should throw TOKEN_REVOKED when refresh token is blacklisted', async () => {
      jwt.verify.mockReturnValue(validDecoded);
      redis.exists.mockResolvedValue(1);

      await expect(
        authManager.parentRefreshSession({ refreshToken: 'blacklisted' })
      ).rejects.toMatchObject({ code: 'TOKEN_REVOKED', status: 401 });
    });

    it('should throw INVALID_REFRESH_TOKEN when stored hash does not match', async () => {
      jwt.verify.mockReturnValue(validDecoded);
      redis.exists.mockResolvedValue(0);
      redis.get.mockResolvedValue('different-hash');

      await expect(
        authManager.parentRefreshSession({ refreshToken: 'mismatch' })
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', status: 401 });
    });
  });

  // ── logSessionExpired ────────────────────────────────────────────────────

  describe('logSessionExpired', () => {
    it('should log SESSION_EXPIRED audit event with reason idle_timeout', () => {
      authManager.logSessionExpired('parent123', 'psess_abc', '127.0.0.1', 'Mozilla/5.0');

      expect(authDao.createAuditLog).toHaveBeenCalledWith({
        parentId: 'parent123',
        sessionId: 'psess_abc',
        event: 'SESSION_EXPIRED',
        ip: '127.0.0.1',
        deviceHint: 'Mozilla/5.0',
        reason: 'idle_timeout',
      });
    });

    it('should not throw when called', () => {
      expect(() => {
        authManager.logSessionExpired('p1', 's1');
      }).not.toThrow();
    });
  });
});
