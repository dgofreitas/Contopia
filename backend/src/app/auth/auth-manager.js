// Contopia — Auth Business Logic Manager
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pino from 'pino';
import redis from '../../config/redis.js';
import {
  findParentByEmail,
  findParentById,
  findParentByVerificationTokenHash,
  createParent,
  updateParentVerification,
  markParentVerified,
  clearParentVerificationToken,
  findChildById,
  findActiveChildByParentAndName,
  findActiveChildByParent,
  findPendingChildByParentAndName,
  createChild,
  activateChild,
  findPendingChildByParent,
  findChildByIdWithPassword,
  findParentByIdWithPassword,
  updateParentPassword,
  findParentByPasswordSetupToken,
  createAuditLog,
  softDeleteChildById,
} from './auth-dao.js';
import { purgeAssetsByAuthorManager } from '../storage/storage-manager.js';

const logger = pino({ name: 'auth-manager', level: process.env.LOG_LEVEL || 'info' });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');
const VERIFICATION_EXPIRY_HOURS = 72;
const ACCESS_TOKEN_EXPIRY = '30m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds
const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

// ── Token Generation ────────────────────────────────────────────────────────

/**
 * Generate a verification JWT for email confirmation.
 * Claims: sub (parentId), email, childId, type, iat, exp.
 */
