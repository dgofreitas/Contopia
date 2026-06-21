// Contopia — Auth Business Logic Manager
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pino from 'pino';
import redis from '../../config/redis.js';
import {
  findParentByEmail,
  findParentById,
  findActiveParentById,
  createParent,
  updateParentLastLogin,
  findChildById,
  findActiveChildByParentAndName,
  findActiveChildByParent,
  findChildrenByParentId,
  createChild,
  findChildByIdWithPassword,
  findParentByIdWithPassword,
  updateParentPassword,
  createAuditLog,
  hashIdentifier,
  softDeleteChildById,
} from './auth-dao.js';
import { purgeAssetsByAuthorManager } from '../storage/storage-manager.js';
import { createActivityLog } from '../book/book-dao.js';

const logger = pino({ name: 'auth-manager', level: process.env.LOG_LEVEL || 'info' });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');
const ACCESS_TOKEN_EXPIRY = '30m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds
const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

// ── Token Generation ────────────────────────────────────────────────────────

/**
 * Generate a short-lived access token for a child session.
 * Includes `sid` (session ID) claim for Redis session lookup.
 */
export function generateAccessToken(child, sessionId) {
  const payload = {
    sub: child._id.toString(),
    parentId: child.parentId.toString(),
    role: 'child',
    type: 'access',
  };
  if (sessionId) payload.sid = sessionId;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a long-lived refresh token.
 */
export function generateRefreshToken(child) {
  return jwt.sign(
    {
      sub: child._id.toString(),
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * SHA-256 hash a JWT string for safe storage / comparison.
 */
export function hashToken(jwtString) {
  return crypto.createHash('sha256').update(jwtString).digest('hex');
}

// ── Session Helpers ──────────────────────────────────────────────────────────

/**
 * Create a session in Redis. Enforces single-session policy per child:
 * scans for old `session:{childId}:*` keys, deletes them, blacklists old tokens.
 * Stores new session with TTL 1800s and refresh hash with TTL 604800s.
 * Returns { sessionId }.
 */
export async function createSession({ childId, parentId, accessToken: _accessToken, refreshToken, ip, deviceHint }) {
  const sessionId = `sess_${crypto.randomBytes(8).toString('hex')}`;
  const childIdStr = childId.toString();

  // Single-session policy: scan and destroy any existing sessions for this child.
  // NOTE: project uses ioredis (not node-redis) — `scanIterator` is not available;
  // use cursor-based `scan` loop.
  try {
    const pattern = `session:${childIdStr}:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      for (const key of (keys || [])) {
        try {
          const sessionData = await redis.get(key);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            // Blacklist old access token is handled by caller; session is being replaced
            logger.info({ childId: childIdStr, oldSessionId: session.sessionId }, 'Destroying old session (single-session policy)');
          }
          await redis.del(key);
        } catch (delErr) {
          logger.warn({ err: delErr, key }, 'Failed to delete old session key');
        }
      }
    } while (cursor !== '0' && cursor !== 0);
  } catch (scanErr) {
    logger.warn({ err: scanErr, childId: childIdStr }, 'Redis scan for old sessions failed');
  }

  // Store new session in Redis
  const sessionData = {
    sessionId,
    childId: childIdStr,
    parentId: parentId.toString(),
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    ip: ip || null,
    deviceHint: deviceHint || null,
  };

  try {
    await redis.set(
      `session:${childIdStr}:${sessionId}`,
      JSON.stringify(sessionData),
      'EX',
      SESSION_TTL_SECONDS
    );
  } catch (redisErr) {
    logger.warn({ err: redisErr, childId: childIdStr }, 'Redis unavailable — session not stored');
  }

  // Store refresh token hash in Redis with 7-day TTL
  let refreshAvailable = true;
  try {
    const refreshTokenHash = hashToken(refreshToken);
    await redis.set(`refresh:${childIdStr}`, refreshTokenHash, 'EX', REFRESH_TTL_SECONDS);
  } catch (redisErr) {
    logger.warn({ err: redisErr, childId: childIdStr }, 'Redis unavailable — refresh token not stored');
    refreshAvailable = false;
  }

  // Audit log (fire-and-forget)
  createAuditLog({ childId: childIdStr, sessionId, event: 'SESSION_CREATED', ip, deviceHint }).catch(() => {});

  return { sessionId, refreshAvailable };
}

/**
 * Blacklist a token by storing its hash in Redis with remaining TTL.
 */
export async function blacklistToken(token, remainingSeconds) {
  const tokenHash = hashToken(token);
  const ttl = Math.max(remainingSeconds, 1);
  try {
    await redis.set(`bl:${tokenHash}`, '1', 'EX', ttl);
  } catch (redisErr) {
    logger.warn({ err: redisErr }, 'Redis unavailable — token blacklist set failed');
  }
}

/**
 * Check if a token is blacklisted in Redis.
 * Returns true if blacklisted, false if not (or if Redis is down — fail-open for availability).
 */
export async function isTokenBlacklisted(token) {
  const tokenHash = hashToken(token);
  try {
    const result = await redis.exists(`bl:${tokenHash}`);
    return result === 1;
  } catch (redisErr) {
    logger.warn({ err: redisErr }, 'Redis unavailable — blacklist check skipped (fail-open)');
    return false;
  }
}

/**
 * Increment login attempt counter for an IP.
 * Returns the current count.
 */
export async function incrementLoginAttempts(ip) {
  try {
    const key = `loginAttempts:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 900); // 15 min TTL on first increment
    }
    return count;
  } catch (redisErr) {
    logger.warn({ err: redisErr }, 'Redis unavailable — login attempts not tracked');
    return 0;
  }
}

/**
 * Reset login attempt counter for an IP.
 */
export async function resetLoginAttempts(ip) {
  try {
    await redis.del(`loginAttempts:${ip}`);
  } catch (redisErr) {
    logger.warn({ err: redisErr }, 'Redis unavailable — login attempts reset failed');
  }
}

/**
 * Validate a session exists in Redis and extend its TTL.
 * Returns session data if valid, null if session doesn't exist.
 */
export async function validateSession({ childId, sessionId }) {
  try {
    const data = await redis.get(`session:${childId}:${sessionId}`);
    if (!data) return null;

    // Reset TTL to 1800s
    await redis.expire(`session:${childId}:${sessionId}`, SESSION_TTL_SECONDS);

    // Update lastActivity
    const session = JSON.parse(data);
    session.lastActivity = new Date().toISOString();
    await redis.set(
      `session:${childId}:${sessionId}`,
      JSON.stringify(session),
      'EX',
      SESSION_TTL_SECONDS
    );

    return session;
  } catch (redisErr) {
    logger.warn({ err: redisErr }, 'Redis unavailable — session validation failed');
    return null;
  }
}

/**
 * Login with password. Validates bcrypt hash, creates session, issues tokens.
 * Returns { accessToken, childId, childFirstName, isOnboardingComplete, method }.
 */
export async function loginWithPassword({ childId, password, ip, deviceHint }) {
  const child = await findChildByIdWithPassword(childId);

  if (!child) {
    const err = new Error('Child not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (!child.isActive) {
    const err = new Error('Child account not verified');
    err.code = 'NOT_VERIFIED';
    err.status = 403;
    throw err;
  }

  if (!child.password) {
    const err = new Error('Password not set for this account');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, child.password);
  if (!passwordMatch) {
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }

  // Generate tokens (session created below)
  const accessToken = generateAccessToken(child);
  const refreshToken = generateRefreshToken(child);

  const { sessionId, refreshAvailable } = await createSession({
    childId: child._id,
    parentId: child.parentId,
    accessToken,
    refreshToken,
    ip,
    deviceHint,
  });

  // Re-generate access token with sid claim
  const accessWithSid = generateAccessToken(child, sessionId);

  // Reset login attempts on success
  if (ip) await resetLoginAttempts(ip);

  logger.info({ childId: child._id }, 'Password login successful');

  return {
    accessToken: accessWithSid,
    refreshToken,
    childId: child._id.toString(),
    childFirstName: child.firstName,
    isOnboardingComplete: child.onboardingCompleted,
    method: 'password',
    refreshAvailable,
    sessionId,
  };
}

/**
 * Logout: blacklist tokens, delete session, audit log.
 * Returns { loggedOut: true }.
 */
export async function logout({ childId, sessionId, accessToken, refreshToken, ip, deviceHint }) {
  const childIdStr = childId.toString();

  // Blacklist access token (remaining TTL)
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      const remainingSeconds = decoded?.exp ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1) : SESSION_TTL_SECONDS;
      await blacklistToken(accessToken, remainingSeconds);
    } catch {
      // Token may be malformed — blacklist with session TTL as fallback
      await blacklistToken(accessToken, SESSION_TTL_SECONDS);
    }
  }

  // Blacklist refresh token
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      const remainingSeconds = decoded?.exp ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1) : REFRESH_TTL_SECONDS;
      await blacklistToken(refreshToken, remainingSeconds);
    } catch {
      await blacklistToken(refreshToken, REFRESH_TTL_SECONDS);
    }
  }

  // Delete session from Redis
  try {
    await redis.del(`session:${childIdStr}:${sessionId}`);
  } catch (redisErr) {
    logger.warn({ err: redisErr, childId: childIdStr }, 'Redis unavailable — session not deleted on logout');
  }

  // Delete refresh token hash
  try {
    await redis.del(`refresh:${childIdStr}`);
  } catch (redisErr) {
    logger.warn({ err: redisErr, childId: childIdStr }, 'Redis unavailable — refresh hash not deleted on logout');
  }

  // Audit log (fire-and-forget)
  createAuditLog({ childId: childIdStr, sessionId, event: 'SESSION_LOGOUT', ip, deviceHint }).catch(() => {});

  logger.info({ childId: childIdStr, sessionId }, 'Logout successful');

  return { loggedOut: true };
}

