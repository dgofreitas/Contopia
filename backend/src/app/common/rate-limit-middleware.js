// Contopia — Per-User Rate Limit Middleware (Redis sliding window)
import redis from '../../config/redis.js';
import pino from 'pino';
import { fail } from './response-envelope.js';
import { getErrorMessage } from './error-codes.js';

const logger = pino({ name: 'rate-limit', level: process.env.LOG_LEVEL || 'info' });

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

/**
 * Per-user rate limiting using Redis INCR + EXPIRE (sliding window).
 * Key: rl:{childId}, TTL: 60s, Limit: 100 req/min.
 * Fail-open: on Redis error, log warning and allow request.
 * Skip: if req.childId is not set (unauthenticated routes).
 */
export async function rateLimitMiddleware(req, res, next) {
  if (!req.childId) return next();

  const key = `rl:${req.childId}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    if (count > MAX_REQUESTS) {
      res.set('Retry-After', String(WINDOW_SECONDS));
      return res.status(429).json(fail('RATE_LIMITED', getErrorMessage('RATE_LIMITED'), { requestId: req.id }, req.id));
    }
    next();
  } catch (err) {
    logger.warn({ err }, 'Rate limit Redis error — allowing request');
    next(); // Fail open
  }
}