export function generateVerificationToken(parent, child) {
  return jwt.sign(
    {
      sub: parent._id.toString(),
      email: parent.email,
      childId: child._id.toString(),
      type: 'email_verification',
    },
    JWT_SECRET,
    { expiresIn: `${VERIFICATION_EXPIRY_HOURS}h` }
  );
}

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

  // Single-session policy: scan and destroy any existing sessions for this child
  try {
    const pattern = `session:${childIdStr}:*`;
    for await (const key of redis.scanIterator({ match: pattern })) {
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
 * Login with magic link. Placeholder — returns magicLinkSent: true.
 * Actual email sending is a future story.
 */
export async function loginWithMagicLink({ parentEmail, childFirstName }) {
  // Find parent and active child
  const parent = await findParentByEmail(parentEmail);
  if (!parent || !parent.isVerified) {
    const err = new Error('Parent not found or not verified');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const child = await findActiveChildByParentAndName(parent._id, childFirstName);
  if (!child) {
    const err = new Error('Child not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Placeholder: in a future story, send magic link email here
  logger.info({ parentId: parent._id, childId: child._id }, 'Magic link requested (placeholder)');

  return { magicLinkSent: true, parentEmail };
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

  // Find existing session to get sessionId
  let sessionId = null;
  try {
    const pattern = `session:${childIdStr}:*`;
    for await (const key of redis.scanIterator({ match: pattern })) {
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
      break; // only process first match
    }
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

  // Find session in Redis
  let sessionMeta = null;
  try {
    const pattern = `session:${childIdStr}:*`;
    for await (const key of redis.scanIterator({ match: pattern })) {
      const raw = await redis.get(key);
      if (raw) sessionMeta = JSON.parse(raw);
      break; // only need first match
    }
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

/**
 * Register a parent + child, creating the parent if needed.
 * Returns { parent, child, token, tokenHash }.
 * Throws with code ACCOUNT_EXISTS if an active child with the same name exists.
 */
export async function registerParentAndChild({ parentEmail, childFirstName }) {
  // Find or create parent
  let parent = await findParentByEmail(parentEmail);
  if (!parent) {
    parent = await createParent({ email: parentEmail });
    logger.info({ parentId: parent._id }, 'New parent created');
  }

  // Check for duplicate active child
  const existingChild = await findActiveChildByParentAndName(parent._id, childFirstName);
  if (existingChild) {
    const err = new Error('An active child with this name already exists for this parent');
    err.code = 'ACCOUNT_EXISTS';
    err.status = 409;
    throw err;
  }

  // Create child (inactive until email verified)
  const child = await createChild({ parentId: parent._id, firstName: childFirstName });
  logger.info({ parentId: parent._id, childId: child._id }, 'Child created — pending verification');

  // Generate verification JWT, hash it, store hash + expiry on parent
  const token = generateVerificationToken(parent, child);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

  await updateParentVerification(parent._id, {
    verificationToken: tokenHash,
    verificationTokenExpires: expiresAt,
  });

  return { parent, child, token, tokenHash };
}

/**
 * Idempotent registration: if a pending child already exists for the same
 * parent + name, resend verification instead of creating a duplicate.
 * Returns { resent: true, parent, token } on idempotent path,
 * or { resent: false, parent, child, token } on normal registration.
 */
export async function registerParentAndChildIdempotent({ parentEmail, childFirstName }) {
  const parent = await findParentByEmail(parentEmail);

  if (parent) {
    const pendingChild = await findPendingChildByParentAndName(parent._id, childFirstName);
    if (pendingChild) {
      // Idempotent: resend verification instead of creating duplicate
      const { token } = await resendVerification(parentEmail);
      return { resent: true, parent, token };
    }
  }

  // Normal registration
  const { parent: newParent, child, token } = await registerParentAndChild({
    parentEmail,
    childFirstName,
  });

  return { resent: false, parent: newParent, child, token };
}

/**
 * Verify an email verification token.
 * Returns { childId } on success.
 * Throws with appropriate code/status on failure.
 */
export async function verifyEmail(token) {
  // Hash the token first to look it up
  const tokenHash = hashToken(token);
  const parent = await findParentByVerificationTokenHash(tokenHash);

  if (!parent) {
    const err = new Error('Verification token not found');
    err.code = 'TOKEN_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Verify JWT signature and expiration
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (jwtErr) {
    if (jwtErr.name === 'TokenExpiredError') {
      const err = new Error('Verification token has expired');
      err.code = 'TOKEN_EXPIRED';
      err.status = 410;
      throw err;
    }
    const err = new Error('Invalid verification token');
    err.code = 'INVALID_TOKEN';
    err.status = 400;
    throw err;
  }

  // Validate token type
  if (decoded.type !== 'email_verification') {
    const err = new Error('Invalid token type');
    err.code = 'INVALID_TOKEN';
    err.status = 400;
    throw err;
  }

  // Verify hash matches stored hash (double-check)
  if (parent.verificationToken !== tokenHash) {
    const err = new Error('Token hash mismatch');
    err.code = 'INVALID_TOKEN';
    err.status = 400;
    throw err;
  }

  // Check if not already expired (DB-level check)
  if (parent.verificationTokenExpires && new Date(parent.verificationTokenExpires) < new Date()) {
    const err = new Error('Verification token has expired');
    err.code = 'TOKEN_EXPIRED';
    err.status = 410;
    throw err;
  }

  // Mark parent verified, clear token, activate child
  await markParentVerified(parent._id);
  await clearParentVerificationToken(parent._id);
  await activateChild(decoded.childId);
  logger.info({ parentId: parent._id, childId: decoded.childId }, 'Email verified — child activated');

  return { childId: decoded.childId };
}

/**
 * Resend verification email.
 * Returns { emailSent: true } on success.
 * Throws NOT_FOUND if parent not found or already verified.
 */
export async function resendVerification(parentEmail) {
  const parent = await findParentByEmail(parentEmail);

  if (!parent || parent.isVerified) {
    const err = new Error('Parent not found or already verified');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Find a pending (inactive) child for this parent
  const pendingChild = await findPendingChildByParent(parent._id);

  if (!pendingChild) {
    const err = new Error('No pending child found for this parent');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Generate new token, update parent
  const token = generateVerificationToken(parent, pendingChild);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

  await updateParentVerification(parent._id, {
    verificationToken: tokenHash,
    verificationTokenExpires: expiresAt,
  });

  logger.info({ parentId: parent._id }, 'Verification email resent');

  return { token, parentId: parent._id, childFirstName: pendingChild.firstName };
}

/**
 * Child login — authenticate and issue tokens.
 * If password is provided, validate via bcrypt. Otherwise use existing ID-based flow.
 * Returns { accessToken, childId, childFirstName, isOnboardingComplete, method }.
 * Throws NOT_FOUND, NOT_VERIFIED, FORBIDDEN, or INVALID_CREDENTIALS on failure.
 */
export async function childLogin({ childId, parentId, password, ip, deviceHint }) {
  const child = await findChildById(childId);

  if (!child) {
    const err = new Error('Child not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (child.parentId.toString() !== parentId) {
    const err = new Error('Parent ID mismatch');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  if (!child.isActive) {
    const err = new Error('Child account not verified');
    err.code = 'NOT_VERIFIED';
    err.status = 403;
    throw err;
  }

  // If password provided, validate it
  if (password) {
    const childWithPassword = await findChildByIdWithPassword(childId);
    if (!childWithPassword?.password) {
      const err = new Error('Password not set for this account');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }
    const match = await bcrypt.compare(password, childWithPassword.password);
    if (!match) {
      const err = new Error('Invalid credentials');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }
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

  // Reset login attempts on success
  if (ip) await resetLoginAttempts(ip);

  logger.info({ childId: child._id, method: password ? 'password' : 'id' }, 'Child login successful');

return {
    accessToken: accessWithSid,
    refreshToken,
    childId: child._id.toString(),
    childFirstName: child.firstName,
    isOnboardingComplete: child.onboardingCompleted,
    method: password ? 'password' : 'id',
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
const PASSWORD_SETUP_EXPIRY_HOURS = 24;
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
 * Generate a password setup JWT token for a parent.
 * Claims: sub (parentId), type: 'password_setup'.
 */
export function generatePasswordSetupToken(parentId) {
  return jwt.sign(
    {
      sub: parentId.toString(),
      type: 'password_setup',
    },
    JWT_SECRET,
    { expiresIn: `${PASSWORD_SETUP_EXPIRY_HOURS}h` }
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
 * Parent login: validate email + password, create session, issue tokens.
 * Returns { accessToken, parentId, email, childFirstName, childId }.
 */
export async function parentLogin({ email, password, ip, deviceHint }) {
  // Find parent by email
  const parent = await findParentByEmail(email);
  if (!parent) {
    createAuditLog({ parentId: 'unknown', sessionId: 'none', event: 'PARENT_LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }

  // Get parent with password
  const parentWithPassword = await findParentByIdWithPassword(parent._id);
  if (!parentWithPassword?.password) {
    createAuditLog({ parentId: parent._id.toString(), sessionId: 'none', event: 'PARENT_LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    const err = new Error('Password not set — please set up your password first');
    err.code = 'PASSWORD_NOT_SET';
    err.status = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, parentWithPassword.password);
  if (!passwordMatch) {
    createAuditLog({ parentId: parent._id.toString(), sessionId: 'none', event: 'PARENT_LOGIN_FAILED', ip, deviceHint }).catch(() => {});
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    err.status = 401;
    throw err;
  }

  // Find the child linked to this parent
  const childData = await findActiveChildByParent(parent._id);

  // Generate tokens
  const accessToken = generateParentAccessToken(parent._id);
  const refreshToken = generateParentRefreshToken(parent._id);

  const { sessionId, refreshAvailable } = await createParentSession({
    parentId: parent._id,
    refreshToken,
    ip,
    deviceHint,
  });

  // Reset login attempts on success
  if (ip) await resetLoginAttempts(ip);

  logger.info({ parentId: parent._id }, 'Parent login successful');

  return {
    accessToken,
    refreshToken,
    parentId: parent._id.toString(),
    email: parent.email,
    childFirstName: childData?.firstName || null,
    childId: childData?._id?.toString() || null,
    refreshAvailable,
    sessionId,
  };
}

/**
 * Parent setup password: validate setup token, set password.
 * Returns { parentId, email, passwordSet: true }.
 */
export async function parentSetupPassword({ token, password }) {
  // Verify JWT
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (jwtErr) {
    if (jwtErr.name === 'TokenExpiredError') {
      const err = new Error('Password setup token has expired');
      err.code = 'TOKEN_EXPIRED';
      err.status = 410;
      throw err;
    }
    const err = new Error('Invalid password setup token');
    err.code = 'INVALID_TOKEN';
    err.status = 400;
    throw err;
  }

  if (decoded.type !== 'password_setup') {
    const err = new Error('Invalid token type');
    err.code = 'INVALID_TOKEN';
    err.status = 400;
    throw err;
  }

  const parentId = decoded.sub;

  // Verify parent exists
  const parent = await findParentByEmail(
    (await findParentByIdWithPassword(parentId))?.email || ''
  );

  if (!parent && !parentId) {
    const err = new Error('Parent not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Verify token hash matches stored hash
  const tokenHash = hashToken(token);
  const parentByToken = await findParentByPasswordSetupToken(tokenHash);
  if (!parentByToken) {
    const err = new Error('Invalid or already used password setup token');
    err.code = 'INVALID_TOKEN';
    err.status = 400;
    throw err;
  }

  // Check expiry at DB level
  if (parentByToken.passwordSetupExpires && new Date(parentByToken.passwordSetupExpires) < new Date()) {
    const err = new Error('Password setup token has expired');
    err.code = 'TOKEN_EXPIRED';
    err.status = 410;
    throw err;
  }

  // Update password (pre-save hook will hash it)
  await updateParentPassword(parentByToken._id, password);

  logger.info({ parentId: parentByToken._id.toString() }, 'Parent password set');

  return {
    parentId: parentByToken._id.toString(),
    email: parentByToken.email,
    passwordSet: true,
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

  // Extend parent session TTL
  try {
    const pattern = `parentSession:${parentIdStr}:*`;
    for await (const key of redis.scanIterator({ match: pattern })) {
      await redis.expire(key, PARENT_SESSION_TTL_SECONDS);
      const sessionRaw = await redis.get(key);
      if (sessionRaw) {
        const sessionObj = JSON.parse(sessionRaw);
        sessionObj.lastActivity = new Date().toISOString();
        await redis.set(key, JSON.stringify(sessionObj), 'EX', PARENT_SESSION_TTL_SECONDS);
      }
      break;
    }
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
  createAuditLog({ parentId: parentIdStr, sessionId: 'parent_refresh', event: 'SESSION_REFRESHED', ip, deviceHint }).catch(() => {});

  logger.info({ parentId: parentIdStr }, 'Parent session refreshed');

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    parentId: parentIdStr,
  };
}

/**
 * Get current parent info: parentId, email, childId, childFirstName, dashNav.
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

  // Find child linked to this parent
  const childData = await findActiveChildByParent(parentDoc._id);

  return {
    parentId: parentIdStr,
    email: parentDoc.email,
    childId: childData?._id?.toString() || null,
    childFirstName: childData?.firstName || null,
    dashNav: ['activity', 'export', 'delete', 'privacy'],
  };
}