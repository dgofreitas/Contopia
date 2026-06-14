// Contopia — PII Audit Tests (STORY-061, Task 2A)
// Verifies no raw PII in log output: email, child names, IP addresses
// NFR-PRV-06: No raw PII in log output
// NFR-OBS-04: Structured logging
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// ── Mock logger to capture all log calls (must use vi.hoisted) ─────────────

const mockLogging = vi.hoisted(() => {
  const logCalls = [];
  const mockLoggerInstance = {
    info: (...args) => { logCalls.push({ level: 'info', args }); },
    error: (...args) => { logCalls.push({ level: 'error', args }); },
    warn: (...args) => { logCalls.push({ level: 'warn', args }); },
  };
  return { logCalls, mockLoggerInstance };
});

// Hoisted mock for auth-manager so tests can reference it
const mockAuthMgr = vi.hoisted(() => ({
  registerParent: vi.fn(),
  parentLogin: vi.fn(),
  parentLogout: vi.fn(),
  parentRefreshSession: vi.fn(),
  getCurrentParent: vi.fn(),
  incrementLoginAttemptsParent: vi.fn(),
  resetLoginAttemptsParent: vi.fn(),
  childLogin: vi.fn(),
}));

const logCalls = mockLogging.logCalls;

vi.mock('pino', () => ({
  default: () => mockLogging.mockLoggerInstance,
}));

vi.mock('../auth-dao.js', () => ({
  findParentByEmail: vi.fn(),
  findParentById: vi.fn(),
  findParentByIdWithPassword: vi.fn(),
  createParent: vi.fn(),
  findChildrenByParentId: vi.fn(),
  updateParentLastLogin: vi.fn(),
  createAuditLog: vi.fn().mockReturnValue({ catch: vi.fn() }),
  hashIdentifier: vi.fn((v) => `hashed:${v}`),
  findChildById: vi.fn(),
  findActiveChildByParentAndName: vi.fn(),
  findPendingChildByParentAndName: vi.fn(),
  createChild: vi.fn(),
  activateChild: vi.fn(),
  findPendingChildByParent: vi.fn(),
  findChildByIdWithPassword: vi.fn(),
  updateChildPassword: vi.fn(),
  softDeleteChildById: vi.fn(),
  hardDeleteChildById: vi.fn(),
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    get: vi.fn(), set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1), exists: vi.fn().mockResolvedValue(0),
    scanIterator: vi.fn(), incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true), ttl: vi.fn().mockResolvedValue(1500),
    quit: vi.fn().mockResolvedValue(undefined), call: vi.fn(), status: 'ready',
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn().mockReturnValue('mock-jwt-token'), verify: vi.fn(), decode: vi.fn() },
  sign: vi.fn().mockReturnValue('mock-jwt-token'), verify: vi.fn(), decode: vi.fn(),
}));

vi.mock('express-rate-limit', () => ({ default: () => (req, res, next) => next() }));
vi.mock('rate-limit-redis', () => ({}));

vi.mock('../auth-manager.js', () => mockAuthMgr);

vi.mock('../../common/auth-middleware.js', () => ({
  authMiddleware: (req, res, next) => {
    req.childId = 'child123'; req.parentId = 'parent123';
    req.sessionId = 'sess_abc'; req.token = 'mock-access-token';
    next();
  },
  parentAuthMiddleware: (req, res, next) => {
    req.parentId = 'parent123'; req.sessionId = 'psess_abc'; req.token = 'mock-parent-token';
    next();
  },
}));

vi.mock('../../parent/parent-dao.js', () => ({ findPendingDeletionByChild: vi.fn() }));

import authRouter, { parentAuthRouter } from '../auth-router.js';
import * as authDao from '../auth-dao.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildAuthApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => { req.id = 'test-request-id'; next(); });
  app.use('/api/auth', authRouter);
  return app;
}

function buildParentApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => { req.id = 'test-request-id'; next(); });
  app.use('/api/parent', parentAuthRouter);
  return app;
}

// ── PII Regex Patterns ──────────────────────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const IP_REGEX = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
const CHILD_NAMES = ['julia', 'joão', 'maria', 'ana', 'pedro', 'lucas'];

function containsRawPii(msg) {
  if (!msg || typeof msg !== 'string') return null;
  if (EMAIL_REGEX.test(msg)) return 'email';
  if (IP_REGEX.test(msg)) return 'ip';
  for (const name of CHILD_NAMES) {
    if (msg.toLowerCase().includes(name)) return 'childName';
  }
  return null;
}

function extractMessage(logEntry) {
  for (const arg of logEntry.args) {
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'object' && arg !== null) {
      const json = JSON.stringify(arg);
      if (json.length > 5) return json;
    }
  }
  return null;
}

function allLogMessages() {
  return logCalls.map((l) => extractMessage(l)).filter(Boolean);
}

