// Contopia — Readiness Probe Route Handler
import mongoose from 'mongoose';
import redis from '../config/redis.js';
import { s3Client, BUCKET_NAME } from './storage/storage-config.js';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import pino from 'pino';
import { ok } from './common/response-envelope.js';

const logger = pino({ name: 'ready', level: process.env.LOG_LEVEL || 'info' });

/**
 * Check MongoDB connectivity and latency.
 * @returns {Promise<{status: string, latencyMs: number}>}
 */
async function checkMongoDB() {
  const start = Date.now();
  await mongoose.connection.db.admin().command({ ping: 1 });
  return { status: 'ok', latencyMs: Date.now() - start };
}

/**
 * Check Redis connectivity and latency.
 * @returns {Promise<{status: string, latencyMs: number}>}
 */
async function checkRedis() {
  const start = Date.now();
  await redis.ping();
  return { status: 'ok', latencyMs: Date.now() - start };
}

/**
 * Check MinIO/S3 connectivity and latency.
 * @returns {Promise<{status: string, latencyMs: number}>}
 */
async function checkMinIO() {
  const start = Date.now();
  await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  return { status: 'ok', latencyMs: Date.now() - start };
}

/**
 * GET /api/v1/ready — readiness probe.
 * Returns 200 when all dependencies are healthy, 503 otherwise.
 */
export async function readyHandler(_req, res) {
  const checks = {};
  const failures = [];

  const validators = [
    { key: 'mongodb', fn: checkMongoDB },
    { key: 'redis', fn: checkRedis },
    { key: 'minio', fn: checkMinIO },
  ];

  for (const { key, fn } of validators) {
    try {
      checks[key] = await fn();
    } catch (err) {
      logger.error({ err, check: key }, 'Readiness check failed');
      checks[key] = { status: 'error', latencyMs: -1 };
      failures.push(key);
    }
  }

  if (failures.length === 0) {
    return res.status(200).json(ok({
      ready: true,
      timestamp: new Date().toISOString(),
      checks,
    }));
  }

  // Build message listing which checks failed with status
  const failedDetails = failures
    .map((key) => `${key} ${checks[key].status}`)
    .join(', ');

  return res.status(503).json({
    error: {
      code: 'NOT_READY',
      message: `Service is not ready. Check details: ${failedDetails}`,
    },
    data: {
      ready: false,
      timestamp: new Date().toISOString(),
      checks,
    },
  });
}