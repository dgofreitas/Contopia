// Contopia — Auth HTTP Routes
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import redis from '../../config/redis.js';
import { childSessionSchema, loginSchema, logoutSchema, refreshSchema, parentLoginSchema, parentRegisterSchema, parentRefreshSchema } from '../common/validation-schemas.js';
import { authMiddleware, parentAuthMiddleware } from '../common/auth-middleware.js';
import * as authManager from './auth-manager.js';
import { ok, fail } from '../common/response-envelope.js';

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

function createLimiter({ windowMs, max, message: _message, keyGenerator }) {
  const opts = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip),
    handler: (req, res) => {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      res.status(429).json(fail('RATE_LIMITED', 'Too many attempts. Please try again later.', { requestId: req.id }));
    },
  };

  if (RateLimitStore && redis?.status === 'ready') {
    opts.store = new RateLimitStore({
      sendCommand: (...args) => redis.call(...args),
    });
  }

  return rateLimit(opts);
}

const registerParentLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many registration attempts.',
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `${req.ip}:${email.slice(0, 3)}`;
  },
});

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts.',
});

const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many refresh attempts.',
});

const parentLoginLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many parent login attempts.',
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeUserAgent(req) {
  return req.headers['user-agent']
    ? req.headers['user-agent'].slice(0, 100).replace(/[^\w\s/\-.();]/g, '')
    : null;
}

// ── POST /register ───────────────────────────────────────────────────────────
router.post('/register', registerParentLimiter, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = parentRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const { email, password, ageConsent } = parsed.data;
    const ip = req.ip;
    const deviceHint = sanitizeUserAgent(req);

    const result = await authManager.registerParent({ email, password, ageConsent, ip, deviceHint });

    // Set refresh token as httpOnly cookie (same as login)
    res.cookie('parentRefreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/parent',
    });

    logger.info({ parentId: result.parentId, requestId }, 'Parent registered and auto-logged in');

    return res.status(201).json(ok({
      accessToken: result.accessToken,
      parentId: result.parentId,
      email: result.email,
      children: result.children,
    }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /child-session ──────────────────────────────────────────────────────
// STORY-059: Parent-initiated child session. Parent must be authenticated.
// Body: { childId?: string } — optional, defaults to first active child.
router.post('/child-session', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = childSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const { childId } = parsed.data;
    const parentId = req.parentId;
    const ip = req.ip;
    const deviceHint = sanitizeUserAgent(req);

    const result = await authManager.createChildSession({ parentId, childId, ip, deviceHint });

    return res.status(200).json(ok({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      childId: result.child.childId,
      childFirstName: result.child.childFirstName,
      isOnboardingComplete: result.child.isOnboardingComplete,
      sessionId: result.sessionId,
    }, { requestId }));
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
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const { method } = parsed.data;
    const ip = req.ip;
    const deviceHint = sanitizeUserAgent(req);

    if (method === 'password') {
      const { childId, password } = parsed.data;

      // Check login attempts before attempting auth
      const attempts = await authManager.incrementLoginAttempts(ip);
      if (attempts > 5) {
        return res.status(429).json(fail('RATE_LIMITED', 'Too many login attempts.', { requestId }));
      }

      // Don't reset attempts on failure — let rate limiter handle it
      const result = await authManager.loginWithPassword({ childId, password, ip, deviceHint });
      return res.status(200).json(ok({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        childId: result.childId,
        childFirstName: result.childFirstName,
        isOnboardingComplete: result.isOnboardingComplete,
        method: result.method,
        sessionId: result.sessionId,
      }, { requestId }));
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
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const { childId, sessionId, token } = req;
    const ip = req.ip;
    const deviceHint = sanitizeUserAgent(req);

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

    return res.status(200).json(ok({ loggedOut: result.loggedOut }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /refresh ────────────────────────────────────────────────────────────
router.post('/refresh', refreshLimiter, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const { refreshToken } = parsed.data;
    const ip = req.ip;
    const deviceHint = sanitizeUserAgent(req);

    const result = await authManager.refreshSession({ refreshToken, ip, deviceHint });

    return res.status(200).json(ok({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      childId: result.childId,
      childFirstName: result.childFirstName,
    }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /me ─────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const result = await authManager.getCurrentUser(req.childId);

    return res.status(200).json(ok(result, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── DELETE /account ───────────────────────────────────────────────────────────
router.delete('/account', authMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const _result = await authManager.deleteAccountManager({ childId: req.childId });

    return res.status(200).json(ok({ deleted: true }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── Parent Auth Routes (exported as separate router) ──────────────────────────

const parentAuthRouter = Router();

// ── POST /login ──────────────────────────────────────────────────────────────
parentAuthRouter.post('/login', parentLoginLimiter, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = parentLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const { email, password } = parsed.data;
    const ip = req.ip;
    const deviceHint = sanitizeUserAgent(req);

    // Check parent login attempts
    const attempts = await authManager.incrementLoginAttemptsParent(ip);
    if (attempts > 10) {
      return res.status(429).json(fail('RATE_LIMITED', 'Too many login attempts.', { requestId }));
    }

    const result = await authManager.parentLogin({ email, password, ip, deviceHint });

    // Reset parent login attempts on success
    if (ip) await authManager.resetLoginAttemptsParent(ip);

    // Set refresh token as httpOnly cookie
    res.cookie('parentRefreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/parent',
    });

    return res.status(200).json(ok({
      accessToken: result.accessToken,
      parentId: result.parentId,
      email: result.email,
      children: result.children,
    }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /logout ──────────────────────────────────────────────────────────────
parentAuthRouter.post('/logout', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const { parentId, sessionId, token } = req;
    const ip = req.ip;
    const deviceHint = sanitizeUserAgent(req);
    const refreshToken = req.cookies?.parentRefreshToken || null;

    const result = await authManager.parentLogout({
      parentId,
      sessionId: sessionId || 'none',
      accessToken: token,
      refreshToken,
      ip,
      deviceHint,
    });

    // Clear refresh token cookie with full security flags and Max-Age=0
    res.cookie('parentRefreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/api/parent',
    });

    return res.status(200).json(ok({ loggedOut: result.loggedOut }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /refresh ─────────────────────────────────────────────────────────────
parentAuthRouter.post('/refresh', async (req, res) => {
  const requestId = req.id;

  try {
    const refreshToken = req.cookies?.parentRefreshToken;
    if (!refreshToken) {
      return res.status(401).json(fail('UNAUTHORIZED', 'No refresh token provided', { requestId }));
    }

    const parsed = parentRefreshSchema.safeParse({ refreshToken });
    if (!parsed.success) {
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const ip = req.ip;
    const deviceHint = sanitizeUserAgent(req);

    const result = await authManager.parentRefreshSession({ refreshToken, ip, deviceHint });

    // Set new refresh token as httpOnly cookie
    res.cookie('parentRefreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/parent',
    });

    return res.status(200).json(ok({
      accessToken: result.accessToken,
      parentId: result.parentId,
    }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /me ──────────────────────────────────────────────────────────────────
parentAuthRouter.get('/me', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const result = await authManager.getCurrentParent(req.parentId);

    return res.status(200).json(ok(result, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── Error Handler ───────────────────────────────────────────────────────────
function handleError(err, req, res) {
  const requestId = req.id;
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';

  // Never leak stack traces in production
  if (status >= 500) {
    logger.error({ err, requestId }, 'Unhandled auth error');
    message = 'Something went wrong — please try again later';
  }

  return res.status(status).json(fail(code, message, { requestId }, requestId));
}

export default router;
export { parentAuthRouter };