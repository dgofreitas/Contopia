// Contopia — Auth HTTP Routes
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import redis from '../../config/redis.js';
import { registerSchema, resendSchema, childLoginSchema } from '../common/validation-schemas.js';
import * as authManager from './auth-manager.js';
import { sendVerificationEmail } from '../common/email-service.js';

const logger = pino({ name: 'auth-router', level: process.env.LOG_LEVEL || 'info' });

const router = Router();

// ── Rate Limiters ───────────────────────────────────────────────────────────
// Try Redis-backed store; fall back to memory store

let RateLimitStore;
try {
  const mod = await import('rate-limit-redis');
  RateLimitStore = mod.default || mod;
} catch {
  // rate-limit-redis not installed — fall back to memory store
  RateLimitStore = undefined;
}

function createLimiter({ windowMs, max, message }) {
  const opts = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many attempts.' },
        meta: { requestId: req.id },
      });
    },
  };

  if (RateLimitStore && redis?.status === 'ready') {
    opts.store = new RateLimitStore({
      sendCommand: (...args) => redis.call(...args),
    });
  }

  return rateLimit(opts);
}

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many registration attempts.',
});

const resendLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many resend attempts.',
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildVerificationLink(token) {
  const base = process.env.APP_URL || 'http://localhost:8000';
  return `${base}/api/auth/verify/${token}`;
}

// ── POST /register ──────────────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  const requestId = req.id;

  try {
    // Validate input
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const { parentEmail, childFirstName } = parsed.data;

    // Check if there's already a PENDING (inactive) child with same name for same parent
    // This enables idempotent registration — resend instead of duplicate
    const { default: mongoose } = await import('mongoose');
    const { Parent, Child } = await import('./auth-model.js');

    let parent = await Parent.findOne({ email: parentEmail.toLowerCase() }).lean().exec();

    if (parent) {
      // Check for existing pending child with same name
      const existingPending = await Child.findOne({
        parentId: parent._id,
        firstName: childFirstName,
        isActive: false,
      }).lean().exec();

      if (existingPending) {
        // Idempotent: resend verification instead of creating duplicate
        const result = await authManager.resendVerification(parentEmail);
        await sendVerificationEmail({
          to: parentEmail,
          childFirstName,
          verificationLink: buildVerificationLink(result.token),
        });
        logger.info({ parentId: parent._id, requestId }, 'Verification resent (idempotent register)');
        return res.status(200).json({
          data: { parentId: parent._id.toString(), emailSent: true, resent: true },
          meta: { requestId },
        });
      }
    }

    // Normal registration
    const { parent: newParent, child, token } = await authManager.registerParentAndChild({
      parentEmail,
      childFirstName,
    });

    // Send verification email (fire-and-forget errors handled by email-service)
    await sendVerificationEmail({
      to: parentEmail,
      childFirstName,
      verificationLink: buildVerificationLink(token),
    });

    logger.info({ parentId: newParent._id, childId: child._id, requestId }, 'Parent+child registered');

    return res.status(201).json({
      data: { parentId: newParent._id.toString(), emailSent: true },
      meta: { requestId },
    });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /verify/:token ──────────────────────────────────────────────────────
router.get('/verify/:token', async (req, res) => {
  const requestId = req.id;

  try {
    const { token } = req.params;
    const result = await authManager.verifyEmail(token);

    logger.info({ childId: result.childId, requestId }, 'Email verified');

    return res.status(200).json({
      data: { childId: result.childId },
      meta: { requestId },
    });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /resend-verification ───────────────────────────────────────────────
router.post('/resend-verification', resendLimiter, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = resendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const { parentEmail } = parsed.data;
    const result = await authManager.resendVerification(parentEmail);

    await sendVerificationEmail({
      to: parentEmail,
      childFirstName: result.child.firstName,
      verificationLink: buildVerificationLink(result.token),
    });

    logger.info({ parentId: result.parent._id, requestId }, 'Verification resent');

    return res.status(200).json({
      data: { emailSent: true },
      meta: { requestId },
    });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /child-login ────────────────────────────────────────────────────────
router.post('/child-login', async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = childLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const { childId, parentId } = parsed.data;
    const result = await authManager.childLogin({ childId, parentId });

    return res.status(200).json({
      data: {
        accessToken: result.accessToken,
        childId: result.childId,
        childFirstName: result.childFirstName,
        isOnboardingComplete: result.isOnboardingComplete,
      },
      meta: { requestId },
    });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── Error Handler ───────────────────────────────────────────────────────────
function handleError(err, req, res) {
  const requestId = req.id;
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  // Never leak stack traces in production
  if (status >= 500) {
    logger.error({ err, requestId }, 'Unhandled auth error');
  }

  return res.status(status).json({
    error: { code, message },
    meta: { requestId },
  });
}

export default router;