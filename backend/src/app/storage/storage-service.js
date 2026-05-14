// Contopia — S3/MinIO Storage Service (put, getSignedUrl, delete)
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, BUCKET_NAME } from './storage-config.js';
import pino from 'pino';

const logger = pino({ name: 'storage-service', level: process.env.LOG_LEVEL || 'info' });

/**
 * Upload a buffer to S3/MinIO.
 * @param {string} key — Object key (e.g. users/{childId}/books/{bookId}/assets/{assetId}.png)
 * @param {Buffer} buffer — File data
 * @param {string} mimeType — Content-Type header
 */
export async function putObject(key, buffer, mimeType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3Client.send(command);
  logger.info({ key, size: buffer.length, mimeType }, 'Object uploaded to S3');
}

/**
 * Generate a presigned URL for downloading an object.
 * @param {string} key — Object key
 * @param {number} [expiresInSeconds=3600] — URL TTL
 * @returns {Promise<string>} — Presigned URL
 */
export async function getSignedUrl(key, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseCacheControl: 'public, max-age=31536000, immutable',
  });

  const url = await getSignedUrl(s3Client, command, { expiresInSeconds });
  logger.info({ key, expiresInSeconds }, 'Presigned URL generated');
  return url;
}

/**
 * Delete an object from S3/MinIO.
 * @param {string} key — Object key
 */
export async function deleteObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  logger.info({ key }, 'Object deleted from S3');
}