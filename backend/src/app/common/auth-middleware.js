// Contopia — Auth Middleware (JWT validation, blacklist check, session extension)
import jwt from 'jsonwebtoken';
import pino from 'pino';
import redis from '../../config/redis.js';
import { hashToken } from '../auth/auth-manager.js';

const logger = pino({ name: 'auth-middleware', level: process.env.LOG_LEVEL || 'info' });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

/**
 * Auth middleware: validate Bearer token, check blacklist, verify session, extend TTL.
 * Attaches req.childId, req.parentId, req.sessionId, req.token.
 * On Redis error: returns 503 (graceful degradation, not 401).
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      meta: { requestId: req.id },
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  // Verify JWT
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

  // Validate token type
  if (decoded.type !== 'access') {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN_TYPE', message: 'Token is not an access token' },
      meta: { requestId: req.id },
    });
  }

  const childId = decoded.sub;
  const sessionId = decoded.sid;

  // Check Redis blacklist
  const tokenHash = hashToken(token);
  (async () => {
    try {
      const blacklisted = await redis.exists(`bl:${tokenHash}`);
      if (blacklisted === 1) {
        return res.status(401).json({
          error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' },
          meta: { requestId: req.id },
        });
      }

      // Check session exists (if sessionId in token)
      if (sessionId) {
        const sessionKey = `session:${childId}:${sessionId}`;
        const sessionData = await redis.get(sessionKey);

        if (!sessionData) {
          return res.status(401).json({
            error: { code: 'SESSION_EXPIRED', message: 'Session has expired' },
            meta: { requestId: req.id },
          });
        }

        // Reset session TTL and update lastActivity
        const session = JSON.parse(sessionData);
        session.lastActivity = new Date().toISOString();
        await redis.set(sessionKey, JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
      }

      // Attach auth info to request
      req.childId = childId;
      req.parentId = decoded.parentId;
      req.sessionId = sessionId || null;
      req.token = token;

      next();
    } catch (redisErr) {
      logger.warn({ err: redisErr, childId }, 'Redis unavailable — returning 503');
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Authentication service temporarily unavailable' },
        meta: { requestId: req.id },
      });
    }
  })();
}

/**
 * Session timeout middleware: applied AFTER authMiddleware on sensitive routes.
 * Reads lastActivity from session. Returns 419 if idle > 25min, 401 if idle > 30min.
 */
export function sessionTimeoutMiddleware(req, res, next) {
  const { childId, sessionId } = req;

  if (!childId || !sessionId) {
    return next(); // No session to check — skip
  }

  (async () => {
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
      const now = Date.now();
      const idleMs = now - lastActivity;
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

      next();
    } catch (redisErr) {
      logger.warn({ err: redisErr, childId }, 'Redis unavailable — session timeout check skipped');
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Authentication service temporarily unavailable' },
        meta: { requestId: req.id },
      });
    }
  })();
}