// Contopia — Auth DAO PII Hashing Tests (STORY-060)
// Tests hashIdentifier and createAuditLog PII-safe logging
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../auth-model.js', () => ({
  Parent: { findOne: vi.fn(), findById: vi.fn(), findByIdAndUpdate: vi.fn(), create: vi.fn() },
  Child: { findById: vi.fn(), findOne: vi.fn(), find: vi.fn(), create: vi.fn(), findByIdAndUpdate: vi.fn(), findByIdAndDelete: vi.fn() },
  SessionAuditLog: { create: vi.fn().mockResolvedValue({ _id: 'log123' }) },
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import * as authDao from '../auth-dao.js';
import { SessionAuditLog } from '../auth-model.js';

describe('Auth DAO — PII Hashing (STORY-060)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── hashIdentifier ────────────────────────────────────────────────────────

  describe('hashIdentifier', () => {
    it('should return first 8 chars of SHA-256 hex for a string', () => {
      const result = authDao.hashIdentifier('parent123');
      // SHA-256 of 'parent123' starts with known prefix
      expect(result).toHaveLength(8);
      expect(result).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should return consistent hash for same input', () => {
      const a = authDao.hashIdentifier('test@example.com');
      const b = authDao.hashIdentifier('test@example.com');
      expect(a).toBe(b);
    });

    it('should return different hash for different inputs', () => {
      const a = authDao.hashIdentifier('parent123');
      const b = authDao.hashIdentifier('parent456');
      expect(a).not.toBe(b);
    });

    it('should handle numeric input', () => {
      const result = authDao.hashIdentifier(12345);
      expect(result).toHaveLength(8);
      expect(result).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  // ── createAuditLog with PII hashing ──────────────────────────────────────

  describe('createAuditLog — PII hashing', () => {
    it('should create audit log entry with raw values in MongoDB', async () => {
      await authDao.createAuditLog({
        parentId: 'parent123',
        sessionId: 'psess_abc',
        event: 'SESSION_CREATED',
        ip: '192.168.1.1',
        deviceHint: 'Mozilla/5.0',
      });

      expect(SessionAuditLog.create).toHaveBeenCalledWith({
        parentId: 'parent123',
        sessionId: 'psess_abc',
        event: 'SESSION_CREATED',
        ip: '192.168.1.1',
        deviceHint: 'Mozilla/5.0',
      });
    });

    it('should include reason field when provided', async () => {
      await authDao.createAuditLog({
        parentId: 'parent123',
        sessionId: 'psess_abc',
        event: 'SESSION_EXPIRED',
        ip: '192.168.1.1',
        reason: 'idle_timeout',
      });

      expect(SessionAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'idle_timeout' })
      );
    });

    it('should handle childId audit logs', async () => {
      await authDao.createAuditLog({
        childId: 'child456',
        sessionId: 'sess_xyz',
        event: 'SESSION_CREATED',
        ip: '10.0.0.1',
      });

      expect(SessionAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: 'child456',
          sessionId: 'sess_xyz',
          event: 'SESSION_CREATED',
        })
      );
    });

    it('should handle missing optional fields gracefully', async () => {
      await authDao.createAuditLog({
        sessionId: 'sess_1',
        event: 'SESSION_CREATED',
      });

      expect(SessionAuditLog.create).toHaveBeenCalledWith({
        sessionId: 'sess_1',
        event: 'SESSION_CREATED',
      });
    });
  });
});
