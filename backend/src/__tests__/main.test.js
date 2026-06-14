// Contopia — Main Entry Point Tests (STORY-060)
// Tests cookie security startup validation
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to create the mock logger before vi.mock runs
const { mockLogger } = vi.hoisted(() => {
  return {
    mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn() },
  };
});

vi.mock('pino', () => ({
  default: vi.fn(() => mockLogger),
}));

vi.mock('../app.js', () => ({
  default: { listen: vi.fn() },
}));

vi.mock('../config/database.js', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../config/redis.js', () => ({
  default: { quit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../app/common/gdpr-cleanup.js', () => ({
  scheduleGdrpCleanup: vi.fn(),
}));

describe('main.js — Cookie Security Startup Validation (STORY-060)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should warn when COOKIE_SECURE is false in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SECURE = 'false';
    process.env.JWT_SECRET = 'test-secret';

    await import('../main.js');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Cookie secure flag is false in production — this is a security risk'
    );
  });

  it('should not warn when COOKIE_SECURE is not set in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.COOKIE_SECURE;
    process.env.JWT_SECRET = 'test-secret';

    await import('../main.js');

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should not warn in development even if COOKIE_SECURE is false', async () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SECURE = 'false';
    process.env.JWT_SECRET = 'test-secret';

    await import('../main.js');

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