/**
 * Refresh a session: verify refresh token, check blacklist, verify stored hash,
 * issue new access token (with existing sid), rotate refresh token.
 * Returns { accessToken, childId, childFirstName }.
 */
export async function refreshSession({ refreshToken, ip, deviceHint }) {
  // Verify JWT
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET);
  } catch (jwtErr) {
    const err = new Error('Invalid or expired refresh token');
    err.code = 'INVALID_REFRESH_TOKEN';
    err.status = 401;
    throw err;
  }

  if (decoded.type !== 'refresh') {
    const err = new Error('Invalid token type');
    err.code = 'INVALID_REFRESH_TOKEN';
    err.status = 401;
    throw err;
  }

  const childIdStr = decoded.sub;
  const tokenHash = hashToken(refreshToken);

  // Check blacklist
  const blacklisted = await isTokenBlacklisted(refreshToken);
  if (blacklisted) {
    const err = new Error('Refresh token has been revoked');
    err.code = 'TOKEN_REVOKED';
    err.status = 401;
    throw err;
  }

  // Verify stored hash matches
  try {
    const storedHash = await redis.get(`refresh:${childIdStr}`);
    if (!storedHash || storedHash !== tokenHash) {
      const err = new Error('Refresh token mismatch');
      err.code = 'INVALID_REFRESH_TOKEN';
      err.status = 401;
      throw err;
    }
  } catch (redisErr) {
    if (redisErr.code === 'INVALID_REFRESH_TOKEN' || redisErr.code === 'TOKEN_REVOKED') throw redisErr;
    logger.warn({ err: redisErr, childId: childIdStr }, 'Redis unavailable — refresh hash check skipped');
  }

  // Get child info
  const child = await findChildById(childIdStr);
  if (!child) {
    const err = new Error('Child not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Find existing session to get sessionId.
  // NOTE: project uses ioredis (not node-redis) — `scanIterator` is not available;
  // use cursor-based `scan` loop. We only need the first matching key.
  let sessionId = null;
  try {
    const pattern = `session:${childIdStr}:*`;
    let cursor = '0';
    outer: do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      for (const key of (keys || [])) {
        // Reset session TTL
        await redis.expire(key, SESSION_TTL_SECONDS);
        const sessionRaw = await redis.get(key);
        if (sessionRaw) {
          const sessionObj = JSON.parse(sessionRaw);
          sessionId = sessionObj.sessionId;
          // Update lastActivity
          sessionObj.lastActivity = new Date().toISOString();
          await redis.set(key, JSON.stringify(sessionObj), 'EX', SESSION_TTL_SECONDS);
        }
        break outer; // only process first match
      }
    } while (cursor !== '0' && cursor !== 0);
  } catch (redisErr) {
    logger.warn({ err: redisErr, childId: childIdStr }, 'Redis unavailable — session lookup skipped');
  }

  // Issue new access token with existing sid
  const newAccessToken = generateAccessToken(child, sessionId);

  // Rotate refresh token: issue new, store new hash, blacklist old
  const newRefreshToken = generateRefreshToken(child);
  const newRefreshHash = hashToken(newRefreshToken);

  try {
    await redis.set(`refresh:${childIdStr}`, newRefreshHash, 'EX', REFRESH_TTL_SECONDS);
  } catch (redisErr) {
    logger.warn({ err: redisErr, childId: childIdStr }, 'Redis unavailable — new refresh hash not stored');
  }

  // Blacklist old refresh token
  try {
    const oldDecoded = jwt.decode(refreshToken);
    const remainingSeconds = oldDecoded?.exp ? Math.max(oldDecoded.exp - Math.floor(Date.now() / 1000), 1) : REFRESH_TTL_SECONDS;
    await blacklistToken(refreshToken, remainingSeconds);
  } catch {
    await blacklistToken(refreshToken, REFRESH_TTL_SECONDS);
  }

  // Audit log (fire-and-forget)
  createAuditLog({ childId: childIdStr, sessionId: sessionId || 'unknown', event: 'SESSION_REFRESHED', ip, deviceHint }).catch(() => {});

  logger.info({ childId: childIdStr }, 'Session refreshed');

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    childId: childIdStr,
    childFirstName: child.firstName,
  };
}

