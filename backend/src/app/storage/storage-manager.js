// Contopia — Storage Business Logic Manager
import pino from 'pino';
import mongoose from 'mongoose';
import { validateFile } from './file-validator.js';
import { stripExif } from './exif-stripper.js';
import * as storageService from './storage-service.js';
import * as storageDao from './storage-dao.js';
import { sumAssetBytesByAuthor, findBookById } from '../book/book-dao.js';
import { Asset } from '../book/book-model.js';

const logger = pino({ name: 'storage-manager', level: process.env.LOG_LEVEL || 'info' });

const ASSET_QUOTA_BYTES = 524_288_000; // 500MB

const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Upload an asset: validate → strip EXIF → store to S3 → save metadata → return presigned URL.
 * @param {{ childId: string, bookId: string, file: { mimetype: string, size: number, buffer: Buffer } }} params
 * @returns {{ assetId: string, url: string, expiresAt: string }}
 */
export async function uploadAssetManager({ childId, bookId, file }) {
  // 1. Validate file
  validateFile(file);

  // 2. Check book ownership
  const book = await findBookById(bookId);
  if (!book) {
    const err = new Error("We couldn't find that book");
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (book.authorId.toString() !== childId.toString()) {
    const err = new Error("You don't have permission to see this.");
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // 3. Check storage quota
  const currentBytes = await sumAssetBytesByAuthor(childId);
  if (currentBytes + file.size > ASSET_QUOTA_BYTES) {
    const err = new Error('You have reached your storage limit');
    err.status = 403;
    err.code = 'ASSET_QUOTA_EXCEEDED';
    throw err;
  }

  // 4. Strip EXIF
  const cleanBuffer = await stripExif(file.buffer);

  // 5. Path traversal defense (defense-in-depth since router validates ObjectIds)
  const SAFE_ID_REGEX = /^[a-f\d]{24}$/i;
  if (!SAFE_ID_REGEX.test(childId) || !SAFE_ID_REGEX.test(bookId)) {
    const err = new Error('Invalid identifier');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // 6. Determine storage path using a temp asset ID (do NOT create DB record yet)
  const ext = MIME_TO_EXT[file.mimetype] || 'bin';
  const tempAssetId = new mongoose.Types.ObjectId();
  const storagePath = `users/${childId}/books/${bookId}/assets/${tempAssetId}.${ext}`;

  // 7. Upload to S3/MinIO FIRST
  await storageService.putObject(storagePath, cleanBuffer, file.mimetype);

  // 8. Only after successful S3 upload, create the asset record with the storage path
  const assetRecord = await storageDao.createAssetRecord({
    bookId,
    authorId: childId,
    url: storagePath,
    type: 'upload',
    mimeType: file.mimetype,
    sizeBytes: cleanBuffer.length,
  });

  // 9. Generate presigned URL
  const url = await storageService.getSignedUrl(storagePath);
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  logger.info({ assetId: assetRecord._id, childId, bookId }, 'Asset uploaded');

  return {
    assetId: assetRecord._id.toString(),
    url,
    expiresAt,
  };
}

/**
 * Get a presigned URL for downloading an asset (with ownership check).
 * @param {{ childId: string, assetId: string }} params
 * @returns {{ url: string, expiresAt: string }}
 */
export async function getSignedUrlManager({ childId, assetId }) {
  const asset = await storageDao.findAssetRecordById(assetId);
  if (!asset) {
    const err = new Error("We couldn't find that picture.");
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (asset.authorId.toString() !== childId.toString()) {
    const err = new Error("You don't have permission to see this.");
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const url = await storageService.getSignedUrl(asset.url);
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  logger.info({ assetId, childId }, 'Presigned URL generated');

  return { url, expiresAt };
}

/**
 * Purge all assets for an author (account deletion).
 * Deletes objects from S3/MinIO and hard-deletes asset records (GDPR).
 * @param {string} authorId — Author/owner ID
 */
export async function purgeAssetsByAuthorManager(authorId) {
  const assets = await storageDao.findAssetsByAuthor(authorId);

  // Delete each object from S3/MinIO (best-effort)
  for (const asset of assets) {
    try {
      await storageService.deleteObject(asset.url);
    } catch (err) {
      logger.warn({ err, key: asset.url }, 'Failed to delete S3 object during purge — continuing');
    }
  }

  // Hard-delete ALL asset records for this author (including soft-deleted)
  // findAssetsByAuthor only returns active ones, so we use Asset.deleteMany directly
  await Asset.deleteMany({ authorId: new mongoose.Types.ObjectId(authorId) }).exec();

  logger.info({ authorId, count: assets.length }, 'Assets purged for author');
}