describe('PII Audit (STORY-061, NFR-PRV-06 / NFR-OBS-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logCalls.length = 0;
  });

  const validPayload = { email: 'parent@example.com', password: 'StrongPass1', ageConsent: true };

  // ── Registration logs ───────────────────────────────────────────────────

  describe('Register — no PII in logs', () => {
    it('should NOT contain raw email addresses in log entries after register', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createParent.mockResolvedValue({ _id: 'parent123', email: 'parent@example.com' });
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.updateParentLastLogin.mockResolvedValue({ _id: 'parent123', lastLogin: new Date() });

      await request(buildAuthApp()).post('/api/auth/register').send(validPayload);

      const msgs = allLogMessages();
      for (const msg of msgs) {
        expect(containsRawPii(msg)).not.toBe('email');
      }
    });

    it('should NOT contain raw child names in log entries', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createParent.mockResolvedValue({ _id: 'parent123', email: 'parent@example.com' });
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.updateParentLastLogin.mockResolvedValue({ _id: 'parent123', lastLogin: new Date() });

      await request(buildAuthApp()).post('/api/auth/register').send(validPayload);

      const msgs = allLogMessages();
      for (const msg of msgs) {
        expect(containsRawPii(msg)).not.toBe('childName');
      }
    });

    it('should NOT contain raw IP addresses in log entries', async () => {
      // Trigger a login error which logs via handleError
      mockAuthMgr.incrementLoginAttemptsParent.mockResolvedValue(1);
      mockAuthMgr.parentLogin.mockRejectedValue(
        Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' })
      );

      await request(buildParentApp())
        .post('/api/parent/login')
        .send({ email: 'test@example.com', password: 'WrongPass1' });

      const msgs = allLogMessages();
      for (const msg of msgs) {
        expect(containsRawPii(msg)).not.toBe('ip');
      }
    });
  });

  // ── Login/logout — no PII ───────────────────────────────────────────────

  describe('Login/logout — no PII in logs', () => {
    it('should NOT contain raw email addresses in log entries after login failure', async () => {
      mockAuthMgr.incrementLoginAttemptsParent.mockResolvedValue(2);
      mockAuthMgr.parentLogin.mockRejectedValue(
        Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' })
      );

      await request(buildParentApp())
        .post('/api/parent/login')
        .send({ email: 'raw-email-login@test.com', password: 'WrongPass1' });

      const msgs = allLogMessages();
      for (const msg of msgs) {
        expect(containsRawPii(msg)).not.toBe('email');
      }
    });
  });

  // ── Structured logging (NFR-OBS-04) ─────────────────────────────────────

  describe('Structured logging (NFR-OBS-04)', () => {
    it('should use hashed identifiers (parentId) instead of raw emails', async () => {
      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createParent.mockResolvedValue({ _id: 'parent123', email: 'parent@example.com' });
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.updateParentLastLogin.mockResolvedValue({ _id: 'parent123', lastLogin: new Date() });
      mockAuthMgr.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt', parentId: 'parent123',
        email: 'parent@example.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });

      await request(buildAuthApp()).post('/api/auth/register').send(validPayload);

      let hashedIdFound = false;
      for (const entry of logCalls) {
        for (const arg of entry.args) {
          if (typeof arg === 'object' && arg !== null) {
            const json = JSON.stringify(arg);
            if (json.includes('parentId')) {
              hashedIdFound = true;
              expect(json).not.toMatch(EMAIL_REGEX);
            }
          }
        }
      }
      expect(hashedIdFound).toBe(true);
    });

    it('should have log entries with expected fields after register operation', async () => {
      // Perform a register operation which should generate structured log entries
      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createParent.mockResolvedValue({ _id: 'parent123', email: 'parent@example.com' });
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.updateParentLastLogin.mockResolvedValue({ _id: 'parent123', lastLogin: new Date() });
      mockAuthMgr.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt', parentId: 'parent123',
        email: 'parent@example.com', children: [],
        refreshAvailable: true, sessionId: 'psess_1',
      });

      await request(buildAuthApp()).post('/api/auth/register').send(validPayload);

      // Assert that log entries exist and contain expected fields
      expect(logCalls.length).toBeGreaterThan(0);
      const hasRequestId = logCalls.some((entry) =>
        entry.args.some((arg) =>
          typeof arg === 'object' && arg !== null && JSON.stringify(arg).includes('requestId'),
        ),
      );
      expect(hasRequestId).toBe(true);
      const hasParentId = logCalls.some((entry) =>
        entry.args.some((arg) =>
          typeof arg === 'object' && arg !== null && JSON.stringify(arg).includes('parentId'),
        ),
      );
      expect(hasParentId).toBe(true);
    });
  });

  // ── NFR-PRV-06: No raw PII summary ──────────────────────────────────────

  describe('NFR-PRV-06: No raw PII across all operations', () => {
    it('should have zero log entries containing raw PII across register + login', async () => {
      logCalls.length = 0;

      // Register triggers auth-manager.registerParent
      authDao.findParentByEmail.mockResolvedValue(null);
      authDao.createParent.mockResolvedValue({ _id: 'p123', email: 'pii@test.com' });
      authDao.findChildrenByParentId.mockResolvedValue([]);
      authDao.updateParentLastLogin.mockResolvedValue({ _id: 'p123', lastLogin: new Date() });
      mockAuthMgr.registerParent.mockResolvedValue({
        accessToken: 'jwt', refreshToken: 'rt', parentId: 'p123',
        email: 'pii@test.com', children: [], refreshAvailable: true, sessionId: 's1',
      });

      await request(buildAuthApp()).post('/api/auth/register').send(validPayload);

      // Login (parent) failure
      mockAuthMgr.incrementLoginAttemptsParent.mockResolvedValue(3);
      mockAuthMgr.parentLogin.mockRejectedValue(
        Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' })
      );

      await request(buildParentApp())
        .post('/api/parent/login')
        .send({ email: 'raw-pii@test.com', password: 'WrongPass1' });

      const msgs = allLogMessages();
      for (const msg of msgs) {
        if (msg) {
          expect(containsRawPii(msg)).toBeNull();
        }
      }
    });
  });
});
