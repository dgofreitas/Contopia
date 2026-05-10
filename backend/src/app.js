// Contopia — Express Application Setup
import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';
import authRouter from './app/auth/auth-router.js';

const logger = pino({
  name: 'app',
  level: process.env.LOG_LEVEL || 'info',
});

const app = express();

// ── Trust Proxy ──────────────────────────────────────────────────────────
// Ensures req.ip reflects the real client IP behind nginx/reverse proxy
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);

// ── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());

// ── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Request ID ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// ── Request Logging ───────────────────────────────────────────────────────
app.use(pinoHttp({ logger, reqIdExpr: 'id' }));

// ── Auth Routes (before global rate limit — have own stricter limiters) ────
app.use('/api/auth', authRouter);

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

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error({
    err,
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
  }, 'Unhandled error');

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id,
  });
});

export default app;
