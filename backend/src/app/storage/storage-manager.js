// Contopia — Storage Business Logic Manager
import pino from 'pino';
import mongoose from 'mongoose';
import { validateFile } from './file-validator.js';
import { stripExif } from './exif-stripper.js';
import { generateThumbnail, generateCoverSize } from './image-processor.js';
import { extractDominantColor } from './color-extractor.js';
import * as storageService from './storage-service.js';
import * as storageDao from './storage-dao.js';
import { sumAssetBytesByAuthor, findBookById, updateBookById } from '../book/book-dao.js';
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
 * When type='cover', also generates thumbnail + cover-size variants and extracts dominant color.
 * @param {{ childId: string, bookId: string, file: { mimetype: string, size: number, buffer: Buffer }, type?: string }} params
 * @returns {{ assetId: string, url: string, expiresAt: string, thumbnailUrl?: string, dominantColor?: string }}
 */
export async function uploadAssetManager({ childId, bookId, file, type = 'upload' }) {
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

  // ── Cover image processing pipeline ──────────────────────────────────────
  if (type === 'cover') {
    return uploadCoverAsset({ childId, bookId, cleanBuffer, file, book });
  }

  // ── Default upload flow (unchanged from STORY-006) ───────────────────────
  const ext = MIME_TO_EXT[file.mimetype] || 'bin';
  const tempAssetId = new mongoose.Types.ObjectId();
  const storagePath = `users/${childId}/books/${bookId}/assets/${tempAssetId}.${ext}`;

  await storageService.putObject(storagePath, cleanBuffer, file.mimetype);

  const assetRecord = await storageDao.createAssetRecord({
    bookId,
    authorId: childId,
    url: storagePath,
    type: 'upload',
    mimeType: file.mimetype,
    sizeBytes: cleanBuffer.length,
  });

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
 * Cover upload pipeline: generate thumbnail + cover-size, extract dominant color,
 * upload both to S3, create two Asset records, link Book.coverAssetId.
 * @param {{ childId: string, bookId: string, cleanBuffer: Buffer, file: object, book: object }} params
 * @returns {{ assetId: string, thumbnailUrl: string, fullUrl: string, dominantColor: string, expiresAt: string }}
 */
async function uploadCoverAsset({ childId, bookId, cleanBuffer, file, book: _book }) {
  const ext = MIME_TO_EXT[file.mimetype] || 'jpg';

  // 6a. Generate thumbnail (300x450) and cover-size (600x900) in parallel
  const [thumbnailResult, coverResult, dominantColor] = await Promise.all([
    generateThumbnail(cleanBuffer),
    generateCoverSize(cleanBuffer),
    extractDominantColor(cleanBuffer),
  ]);

  // 6b. Generate S3 paths
  const tempAssetId = new mongoose.Types.ObjectId();
  const tempThumbnailId = new mongoose.Types.ObjectId();
  const coverStoragePath = `users/${childId}/books/${bookId}/covers/${tempAssetId}.${ext}`;
  const thumbnailStoragePath = `users/${childId}/books/${bookId}/covers/${tempThumbnailId}_thumb.${ext}`;

  // 6c. Upload both to S3 in parallel
  const coverMime = 'image/jpeg'; // sharp outputs JPEG after processing
  await Promise.all([
    storageService.putObject(coverStoragePath, coverResult.buffer, coverMime),
    storageService.putObject(thumbnailStoragePath, thumbnailResult.buffer, coverMime),
  ]);

  // 6d. Create Asset records in parallel
  const [coverAsset, thumbnailAsset] = await Promise.all([
    storageDao.createAssetRecord({
      bookId,
      authorId: childId,
      url: coverStoragePath,
      type: 'cover',
      mimeType: coverMime,
      sizeBytes: coverResult.buffer.length,
      dominantColor,
      width: coverResult.width,
      height: coverResult.height,
    }),
    storageDao.createAssetRecord({
      bookId,
      authorId: childId,
      url: thumbnailStoragePath,
      type: 'cover_thumbnail',
      mimeType: coverMime,
      sizeBytes: thumbnailResult.buffer.length,
      dominantColor,
      width: thumbnailResult.width,
      height: thumbnailResult.height,
    }),
  ]);

  // 6e. Update Book.coverAssetId with the full-size asset ID
  await updateBookById(bookId, { coverAssetId: coverAsset._id });

  // 6f. Generate presigned URLs
  const [fullUrl, thumbnailUrl] = await Promise.all([
    storageService.getSignedUrl(coverStoragePath),
    storageService.getSignedUrl(thumbnailStoragePath),
  ]);
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  logger.info({ assetId: coverAsset._id, thumbnailId: thumbnailAsset._id, childId, bookId, dominantColor }, 'Cover asset uploaded');

  return {
    assetId: coverAsset._id.toString(),
    thumbnailAssetId: thumbnailAsset._id.toString(),
    thumbnailUrl,
    fullUrl,
    dominantColor,
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