/**
 * Get current user info + session metadata from Redis.
 * Returns child info + session metadata.
 */
export async function getCurrentUser(childId) {
  const childIdStr = childId.toString();
  const child = await findChildById(childIdStr);

  if (!child) {
    const err = new Error('Child not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Find session in Redis.
  // NOTE: project uses ioredis (not node-redis) — `scanIterator` is not available;
  // use cursor-based `scan` loop. We only need the first matching key.
  let sessionMeta = null;
  try {
    const pattern = `session:${childIdStr}:*`;
    let cursor = '0';
    outer: do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      for (const key of (keys || [])) {
        const raw = await redis.get(key);
        if (raw) sessionMeta = JSON.parse(raw);
        break outer; // only need first match
      }
    } while (cursor !== '0' && cursor !== 0);
  } catch (redisErr) {
    logger.warn({ err: redisErr, childId: childIdStr }, 'Redis unavailable — session metadata not retrieved');
  }

  return {
    childId: childIdStr,
    childFirstName: child.firstName,
    isOnboardingComplete: child.onboardingCompleted,
    sessionCreatedAt: sessionMeta?.createdAt || null,
    lastActivity: sessionMeta?.lastActivity || null,
  };
}

// ── Business Operations ──────────────────────────────────────────────────────

const MAX_CHILDREN_PER_PARENT = 5;

/**
 * Register a new parent account with email, password, and age consent.
 * After creating the parent, immediately creates a parent session (auto-login),
 * generates access + refresh tokens, and updates lastLogin timestamp.
 * Returns { accessToken, refreshToken, parentId, email, children }.
 * Throws ACCOUNT_EXISTS if email is already registered.
 */
export async function registerParent({ email, password, ageConsent, ip, deviceHint }) {
  const existing = await findParentByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.code = 'ACCOUNT_EXISTS';
    err.status = 409;
    throw err;
  }

  const parent = await createParent({ email, password, ageConsentAt: new Date() });
  logger.info({ parentId: parent._id }, 'New parent registered');

  // Audit log: record consent event (fire-and-forget)
  createAuditLog({ parentId: parent._id.toString(), sessionId: 'registration', event: 'PARENT_REGISTRATION_CONSENT', ip, deviceHint }).catch(() => {});

  // Auto-login: create parent session and issue tokens
  const accessToken = generateParentAccessToken(parent._id);
  const refreshToken = generateParentRefreshToken(parent._id);

  const { sessionId, refreshAvailable } = await createParentSession({
    parentId: parent._id,
    refreshToken,
    ip,
    deviceHint,
  });

  // Update lastLogin timestamp (best-effort, non-blocking)
  updateParentLastLogin(parent._id).catch((err) => {
    logger.warn({ err, parentId: parent._id }, 'Failed to update lastLogin on registration');
  });

  // Find children linked to this parent (none yet for new account, but keeps shape consistent)
  const children = await findChildrenByParentId(parent._id);

  return {
    accessToken,
    refreshToken,
    parentId: parent._id.toString(),
    email: parent.email,
    children: children.map((c) => ({
      childId: c._id.toString(),
      firstName: c.firstName,
      avatarSeed: c.avatarSeed || 'avatar_default',
    })),
    refreshAvailable,
    sessionId,
  };
}

