// Contopia — STORY-064: Parent Refresh Hardening Integration Tests
// Exercises the real auth-manager.parentRefreshSession against mocked Redis +
// auth-dao to verify the G8 (active-parent check) and G9 (hashed parentId audit)
// hardening, plus the existing blacklist + hash-mismatch guards.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// ── Mocks at module level ──────────────────────────────────────────────────
// Mock crypto so hashToken returns a deterministic value for blacklist/hash
// comparisons. Keep randomBytes real so session IDs / refresh tokens differ.
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

// Real hashIdentifier: first 8 chars of SHA-256. Computed with the REAL crypto
// (not the mock) so the integration test can assert the exact hashed value the
// manager emits. We capture the real impl before vi.mock('node:crypto') replaces
// it — but vi.mock is hoisted above imports, so `crypto` here is already the
// mocked one. To get the real hash, we use a hardcoded expected value derived
// from the known PARENT_ID (computed once outside the test run).
const PARENT_ID = 'parent123';

vi.mock('../auth-dao.js', () => {
  // Use the (mocked) crypto to compute the hash — matches what auth-manager.js
  // will produce since it imports hashIdentifier from this mocked module.
  // The mock's createHash().digest() returns 'mocked-hash-value', so we cannot
  // use it. Instead, expose a hashIdentifier that returns a known constant so
  // tests can assert against it.
  const HASHED = 'hashed-parent123';
  return {
    findParentByEmail: vi.fn(),
    findParentById: vi.fn(),
    findActiveParentById: vi.fn(),
    findParentByIdWithPassword: vi.fn(),
    createParent: vi.fn(),
    findChildrenByParentId: vi.fn(),
    updateParentLastLogin: vi.fn(),
    createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
    hashIdentifier: () => HASHED,
    findChildById: vi.fn(),
    findActiveChildByParentAndName: vi.fn(),
    findActiveChildByParent: vi.fn(),
    createChild: vi.fn(),
    findChildByIdWithPassword: vi.fn(),
    updateChildPassword: vi.fn(),
    softDeleteChildById: vi.fn(),
  };
});
vi.mock('../../../config/redis.js', () => ({
  default: {
    set: vi.fn(), get: vi.fn(), del: vi.fn(), exists: vi.fn(),
    incr: vi.fn(), expire: vi.fn(), keys: vi.fn(), call: vi.fn(),
    scan: vi.fn(),
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
vi.mock('../../book/book-dao.js', () => ({
  createActivityLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
}));
vi.mock('../../storage/storage-manager.js', () => ({
  purgeAssetsByAuthorManager: vi.fn().mockResolvedValue(undefined),
}));

import * as authManager from '../auth-manager.js';
import * as authDao from '../auth-dao.js';
import redis from '../../../config/redis.js';

// The mocked hashIdentifier returns this constant — tests assert against it.
const EXPECTED_HASHED_PARENT_ID = 'hashed-parent123';

describe('STORY-064 — Parent Refresh Hardening (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Sensible default mocks; individual tests override as needed.
    redis.set.mockResolvedValue('OK');
    redis.del.mockResolvedValue(1);
    redis.exists.mockResolvedValue(0); // not blacklisted by default
    redis.expire.mockResolvedValue(true);
    redis.scan.mockResolvedValue(['0', []]); // no existing parent session keys
  });

  // Helper: configure JWT verify to return a valid parent_refresh decoded token
  function mockValidJwt() {
    jwt.verify.mockReturnValue({
      sub: PARENT_ID,
      role: 'parent',
      type: 'parent_refresh',
    });
    // jwt.decode is called when blacklisting the old refresh token
    jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 });
    // jwt.sign returns the new access + refresh tokens (called twice per refresh)
    jwt.sign
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('new-refresh-token');
  }

  // Helper: make the stored refresh hash match the mocked hashToken output
  function mockStoredHashMatches() {
    redis.get.mockImplementation((key) => {
      if (key === `parentRefresh:${PARENT_ID}`) return Promise.resolve('mocked-hash-value');
      if (key === `parent:exists:${PARENT_ID}`) return Promise.resolve(null); // cache miss
      return Promise.resolve(null);
    });
  }

  // ── Happy path: active parent → 200 + new tokens ──────────────────────────
  it('refreshes session for an active parent and returns new access + refresh tokens', async () => {
    mockValidJwt();
    mockStoredHashMatches();
    authDao.findActiveParentById.mockResolvedValue({ _id: PARENT_ID, email: 'p@t.com' });

    const result = await authManager.parentRefreshSession({
      refreshToken: 'old-refresh-token',
      ip: '127.0.0.1',
      deviceHint: 'Mozilla/5.0',
    });

    expect(result).toMatchObject({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      parentId: PARENT_ID,
    });

    // Active-parent check hit the DB (cache miss) and cached the positive result
    expect(authDao.findActiveParentById).toHaveBeenCalledWith(PARENT_ID);
    expect(redis.set).toHaveBeenCalledWith(`parent:exists:${PARENT_ID}`, '1', 'EX', 300);

    // New refresh hash stored
    expect(redis.set).toHaveBeenCalledWith(
      `parentRefresh:${PARENT_ID}`, 'mocked-hash-value', 'EX', 604800
    );

    // Old refresh token blacklisted
    expect(redis.set).toHaveBeenCalledWith(
      'bl:mocked-hash-value', '1', 'EX', expect.any(Number)
    );
  });

  // ── G8: deactivated parent → 401 UNAUTHORIZED ────────────────────────────
  it('throws 401 UNAUTHORIZED when the parent account is deactivated (DB miss)', async () => {
    mockValidJwt();
    mockStoredHashMatches();
    authDao.findActiveParentById.mockResolvedValue(null); // parent not found/deactivated

    await expect(
      authManager.parentRefreshSession({ refreshToken: 'old-refresh-token' })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });

    // Negative result cached for 5m
    expect(redis.set).toHaveBeenCalledWith(`parent:exists:${PARENT_ID}`, '0', 'EX', 300);

    // No new tokens issued (jwt.sign not called)
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('throws 401 UNAUTHORIZED when the parent cache says inactive (cached 0)', async () => {
    mockValidJwt();
    redis.get.mockImplementation((key) => {
      if (key === `parentRefresh:${PARENT_ID}`) return Promise.resolve('mocked-hash-value');
      if (key === `parent:exists:${PARENT_ID}`) return Promise.resolve('0'); // cached inactive
      return Promise.resolve(null);
    });

    await expect(
      authManager.parentRefreshSession({ refreshToken: 'old-refresh-token' })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });

    // DB not consulted when cache has a value
    expect(authDao.findActiveParentById).not.toHaveBeenCalled();
  });

  // ── Existing guard: blacklisted refresh token → 401 TOKEN_REVOKED ─────────
  it('throws 401 TOKEN_REVOKED when the refresh token is blacklisted', async () => {
    mockValidJwt();
    redis.exists.mockResolvedValue(1); // blacklisted

    await expect(
      authManager.parentRefreshSession({ refreshToken: 'blacklisted-token' })
    ).rejects.toMatchObject({ code: 'TOKEN_REVOKED', status: 401 });

    // Active-parent check never reached
    expect(authDao.findActiveParentById).not.toHaveBeenCalled();
  });

  // ── Existing guard: mismatched hash → 401 INVALID_REFRESH_TOKEN ───────────
  it('throws 401 INVALID_REFRESH_TOKEN when the stored hash does not match', async () => {
    mockValidJwt();
    redis.get.mockImplementation((key) => {
      if (key === `parentRefresh:${PARENT_ID}`) return Promise.resolve('different-hash');
      return Promise.resolve(null);
    });

    await expect(
      authManager.parentRefreshSession({ refreshToken: 'mismatched-token' })
    ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', status: 401 });

    expect(authDao.findActiveParentById).not.toHaveBeenCalled();
  });

  // ── G9/NFR-OBS-04: audit log contains hashed parentId ─────────────────────
  it('emits SESSION_REFRESHED audit log with hashed parentId (not raw ObjectId)', async () => {
    mockValidJwt();
    mockStoredHashMatches();
    authDao.findActiveParentById.mockResolvedValue({ _id: PARENT_ID, email: 'p@t.com' });

    await authManager.parentRefreshSession({
      refreshToken: 'old-refresh-token',
      ip: '127.0.0.1',
      deviceHint: 'Mozilla/5.0',
    });

    const refreshAuditCall = authDao.createAuditLog.mock.calls.find(
      (c) => c[0]?.event === 'SESSION_REFRESHED'
    );
    expect(refreshAuditCall).toBeDefined();
    expect(refreshAuditCall[0].parentId).toBe(EXPECTED_HASHED_PARENT_ID);
    expect(refreshAuditCall[0].parentId).not.toBe(PARENT_ID);
    expect(refreshAuditCall[0].sessionId).toBe('parent_refresh');
  });

  // ── Cache hit (active) short-circuits the DB lookup ───────────────────────
  it('skips DB lookup when the parent:exists cache says active (cached 1)', async () => {
    mockValidJwt();
    redis.get.mockImplementation((key) => {
      if (key === `parentRefresh:${PARENT_ID}`) return Promise.resolve('mocked-hash-value');
      if (key === `parent:exists:${PARENT_ID}`) return Promise.resolve('1'); // cached active
      return Promise.resolve(null);
    });

    const result = await authManager.parentRefreshSession({
      refreshToken: 'old-refresh-token',
    });

    expect(result).toMatchObject({ parentId: PARENT_ID });
    expect(authDao.findActiveParentById).not.toHaveBeenCalled();
  });
});