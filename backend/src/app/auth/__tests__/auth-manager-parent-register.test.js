// Contopia — Auth Manager: registerParent Tests (STORY-057)
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
  createParent: vi.fn(),
  findChildrenByParentId: vi.fn(),
  updateParentLastLogin: vi.fn(),
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
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

import * as authManager from '../auth-manager.js';
import * as authDao from '../auth-dao.js';
import redis from '../../../config/redis.js';

describe('Auth Manager — registerParent (STORY-057)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    email: 'parent@example.com',
    password: 'StrongPass1',
    ageConsent: true,
    ip: '127.0.0.1',
    deviceHint: 'ContopiaApp/1.0',
  };

  const mockParent = {
    _id: 'parent123',
    email: 'parent@example.com',
  };

  const mockChildren = [
    { _id: 'child1', firstName: 'João', avatarSeed: 'abc123' },
  ];

  // ── Happy Path ───────────────────────────────────────────────────────────

  it('should register a new parent, auto-login, and return tokens + parent info', async () => {
    authDao.findParentByEmail.mockResolvedValue(null);
    authDao.createParent.mockResolvedValue(mockParent);
    authDao.findChildrenByParentId.mockResolvedValue(mockChildren);
    authDao.updateParentLastLogin.mockResolvedValue({ ...mockParent, lastLogin: new Date() });
    // jwt.sign: generateParentAccessToken, generateParentRefreshToken
    jwt.sign
      .mockReturnValueOnce('parent-access-token')
      .mockReturnValueOnce('parent-refresh-token');
    redis.set.mockResolvedValue('OK');

    const result = await authManager.registerParent(validInput);

    // Verify parent was created
    expect(authDao.findParentByEmail).toHaveBeenCalledWith('parent@example.com');
    expect(authDao.createParent).toHaveBeenCalledWith({ email: 'parent@example.com', password: 'StrongPass1', ageConsentAt: expect.any(Date) });

    // Verify tokens generated
    expect(jwt.sign).toHaveBeenCalledTimes(2);
    expect(result.accessToken).toBe('parent-access-token');
    expect(result.refreshToken).toBe('parent-refresh-token');

    // Verify parent info returned
    expect(result.parentId).toBe('parent123');
    expect(result.email).toBe('parent@example.com');
    expect(result.children).toEqual([
      { childId: 'child1', firstName: 'João', avatarSeed: 'abc123' },
    ]);
    expect(result.sessionId).toMatch(/^psess_/);
    expect(result.refreshAvailable).toBe(true);
  });

  it('should return empty children array for new parent with no children', async () => {
    authDao.findParentByEmail.mockResolvedValue(null);
    authDao.createParent.mockResolvedValue(mockParent);
    authDao.findChildrenByParentId.mockResolvedValue([]);
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    redis.set.mockResolvedValue('OK');

    const result = await authManager.registerParent(validInput);

    expect(result.children).toEqual([]);
    expect(authDao.findChildrenByParentId).toHaveBeenCalledWith('parent123');
  });

  it('should set refreshAvailable=false when Redis fails on refresh set', async () => {
    authDao.findParentByEmail.mockResolvedValue(null);
    authDao.createParent.mockResolvedValue(mockParent);
    authDao.findChildrenByParentId.mockResolvedValue([]);
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    // Session set succeeds, refresh set fails
    redis.set
      .mockResolvedValueOnce('OK')
      .mockRejectedValueOnce(new Error('Redis down'));

    const result = await authManager.registerParent(validInput);

    expect(result.refreshAvailable).toBe(false);
    expect(result.sessionId).toMatch(/^psess_/);
  });

  it('should still succeed when Redis is completely unavailable', async () => {
    authDao.findParentByEmail.mockResolvedValue(null);
    authDao.createParent.mockResolvedValue(mockParent);
    authDao.findChildrenByParentId.mockResolvedValue([]);
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    redis.set.mockRejectedValue(new Error('Redis down'));

    const result = await authManager.registerParent(validInput);

    expect(result.accessToken).toBe('access-token');
    expect(result.parentId).toBe('parent123');
    expect(result.refreshAvailable).toBe(false);
  });

  it('should call updateParentLastLogin as best-effort (non-blocking)', async () => {
    authDao.findParentByEmail.mockResolvedValue(null);
    authDao.createParent.mockResolvedValue(mockParent);
    authDao.findChildrenByParentId.mockResolvedValue([]);
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    redis.set.mockResolvedValue('OK');

    await authManager.registerParent(validInput);

    expect(authDao.updateParentLastLogin).toHaveBeenCalledWith('parent123');
  });

  it('should not throw when updateParentLastLogin fails (best-effort)', async () => {
    authDao.findParentByEmail.mockResolvedValue(null);
    authDao.createParent.mockResolvedValue(mockParent);
    authDao.findChildrenByParentId.mockResolvedValue([]);
    authDao.updateParentLastLogin.mockRejectedValue(new Error('DB down'));
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
    redis.set.mockResolvedValue('OK');

    const result = await authManager.registerParent(validInput);

    expect(result.parentId).toBe('parent123');
  });

  // ── Negative: Duplicate Email ───────────────────────────────────────────

  it('should throw ACCOUNT_EXISTS when email is already registered', async () => {
    authDao.findParentByEmail.mockResolvedValue({ _id: 'existing', email: 'parent@example.com' });

    await expect(
      authManager.registerParent(validInput)
    ).rejects.toMatchObject({
      code: 'ACCOUNT_EXISTS',
      status: 409,
      message: 'An account with this email already exists',
    });

    expect(authDao.createParent).not.toHaveBeenCalled();
  });

  // ── Negative: Missing Fields ─────────────────────────────────────────────

  it('should throw when email is missing (handled by validation layer, but manager should still fail gracefully)', async () => {
    // The manager itself doesn't validate — it delegates to the DAO.
    // If DAO throws, the error propagates.
    authDao.findParentByEmail.mockResolvedValue(null);
    authDao.createParent.mockRejectedValue(new Error('Email is required'));

    await expect(
      authManager.registerParent({ ...validInput, email: undefined })
    ).rejects.toThrow('Email is required');
  });

  // ── Token Generation Verification ────────────────────────────────────────

  it('should generate parent access token with correct claims', () => {
    jwt.sign.mockReturnValue('parent-access');

    const token = authManager.generateParentAccessToken('parent123');

    expect(token).toBe('parent-access');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'parent123', role: 'parent', type: 'access' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '30m' }
    );
  });

  it('should generate parent refresh token with correct claims', () => {
    jwt.sign.mockReturnValue('parent-refresh');

    const token = authManager.generateParentRefreshToken('parent123');

    expect(token).toBe('parent-refresh');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'parent123', role: 'parent', type: 'parent_refresh' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );
  });

  // ── createParentSession ──────────────────────────────────────────────────

  describe('createParentSession', () => {
    it('should create parent session in Redis and return sessionId', async () => {
      redis.set.mockResolvedValue('OK');

      const result = await authManager.createParentSession({
        parentId: 'parent123',
        refreshToken: 'refresh-token',
        ip: '127.0.0.1',
        deviceHint: 'ContopiaApp',
      });

      expect(result.sessionId).toMatch(/^psess_/);
      expect(result.refreshAvailable).toBe(true);

      // Verify parent session stored with TTL
      const sessionCall = redis.set.mock.calls.find(
        (c) => c[0].startsWith('parentSession:parent123:psess_'),
      );
      expect(sessionCall).toBeDefined();
      expect(sessionCall[2]).toBe('EX');
      expect(sessionCall[3]).toBe(1800); // PARENT_SESSION_TTL_SECONDS

      // Verify parent refresh hash stored
      const refreshCall = redis.set.mock.calls.find(
        (c) => c[0] === 'parentRefresh:parent123',
      );
      expect(refreshCall).toBeDefined();
      expect(refreshCall[2]).toBe('EX');
      expect(refreshCall[3]).toBe(604800); // PARENT_REFRESH_TTL_SECONDS
    });

    it('should set refreshAvailable=false when Redis fails on refresh set', async () => {
      redis.set
        .mockResolvedValueOnce('OK')
        .mockRejectedValueOnce(new Error('Redis down'));

      const result = await authManager.createParentSession({
        parentId: 'parent123',
        refreshToken: 'rt',
      });

      expect(result.sessionId).toMatch(/^psess_/);
      expect(result.refreshAvailable).toBe(false);
    });

    it('should still return sessionId when Redis is down for session set', async () => {
      redis.set.mockRejectedValue(new Error('Redis down'));

      const result = await authManager.createParentSession({
        parentId: 'parent123',
        refreshToken: 'rt',
      });

      expect(result.sessionId).toMatch(/^psess_/);
      expect(result.refreshAvailable).toBe(false);
    });
  });

  // ── validateParentSession ────────────────────────────────────────────────

  describe('validateParentSession', () => {
    it('should return session data when session exists and extend TTL', async () => {
      const sessionData = {
        sessionId: 'psess_abc123',
        parentId: 'parent123',
        createdAt: '2025-06-01T10:00:00Z',
        lastActivity: '2025-06-01T10:25:00Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(sessionData));
      redis.expire.mockResolvedValue(true);
      redis.set.mockResolvedValue('OK');

      const result = await authManager.validateParentSession({
        parentId: 'parent123',
        sessionId: 'psess_abc123',
      });

      expect(result).toMatchObject({
        sessionId: 'psess_abc123',
        parentId: 'parent123',
      });
      expect(result.lastActivity).toBeDefined();
      expect(redis.expire).toHaveBeenCalledWith(
        'parentSession:parent123:psess_abc123',
        1800,
      );
    });

    it('should return null when session does not exist', async () => {
      redis.get.mockResolvedValue(null);

      const result = await authManager.validateParentSession({
        parentId: 'parent123',
        sessionId: 'psess_nonexistent',
      });

      expect(result).toBeNull();
    });

    it('should return null when Redis is unavailable', async () => {
      redis.get.mockRejectedValue(new Error('Redis down'));

      const result = await authManager.validateParentSession({
        parentId: 'parent123',
        sessionId: 'psess_abc',
      });

      expect(result).toBeNull();
    });
  });

  // ── incrementLoginAttemptsParent / resetLoginAttemptsParent ──────────────

  describe('incrementLoginAttemptsParent', () => {
    it('should increment and set 15min TTL on first attempt', async () => {
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(true);

      const count = await authManager.incrementLoginAttemptsParent('10.0.0.1');

      expect(count).toBe(1);
      expect(redis.incr).toHaveBeenCalledWith('loginAttemptsParent:10.0.0.1');
      expect(redis.expire).toHaveBeenCalledWith('loginAttemptsParent:10.0.0.1', 900);
    });

    it('should return 0 when Redis is unavailable', async () => {
      redis.incr.mockRejectedValue(new Error('Redis down'));

      const count = await authManager.incrementLoginAttemptsParent('10.0.0.1');

      expect(count).toBe(0);
    });
  });

  describe('resetLoginAttemptsParent', () => {
    it('should delete the login attempts key', async () => {
      redis.del.mockResolvedValue(1);

      await authManager.resetLoginAttemptsParent('10.0.0.1');

      expect(redis.del).toHaveBeenCalledWith('loginAttemptsParent:10.0.0.1');
    });

    it('should not throw when Redis is unavailable', async () => {
      redis.del.mockRejectedValue(new Error('Redis down'));

      await expect(
        authManager.resetLoginAttemptsParent('10.0.0.1')
      ).resolves.toBeUndefined();
    });
  });
});
