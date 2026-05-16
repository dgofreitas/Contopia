// Contopia — Rate Limit Middleware Unit Tests (STORY-005)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock('../../../config/redis.js', () => ({
  default: {
    incr: vi.fn(),
    expire: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    call: vi.fn(),
    scanIterator: vi.fn(() => (async function* () {})()),
    status: 'ready',
    on: vi.fn(),
  },
}));

import redis from '../../../config/redis.js';
import { rateLimitMiddleware } from '../rate-limit-middleware.js';

describe('rateLimitMiddleware (STORY-005)', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      id: 'req-123',
      childId: 'child-1',
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('should skip rate limiting when childId is not set', async () => {
    req.childId = undefined;
    await rateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it('should call next when under limit', async () => {
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue('OK');
    await rateLimitMiddleware(req, res, next);
    expect(redis.incr).toHaveBeenCalledWith('rl:child-1');
    expect(redis.expire).toHaveBeenCalledWith('rl:child-1', 60);
    expect(next).toHaveBeenCalledOnce();
  });

  it('should call next when count is within limit', async () => {
    redis.incr.mockResolvedValue(50);
    await rateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 429 when count exceeds limit', async () => {
    redis.incr.mockResolvedValue(101);
    await rateLimitMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it('should set Retry-After header on rate limit', async () => {
    redis.incr.mockResolvedValue(101);
    await rateLimitMiddleware(req, res, next);
    expect(res.set).toHaveBeenCalledWith('Retry-After', '60');
  });

  it('should return RATE_LIMITED error code on 429', async () => {
    redis.incr.mockResolvedValue(101);
    await rateLimitMiddleware(req, res, next);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.error.code).toBe('RATE_LIMITED');
    expect(jsonArg.error.message).toContain('Slow down');
  });

  it('should include requestId in 429 response', async () => {
    redis.incr.mockResolvedValue(101);
    await rateLimitMiddleware(req, res, next);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.meta.requestId).toBe('req-123');
  });

  it('should include traceId in 429 response', async () => {
    redis.incr.mockResolvedValue(101);
    await rateLimitMiddleware(req, res, next);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.error.traceId).toBe('req-123');
  });

  it('should not set expire on subsequent requests (count > 1)', async () => {
    redis.incr.mockResolvedValue(3);
    await rateLimitMiddleware(req, res, next);
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('should fail open on Redis error', async () => {
    redis.incr.mockRejectedValue(new Error('Redis connection refused'));
    await rateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