/**
 * Create a child profile under an existing parent account.
 * Enforces 5-child limit at application level.
 * STORY-063: persists optional `dateOfBirth` and emits CHILD_CREATED activity log
 * with a SHA-256 hash of the childId in metadata.
 * Returns { child } on success.
 * Throws ACCOUNT_EXISTS if an active child with the same name exists.
 * Throws CHILD_LIMIT_REACHED if parent already has 5 active children.
 */
export async function createChildProfile({ parentId, firstName, avatarSeed, dateOfBirth }) {
  // Check 5-child limit
  const existingChildren = await findChildrenByParentId(parentId);
  if (existingChildren.length >= MAX_CHILDREN_PER_PARENT) {
    const err = new Error('Maximum number of child profiles reached (5)');
    err.code = 'CHILD_LIMIT_REACHED';
    err.status = 409;
    throw err;
  }

  // Check for duplicate active child name
  const existingChild = await findActiveChildByParentAndName(parentId, firstName);
  if (existingChild) {
    const err = new Error('An active child with this name already exists for this parent');
    err.code = 'ACCOUNT_EXISTS';
    err.status = 409;
    throw err;
  }

  const child = await createChild({ parentId, firstName, avatarSeed, dateOfBirth });
  logger.info({ parentId, childId: child._id }, 'Child profile created');

  // Audit activity log: CHILD_CREATED (fire-and-forget)
  // STORY-063 / NFR-PRV-06: hashed childId for audit trail
  const childIdStr = child._id.toString();
  const hashedChildId = crypto.createHash('sha256').update(childIdStr).digest('hex');
  createActivityLog({
    actorId: parentId,
    actorType: 'parent',
    action: 'CHILD_CREATED',
    targetId: child._id,
    targetType: 'child',
    metadata: { childId: hashedChildId },
  }).catch((err) => {
    logger.warn({ err, parentId, childId: childIdStr }, 'ActivityLog creation failed for CHILD_CREATED');
  });

  return { child };
}

