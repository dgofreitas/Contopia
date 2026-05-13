// Contopia — Auth Middleware (JWT validation, blacklist check, session extension)
import jwt from 'jsonwebtoken';
import pino from 'pino';
import redis from '../../config/redis.js';
import { hashToken } from '../auth/auth-manager.js';

/**
 * Wrap async Express middleware so rejected promises are forwarded to next(err).
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const logger = pino({ name: 'auth-middleware', level: process.env.LOG_LEVEL || 'info' });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

/**
 * Auth middleware: validate Bearer token, check blacklist, verify session, extend TTL.
 * Attaches req.childId, req.parentId, req.sessionId, req.token.
 * On Redis error: returns 503 (graceful degradation, not 401).
 */
export const authMiddleware = asyncHandler(async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        meta: { requestId: req.id },
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: { code: 'TOKEN_EXPIRED', message: 'Access token has expired' },
          meta: { requestId: req.id },
        });
      }
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid access token' },
        meta: { requestId: req.id },
      });
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN_TYPE', message: 'Token is not an access token' },
        meta: { requestId: req.id },
      });
    }

    const childId = decoded.sub;
    const sessionId = decoded.sid;

    try {
      const tokenHash = hashToken(token);
      const blacklisted = await redis.exists(`bl:${tokenHash}`);
      if (blacklisted === 1) {
        return res.status(401).json({
          error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' },
          meta: { requestId: req.id },
        });
      }

      if (sessionId) {
        const sessionKey = `session:${childId}:${sessionId}`;
        const sessionData = await redis.get(sessionKey);

        if (!sessionData) {
          return res.status(401).json({
            error: { code: 'SESSION_EXPIRED', message: 'Session has expired' },
            meta: { requestId: req.id },
          });
        }

        const session = JSON.parse(sessionData);
        session.lastActivity = new Date().toISOString();
        await redis.set(sessionKey, JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
      }

      req.childId = childId;
      req.parentId = decoded.parentId;
      req.sessionId = sessionId || null;
      req.token = token;

      return next();
    } catch (redisErr) {
      logger.warn({ err: redisErr, childId }, 'Redis unavailable — returning 503');
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Authentication service temporarily unavailable' },
        meta: { requestId: req.id },
      });
    }
  } catch (syncErr) {
    logger.error({ err: syncErr }, 'authMiddleware sync error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
});

/**
 * Session timeout middleware: applied AFTER authMiddleware on sensitive routes.
 * Reads lastActivity from session. Returns 419 if idle > 25min, 401 if idle > 30min.
 */
export const sessionTimeoutMiddleware = asyncHandler(async function sessionTimeoutMiddleware(req, res, next) {
  try {
    const { childId, sessionId } = req;

    if (!childId || !sessionId) {
      return next();
    }

    try {
      const sessionData = await redis.get(`session:${childId}:${sessionId}`);
      if (!sessionData) {
        return res.status(401).json({
          error: { code: 'SESSION_EXPIRED', message: 'Session has expired' },
          meta: { requestId: req.id },
        });
      }

      const session = JSON.parse(sessionData);
      const lastActivity = new Date(session.lastActivity).getTime();
      const idleMs = Date.now() - lastActivity;
      const idleMin = idleMs / 60000;

      if (idleMin > 30) {
        return res.status(401).json({
          error: { code: 'SESSION_EXPIRED', message: 'Session expired due to inactivity' },
          meta: { requestId: req.id },
        });
      }

      if (idleMin > 25) {
        return res.status(419).json({
          error: { code: 'SESSION_TIMEOUT_WARNING', message: 'Session is about to expire due to inactivity' },
          meta: { requestId: req.id },
        });
      }

      return next();
    } catch (redisErr) {
      logger.warn({ err: redisErr, childId }, 'Redis unavailable — session timeout check skipped');
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Authentication service temporarily unavailable' },
        meta: { requestId: req.id },
      });
    }
  } catch (syncErr) {
    logger.error({ err: syncErr }, 'sessionTimeoutMiddleware sync error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
});
