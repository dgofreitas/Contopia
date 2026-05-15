// Contopia — Server Entry Point
import pino from 'pino';
import app from './app.js';
import { connectDB } from './config/database.js';
import redis from './config/redis.js';
import { scheduleGdrpCleanup } from './app/common/gdpr-cleanup.js';

const logger = pino({
  name: 'server',
  level: process.env.LOG_LEVEL || 'info',
});

const PORT = parseInt(process.env.PORT, 10) || 8000;

async function start() {
  // Fail fast if required env vars are missing
  if (!process.env.JWT_SECRET) {
    logger.fatal('JWT_SECRET env var is required — exiting');
    process.exit(1);
  }

  // Connect to MongoDB before accepting requests
  await connectDB();
  logger.info('MongoDB connection established');

  // Redis client is already connecting (fire-and-forget in config)
  logger.info('Redis client initializing');

  app.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        pid: process.pid,
      },
      `Contopia backend listening on port ${PORT}`
    );
  });

  // Start GDPR cleanup scheduler (runs every 24h)
  scheduleGdrpCleanup();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled Rejection — exiting');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await redis.quit();
  logger.info('Redis disconnected');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down gracefully');
  await redis.quit();
  process.exit(0);
});

start();