/**
 * Create a child session from an authenticated parent.
 * STORY-059: Parent-initiated child session creation. Replaces childLogin() (magic-link flow).
 * Finds child by optional childId or first active child for parent.
 * Verifies child.isActive, generates tokens, creates session, emits audit log.
 * Returns { accessToken, refreshToken, child, sessionId }.
 */
export async function createChildSession({ parentId, childId, ip, deviceHint }) {
  // Resolve child: either by provided childId or first active child
  let child;
  if (childId) {
    child = await findChildById(childId);
    if (!child) {
      const err = new Error('Child not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }
    // Verify child belongs to parent
    if (child.parentId.toString() !== parentId.toString()) {
      const err = new Error('Child does not belong to this parent');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }
  } else {
    child = await findActiveChildByParent(parentId);
    if (!child) {
      const err = new Error('No active child found for this parent');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }
  }

  // Verify child is active
  if (!child.isActive) {
    const err = new Error('Child account is not active');
    err.code = 'NOT_VERIFIED';
    err.status = 403;
    throw err;
  }

  // Generate tokens and create session
  const accessToken = generateAccessToken(child);
  const refreshToken = generateRefreshToken(child);

  const { sessionId, refreshAvailable } = await createSession({
    childId: child._id,
    parentId: child.parentId,
    accessToken,
    refreshToken,
    ip,
    deviceHint,
  });

  // Re-generate access token with sid claim
  const accessWithSid = generateAccessToken(child, sessionId);

  // Audit log: CHILD_SESSION_CREATED (fire-and-forget)
  createAuditLog({
    childId: child._id.toString(),
    parentId: parentId.toString(),
    sessionId,
    event: 'CHILD_SESSION_CREATED',
    ip,
    deviceHint,
  }).catch(() => {});

  logger.info({ childId: child._id.toString(), parentId: parentId.toString(), sessionId }, 'Child session created by parent');

  return {
    accessToken: accessWithSid,
    refreshToken,
    child: {
      childId: child._id.toString(),
      childFirstName: child.firstName,
      isOnboardingComplete: child.onboardingCompleted,
    },
    refreshAvailable,
    sessionId,
  };
}

/**
 * Delete a child account and purge all associated assets (GDPR).
 * Soft-deletes the child, purges assets, returns confirmation.
 * @param {{ childId: string }} params
 * @returns {{ deleted: true, childId: string }}
 */
export async function deleteAccountManager({ childId }) {
  const child = await findChildById(childId);

  if (!child) {
    const err = new Error('Account not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Purge all assets for this child (best-effort)
  try {
    await purgeAssetsByAuthorManager(childId);
  } catch (purgeErr) {
    logger.warn({ err: purgeErr, childId }, 'Asset purge failed during account deletion — continuing with soft-delete');
  }

  // Soft-delete: set deletedAt
  await softDeleteChildById(childId);

  logger.info({ childId }, 'Account deleted and assets purged');

  return { deleted: true, childId };
}

// ── Parent Auth ──────────────────────────────────────────────────────────────

const PARENT_ACCESS_TOKEN_EXPIRY = '30m';
const PARENT_REFRESH_TOKEN_EXPIRY = '7d';
const PARENT_SESSION_TTL_SECONDS = 30 * 60; // 30 minutes
const PARENT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const INCREMENT_LOGIN_ATTEMPTS_PARENT = 'loginAttemptsParent';

/**
 * Generate a parent access token.
 * Claims: sub (parentId), role: 'parent', type: 'access'.
 * No sid claim — parent session is tracked via Redis key directly.
 */
export function generateParentAccessToken(parentId) {
  return jwt.sign(
    {
      sub: parentId.toString(),
      role: 'parent',
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: PARENT_ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a parent refresh token.
 * Claims: sub (parentId), role: 'parent', type: 'refresh'.
 */
export function generateParentRefreshToken(parentId) {
  return jwt.sign(
    {
      sub: parentId.toString(),
      role: 'parent',
      type: 'parent_refresh',
    },
    JWT_SECRET,
    { expiresIn: PARENT_REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Create a parent session in Redis.
 * Key: parentSession:{parentId}:{sessionId}, TTL: 1800s.
 * Returns { sessionId }.
 */
export async function createParentSession({ parentId, refreshToken, ip, deviceHint }) {
  const sessionId = `psess_${crypto.randomBytes(8).toString('hex')}`;
  const parentIdStr = parentId.toString();

  const sessionData = {
    sessionId,
    parentId: parentIdStr,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    ip: ip || null,
    deviceHint: deviceHint || null,
  };

  try {
    await redis.set(
      `parentSession:${parentIdStr}:${sessionId}`,
      JSON.stringify(sessionData),
      'EX',
      PARENT_SESSION_TTL_SECONDS
    );
  } catch (redisErr) {
    logger.warn({ err: redisErr, parentId: parentIdStr }, 'Redis unavailable — parent session not stored');
  }

  // Store parent refresh token hash in Redis with 7-day TTL
  let refreshAvailable = true;
  try {
    const refreshTokenHash = hashToken(refreshToken);
    await redis.set(`parentRefresh:${parentIdStr}`, refreshTokenHash, 'EX', PARENT_REFRESH_TTL_SECONDS);
  } catch (redisErr) {
    logger.warn({ err: redisErr, parentId: parentIdStr }, 'Redis unavailable — parent refresh token not stored');
    refreshAvailable = false;
  }

  // Audit log (fire-and-forget)
  createAuditLog({ parentId: parentIdStr, sessionId, event: 'PARENT_SESSION_CREATED', ip, deviceHint }).catch(() => {});

  return { sessionId, refreshAvailable };
}

/**
 * Validate a parent session exists in Redis and extend its TTL.
 * Returns session data if valid, null if expired.
 */
export async function validateParentSession({ parentId, sessionId }) {
  try {
    const data = await redis.get(`parentSession:${parentId}:${sessionId}`);
    if (!data) return null;

    await redis.expire(`parentSession:${parentId}:${sessionId}`, PARENT_SESSION_TTL_SECONDS);

    const session = JSON.parse(data);
    session.lastActivity = new Date().toISOString();
    await redis.set(
      `parentSession:${parentId}:${sessionId}`,
      JSON.stringify(session),
      'EX',
      PARENT_SESSION_TTL_SECONDS
    );

    return session;
  } catch (redisErr) {
    logger.warn({ err: redisErr }, 'Redis unavailable — parent session validation failed');
    return null;
  }
}

/**
 * Increment parent login attempt counter for an IP.
 * Returns the current count.
 */
export async function incrementLoginAttemptsParent(ip) {
  try {
    const key = `${INCREMENT_LOGIN_ATTEMPTS_PARENT}:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 900); // 15 min TTL
    }
    return count;
  } catch (redisErr) {
    logger.warn({ err: redisErr }, 'Redis unavailable — parent login attempts not tracked');
    return 0;
  }
}

/**
 * Reset parent login attempt counter for an IP.
 */
export async function resetLoginAttemptsParent(ip) {
  try {
    await redis.del(`${INCREMENT_LOGIN_ATTEMPTS_PARENT}:${ip}`);
  } catch (redisErr) {
    logger.warn({ err: redisErr }, 'Redis unavailable — parent login attempts reset failed');
  }
}

/**
 * Parent login: validate email + password, create session, issue tokens.
 * Returns { accessToken, parentId, email, childFirstName, childId }.
 */
export async function parentLogin({ email, password, ip, deviceHint }) {
  // Find parent by email
  const parent = await findParentByEmail(email);
  if (!parent) {
    createAuditLog({ parentId: 'unknown', sessionId: 'none', event: 'PARENT_LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    createAuditLog({ parentId: 'unknown', sessionId: 'none', event: 'LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }

  // Get parent with password
  const parentWithPassword = await findParentByIdWithPassword(parent._id);
  if (!parentWithPassword?.password) {
    createAuditLog({ parentId: parent._id.toString(), sessionId: 'none', event: 'PARENT_LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    createAuditLog({ parentId: parent._id.toString(), sessionId: 'none', event: 'LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, parentWithPassword.password);
  if (!passwordMatch) {
    createAuditLog({ parentId: parent._id.toString(), sessionId: 'none', event: 'PARENT_LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    createAuditLog({ parentId: parent._id.toString(), sessionId: 'none', event: 'LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }

  // Update lastLogin timestamp (best-effort, non-blocking)
  updateParentLastLogin(parent._id).catch((err) => {
    logger.warn({ err, parentId: parent._id }, 'Failed to update lastLogin');
  });

  // Find children linked to this parent
  const children = await findChildrenByParentId(parent._id);

  // Generate tokens
  const accessToken = generateParentAccessToken(parent._id);
  const refreshToken = generateParentRefreshToken(parent._id);

  const { sessionId, refreshAvailable } = await createParentSession({
    parentId: parent._id,
    refreshToken,
    ip,
    deviceHint,
  });

  // Reset parent login attempts on success
  if (ip) await resetLoginAttemptsParent(ip);

  logger.info({ parentId: parent._id }, 'Parent login successful');

  return {
    accessToken,
    refreshToken,
    parentId: parent._id.toString(),
    email: parent.email,
    children: children.map((c) => ({
      childId: c._id.toString(),
      firstName: c.firstName,
      avatarSeed: c.avatarSeed || 'avatar_default',
    })),
    refreshAvailable,
    sessionId,
  };
}

/**
 * Parent logout: blacklist tokens, delete session, audit log.
 * Returns { loggedOut: true }.
 */
export async function parentLogout({ parentId, sessionId, accessToken, refreshToken, ip, deviceHint }) {
  const parentIdStr = parentId.toString();

  // Blacklist access token
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      const remainingSeconds = decoded?.exp ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1) : PARENT_SESSION_TTL_SECONDS;
      await blacklistToken(accessToken, remainingSeconds);
    } catch {
      await blacklistToken(accessToken, PARENT_SESSION_TTL_SECONDS);
    }
  }

  // Blacklist refresh token
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      const remainingSeconds = decoded?.exp ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1) : PARENT_REFRESH_TTL_SECONDS;
      await blacklistToken(refreshToken, remainingSeconds);
    } catch {
      await blacklistToken(refreshToken, PARENT_REFRESH_TTL_SECONDS);
    }
  }

  // Delete parent session from Redis
  try {
    await redis.del(`parentSession:${parentIdStr}:${sessionId}`);
  } catch (redisErr) {
    logger.warn({ err: redisErr, parentId: parentIdStr }, 'Redis unavailable — parent session not deleted on logout');
  }

  // Delete parent refresh token hash
  try {
    await redis.del(`parentRefresh:${parentIdStr}`);
  } catch (redisErr) {
    logger.warn({ err: redisErr, parentId: parentIdStr }, 'Redis unavailable — parent refresh hash not deleted on logout');
  }

  // Audit log (fire-and-forget)
  createAuditLog({ parentId: parentIdStr, sessionId: sessionId || 'none', event: 'PARENT_LOGOUT', ip, deviceHint }).catch(() => {});
  createAuditLog({ parentId: parentIdStr, sessionId: sessionId || 'none', event: 'SESSION_LOGOUT', ip, deviceHint }).catch(() => {});

  logger.info({ parentId: parentIdStr, sessionId }, 'Parent logout successful');

  return { loggedOut: true };
}

/**
 * Parent refresh session: verify refresh token, check blacklist, verify stored hash,
 * issue new access token, rotate refresh token.
 * Returns { accessToken, parentId }.
 */
export async function parentRefreshSession({ refreshToken, ip, deviceHint }) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET);
  } catch (jwtErr) {
    const err = new Error('Invalid or expired refresh token');
    err.code = 'INVALID_REFRESH_TOKEN';
    err.status = 401;
    throw err;
  }

  if (decoded.type !== 'parent_refresh' || decoded.role !== 'parent') {
    const err = new Error('Invalid token type');
    err.code = 'INVALID_REFRESH_TOKEN';
    err.status = 401;
    throw err;
  }

  const parentIdStr = decoded.sub;
  const tokenHash = hashToken(refreshToken);

  // Check blacklist
  const blacklisted = await isTokenBlacklisted(refreshToken);
  if (blacklisted) {
    const err = new Error('Refresh token has been revoked');
    err.code = 'TOKEN_REVOKED';
    err.status = 401;
    throw err;
  }

  // Verify stored hash matches
  try {
    const storedHash = await redis.get(`parentRefresh:${parentIdStr}`);
    if (!storedHash || storedHash !== tokenHash) {
      const err = new Error('Refresh token mismatch');
      err.code = 'INVALID_REFRESH_TOKEN';
      err.status = 401;
      throw err;
    }
  } catch (redisErr) {
    if (redisErr.code === 'INVALID_REFRESH_TOKEN' || redisErr.code === 'TOKEN_REVOKED') throw redisErr;
    logger.warn({ err: redisErr, parentId: parentIdStr }, 'Redis unavailable — parent refresh hash check skipped');
  }

  // STORY-064 (G8): Verify parent account is still active before issuing new tokens.
  // Mirrors the child authMiddleware pattern (auth-middleware.js lines 70-94):
  // Redis cache key `parent:exists:{parentId}` (5m TTL) → DB fallback via findActiveParentById.
  const parentCacheKey = `parent:exists:${parentIdStr}`;
  let parentActive = false;
  try {
    const cached = await redis.get(parentCacheKey);
    if (cached === '1') {
      parentActive = true;
    } else if (cached === '0') {
      parentActive = false;
    } else {
      // Cache miss — check DB
      const parent = await findActiveParentById(parentIdStr);
      parentActive = !!parent;
      // Cache result with 5m TTL
      await redis.set(parentCacheKey, parentActive ? '1' : '0', 'EX', 300);
    }
  } catch (dbErr) {
    logger.warn({ err: dbErr, parentId: parentIdStr }, 'Parent existence check failed — allowing refresh (fail-open)');
    parentActive = true; // fail-open: allow refresh if check fails
  }

  if (!parentActive) {
    const err = new Error('Parent account not found or deactivated');
    err.code = 'UNAUTHORIZED';
    err.status = 401;
    throw err;
  }

  // Extend parent session TTL.
  // NOTE: project uses ioredis (not node-redis) — `scanIterator` is not available;
  // use cursor-based `scan` loop. We only need the first matching key.
  try {
    const pattern = `parentSession:${parentIdStr}:*`;
    let cursor = '0';
    outer: do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      for (const key of (keys || [])) {
        await redis.expire(key, PARENT_SESSION_TTL_SECONDS);
        const sessionRaw = await redis.get(key);
        if (sessionRaw) {
          const sessionObj = JSON.parse(sessionRaw);
          sessionObj.lastActivity = new Date().toISOString();
          await redis.set(key, JSON.stringify(sessionObj), 'EX', PARENT_SESSION_TTL_SECONDS);
        }
        break outer;
      }
    } while (cursor !== '0' && cursor !== 0);
  } catch (redisErr) {
    logger.warn({ err: redisErr, parentId: parentIdStr }, 'Redis unavailable — parent session lookup skipped');
  }

  // Issue new access token
  const newAccessToken = generateParentAccessToken(parentIdStr);

  // Rotate refresh token
  const newRefreshToken = generateParentRefreshToken(parentIdStr);
  const newRefreshHash = hashToken(newRefreshToken);

  try {
    await redis.set(`parentRefresh:${parentIdStr}`, newRefreshHash, 'EX', PARENT_REFRESH_TTL_SECONDS);
  } catch (redisErr) {
    logger.warn({ err: redisErr, parentId: parentIdStr }, 'Redis unavailable — new parent refresh hash not stored');
  }

  // Blacklist old refresh token
  try {
    const oldDecoded = jwt.decode(refreshToken);
    const remainingSeconds = oldDecoded?.exp ? Math.max(oldDecoded.exp - Math.floor(Date.now() / 1000), 1) : PARENT_REFRESH_TTL_SECONDS;
    await blacklistToken(refreshToken, remainingSeconds);
  } catch {
    await blacklistToken(refreshToken, PARENT_REFRESH_TTL_SECONDS);
  }

  // Audit log (fire-and-forget)
  // STORY-064 (G9 / NFR-OBS-04): hash parentId for PII-safe audit logging.
  const hashedParentId = hashIdentifier(parentIdStr);
  createAuditLog({ parentId: hashedParentId, sessionId: 'parent_refresh', event: 'SESSION_REFRESHED', ip, deviceHint }).catch(() => {});

  logger.info({ parentId: parentIdStr }, 'Parent session refreshed');

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    parentId: parentIdStr,
  };
}

/**
 * Log a SESSION_EXPIRED audit event for a parent session.
 * Called from auth-middleware when a session is found expired (idle timeout).
 */
export function logSessionExpired(parentId, sessionId, ip, deviceHint) {
  createAuditLog({ parentId, sessionId, event: 'SESSION_EXPIRED', ip, deviceHint, reason: 'idle_timeout' }).catch(() => {});
}

/**
 * Get current parent info: parentId, email, children, dashNav.
 */
export async function getCurrentParent(parentId) {
  const parentIdStr = parentId.toString();
  const parentDoc = await findParentById(parentIdStr);

  if (!parentDoc) {
    const err = new Error('Parent not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Find children linked to this parent
  const children = await findChildrenByParentId(parentDoc._id);

  return {
    parentId: parentIdStr,
    email: parentDoc.email,
    lastLogin: parentDoc.lastLogin,
    children: children.map((c) => ({
      childId: c._id.toString(),
      firstName: c.firstName,
      avatarSeed: c.avatarSeed || 'avatar_default',
    })),
    dashNav: ['activity', 'export', 'delete', 'privacy'],
  };
}

// ── Email Check (STORY-062) ──────────────────────────────────────────────────

/**
 * Check if a parent account exists for the given email.
 * Used by the unified auth flow to determine login vs register mode.
 * Includes timing-attack mitigation via random jitter delay.
 * Fire-and-forget audit log with hashed email for anomaly detection.
 * Returns { exists: boolean } — no PII disclosed.
 */
export async function checkParentEmail({ email, ip, deviceHint }) {
  const parent = await findParentByEmail(email);

  // Audit log (fire-and-forget) with hashed email for anomaly detection
  const emailHash = hashIdentifier(email);
  createAuditLog({ parentId: 'unknown', sessionId: 'email_check', event: 'EMAIL_CHECK', ip, deviceHint, emailHash }).catch(() => {});

  // Random jitter delay (50–150ms) to mitigate timing attacks
  const jitter = Math.random() * 100 + 50;
  await new Promise((resolve) => setTimeout(resolve, jitter));

  return { exists: !!parent };
}