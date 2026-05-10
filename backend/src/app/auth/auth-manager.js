// Contopia — Auth Business Logic Manager
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import redis from '../../config/redis.js';
import {
  findParentByEmail,
  findParentByVerificationTokenHash,
  createParent,
  updateParentVerification,
  markParentVerified,
  clearParentVerificationToken,
  findChildById,
  findActiveChildByParentAndName,
  createChild,
  activateChild,
} from './auth-dao.js';

const logger = pino({ name: 'auth-manager', level: process.env.LOG_LEVEL || 'info' });

const JWT_SECRET = process.env.JWT_SECRET;
const VERIFICATION_EXPIRY_HOURS = 72;
const ACCESS_TOKEN_EXPIRY = '30m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

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
 */
export function generateAccessToken(child) {
  return jwt.sign(
    {
      sub: child._id.toString(),
      parentId: child.parentId.toString(),
      role: 'child',
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
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
  const { default: mongoose } = await import('mongoose');
  const { Child } = await import('./auth-model.js');
  const pendingChild = await Child.findOne({
    parentId: parent._id,
    isActive: false,
  }).lean().exec();

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

  return { token, parent, child: pendingChild };
}

/**
 * Child login — authenticate and issue tokens.
 * Returns { accessToken, childId, childFirstName, isOnboardingComplete }.
 * Throws NOT_FOUND or NOT_VERIFIED on failure.
 */
export async function childLogin({ childId, parentId }) {
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

  // Generate tokens
  const accessToken = generateAccessToken(child);
  const refreshToken = generateRefreshToken(child);
  const refreshTokenHash = hashToken(refreshToken);

  // Store refresh token hash in Redis with 7-day TTL
  try {
    await redis.set(`refresh:${child._id.toString()}`, refreshTokenHash, 'EX', REFRESH_TTL_SECONDS);
  } catch (redisErr) {
    logger.error({ err: redisErr, childId: child._id }, 'Failed to store refresh token in Redis');
    // Continue — don't block login on Redis failure
  }

  logger.info({ childId: child._id }, 'Child login successful');

  return {
    accessToken,
    childId: child._id.toString(),
    childFirstName: child.firstName,
    isOnboardingComplete: child.onboardingCompleted,
  };
}