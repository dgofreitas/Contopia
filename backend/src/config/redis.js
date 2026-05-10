// Contopia — Redis Client Configuration
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({
  name: 'redis',
  level: process.env.LOG_LEVEL || 'info',
});

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const client = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) {
      logger.fatal('Redis retry limit exceeded — giving up');
      return null; // stop retrying
    }
    const delay = Math.min(times * 200, 2000);
    logger.warn({ attempt: times, delayMs: delay }, 'Redis connection retry');
    return delay;
  },
});

client.on('connect', () => {
  logger.info({ url: REDIS_URL.replace(/:\/\/.*@/, '://***@') }, 'Redis connected');
});

client.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});

export default client;
