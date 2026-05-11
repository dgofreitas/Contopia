// Contopia — Auth HTTP Routes
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import redis from '../../config/redis.js';
import { registerSchema, resendSchema, childLoginSchema, loginSchema, logoutSchema, refreshSchema } from '../common/validation-schemas.js';
import { authMiddleware } from '../common/auth-middleware.js';
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

function createLimiter({ windowMs, max, message, keyGenerator }) {
  const opts = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip),
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
  keyGenerator: (req) => {
    const email = req.body?.parentEmail || '';
    return `${req.ip}:${email.slice(0, 3)}`;
  },
});

const resendLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many resend attempts.',
  keyGenerator: (req) => {
    const email = req.body?.parentEmail || '';
    return `${req.ip}:${email.slice(0, 3)}`;
  },
});

const verifyLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: 'Too many verification attempts.',
});

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts.',
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

    const result = await authManager.registerParentAndChildIdempotent({
      parentEmail,
      childFirstName,
    });

    if (result.resent) {
      // Idempotent: verification resent for existing pending child
      await sendVerificationEmail({
        to: parentEmail,
        childFirstName,
        verificationLink: buildVerificationLink(result.token),
      });
      logger.info({ parentId: result.parent._id, requestId }, 'Verification resent (idempotent register)');
      return res.status(200).json({
        data: { parentId: result.parent._id.toString(), emailSent: true, resent: true },
        meta: { requestId },
      });
    }

    // Normal registration
    await sendVerificationEmail({
      to: parentEmail,
      childFirstName,
      verificationLink: buildVerificationLink(result.token),
    });

    logger.info({ parentId: result.parent._id, childId: result.child._id, requestId }, 'Parent+child registered');

    return res.status(201).json({
      data: { parentId: result.parent._id.toString(), emailSent: true },
      meta: { requestId },
    });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /verify/:token ──────────────────────────────────────────────────────
router.get('/verify/:token', verifyLimiter, async (req, res) => {
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
      childFirstName: result.childFirstName,
      verificationLink: buildVerificationLink(result.token),
    });

    logger.info({ parentId: result.parentId, requestId }, 'Verification resent');

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
    const ip = req.ip;
    const deviceHint = req.headers['user-agent']
      ? req.headers['user-agent'].slice(0, 100).replace(/[^\w\s/\-.();]/g, '')
      : null;
    const result = await authManager.childLogin({ childId, parentId, ip, deviceHint });

    return res.status(200).json({
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || undefined,
        childId: result.childId,
        childFirstName: result.childFirstName,
        isOnboardingComplete: result.isOnboardingComplete,
        refreshAvailable: result.refreshAvailable,
        method: result.method,
        sessionId: result.sessionId,
      },
      meta: { requestId },
    });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /login ─────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const { method } = parsed.data;
    const ip = req.ip;
    const deviceHint = req.headers['user-agent']
      ? req.headers['user-agent'].slice(0, 100).replace(/[^\w\s/\-.();]/g, '')
      : null;

    if (method === 'password') {
      const { childId, password } = parsed.data;

      // Check login attempts before attempting auth
      const attempts = await authManager.incrementLoginAttempts(ip);
      if (attempts > 5) {
        return res.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many login attempts.' },
          meta: { requestId },
        });
      }

      try {
        const result = await authManager.loginWithPassword({ childId, password, ip, deviceHint });
        return res.status(200).json({
          data: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            childId: result.childId,
            childFirstName: result.childFirstName,
            isOnboardingComplete: result.isOnboardingComplete,
            method: result.method,
            sessionId: result.sessionId,
          },
          meta: { requestId },
        });
      } catch (loginErr) {
        // Don't reset attempts on failure — let rate limiter handle it
        throw loginErr;
      }
    }

    if (method === 'magic-link') {
      const { parentEmail, childFirstName } = parsed.data;
      const result = await authManager.loginWithMagicLink({ parentEmail, childFirstName });
      return res.status(200).json({
        data: { magicLinkSent: result.magicLinkSent, parentEmail: result.parentEmail },
        meta: { requestId },
      });
    }
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /logout ─────────────────────────────────────────────────────────────
router.post('/logout', authMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = logoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const { childId, sessionId, token } = req;
    const ip = req.ip;
    const deviceHint = req.headers['user-agent']
      ? req.headers['user-agent'].slice(0, 100).replace(/[^\w\s/\-.();]/g, '')
      : null;

    // Extract refreshToken from body if provided (client may send it for explicit revocation)
    const refreshToken = req.body.refreshToken || null;

    const result = await authManager.logout({
      childId,
      sessionId: sessionId || parsed.data.sessionId,
      accessToken: token,
      refreshToken,
      ip,
      deviceHint,
    });

    return res.status(200).json({
      data: { loggedOut: result.loggedOut },
      meta: { requestId },
    });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /refresh ────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const { refreshToken } = parsed.data;
    const ip = req.ip;
    const deviceHint = req.headers['user-agent']
      ? req.headers['user-agent'].slice(0, 100).replace(/[^\w\s/\-.();]/g, '')
      : null;

    const result = await authManager.refreshSession({ refreshToken, ip, deviceHint });

    return res.status(200).json({
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        childId: result.childId,
        childFirstName: result.childFirstName,
      },
      meta: { requestId },
    });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /me ─────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const result = await authManager.getCurrentUser(req.childId);

    return res.status(200).json({
      data: result,
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