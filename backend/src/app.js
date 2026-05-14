// Contopia — Express Application Setup
import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';
import authRouter from './app/auth/auth-router.js';
import bookRouter from './app/book/book-router.js';
import chapterRouter from './app/editor/chapter-router.js';
import storageRouter from './app/storage/storage-router.js';
import { authMiddleware, sessionTimeoutMiddleware } from './app/common/auth-middleware.js';
import { rateLimitMiddleware } from './app/common/rate-limit-middleware.js';
import { fail } from './app/common/response-envelope.js';

const logger = pino({
  name: 'app',
  level: process.env.LOG_LEVEL || 'info',
});

const app = express();

// ── Trust Proxy ──────────────────────────────────────────────────────────
// Ensures req.ip reflects the real client IP behind nginx/reverse proxy
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Request ID ────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// ── Request Logging ───────────────────────────────────────────────────────────
app.use(pinoHttp({ logger, reqIdExpr: 'id' }));

// ── Routes ─────────────────────────────────────────────────────────────────────

// Auth routes (handle their own auth/rate-limiting)
app.use('/api/auth', authRouter);

// V1 API routes — auth + per-user rate limiting applied at mount level
app.use('/api/v1', authMiddleware, rateLimitMiddleware);
app.use('/api/v1/books', bookRouter);
app.use('/api/v1/chapters', chapterRouter);
app.use('/api/v1', storageRouter);

// Protected placeholder routes (auth required)
app.use('/api/shelf', authMiddleware);
app.use('/api/shelf', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Sensitive routes: also require sessionTimeoutMiddleware
app.use('/api/settings', authMiddleware, sessionTimeoutMiddleware);
app.use('/api/settings', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global Rate Limiting ──────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests — try again later' },
  })
);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error({
    err,
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
  }, 'Unhandled error');

  res.status(500).json(fail('INTERNAL_ERROR', 'Something went wrong — please try again later', { requestId: req.id }));
});

export default app;
