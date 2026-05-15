// Contopia — Storage Manager Unit Tests
// Uses vi.mock() without factory + vi.spyOn() to avoid hoisting/TDZ issues.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../file-validator.js');
vi.mock('../exif-stripper.js');
vi.mock('../storage-service.js');
vi.mock('../storage-dao.js');
vi.mock('../../book/book-dao.js');
vi.mock('../../book/book-model.js');
vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import {
  uploadAssetManager,
  getSignedUrlManager,
  purgeAssetsByAuthorManager,
} from '../storage-manager.js';

import * as fileValidator from '../file-validator.js';
import * as exifStripper from '../exif-stripper.js';
import * as storageService from '../storage-service.js';
import * as storageDao from '../storage-dao.js';
import * as bookDao from '../../book/book-dao.js';
import * as bookModel from '../../book/book-model.js';

describe('Storage Manager', () => {
  const childId = new mongoose.Types.ObjectId().toString();
  const bookId = new mongoose.Types.ObjectId().toString();
  const assetId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(fileValidator, 'validateFile').mockReturnValue(undefined);
    vi.spyOn(exifStripper, 'stripExif').mockResolvedValue(Buffer.from('clean'));
    vi.spyOn(storageDao, 'createAssetRecord').mockResolvedValue({ _id: { toString: () => assetId } });
    vi.spyOn(storageDao, 'findAssetRecordById').mockResolvedValue(null);
    vi.spyOn(storageDao, 'findAssetsByAuthor').mockResolvedValue([]);
    vi.spyOn(storageService, 'putObject').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue('https://minio.example.com/presigned');
    vi.spyOn(storageService, 'deleteObject').mockResolvedValue(undefined);
    vi.spyOn(bookDao, 'findBookById').mockResolvedValue(null);
    vi.spyOn(bookDao, 'sumAssetBytesByAuthor').mockResolvedValue(0);
    vi.spyOn(bookModel.Asset, 'updateOne').mockReturnValue({ exec: vi.fn().mockResolvedValue({}) });
    vi.spyOn(bookModel.Asset, 'deleteMany').mockReturnValue({ exec: vi.fn().mockResolvedValue({}) });
  });

  describe('uploadAssetManager', () => {
    it('should upload a valid asset and return assetId, url, expiresAt', async () => {
      vi.spyOn(bookDao, 'findBookById').mockResolvedValue({ _id: bookId, authorId: { toString: () => childId } });

      const result = await uploadAssetManager({
        childId,
        bookId,
        file: { mimetype: 'image/png', size: 100, buffer: Buffer.from('raw') },
      });

      expect(result.assetId).toBe(assetId);
      expect(result.url).toBe('https://minio.example.com/presigned');
      expect(result.expiresAt).toBeDefined();
      expect(fileValidator.validateFile).toHaveBeenCalled();
      expect(exifStripper.stripExif).toHaveBeenCalled();
      expect(storageService.putObject).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND if book does not exist', async () => {
      await expect(uploadAssetManager({ childId, bookId, file: { mimetype: 'image/png', size: 100, buffer: Buffer.from('x') } }))
        .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    it('should throw FORBIDDEN if not book owner', async () => {
      vi.spyOn(bookDao, 'findBookById').mockResolvedValue({ _id: bookId, authorId: { toString: () => 'other' } });
      await expect(uploadAssetManager({ childId, bookId, file: { mimetype: 'image/png', size: 100, buffer: Buffer.from('x') } }))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('should throw ASSET_QUOTA_EXCEEDED if over quota', async () => {
      vi.spyOn(bookDao, 'findBookById').mockResolvedValue({ _id: bookId, authorId: { toString: () => childId } });
      vi.spyOn(bookDao, 'sumAssetBytesByAuthor').mockResolvedValue(524_288_000); // exactly at limit
      await expect(uploadAssetManager({ childId, bookId, file: { mimetype: 'image/png', size: 100, buffer: Buffer.from('x') } }))
        .rejects.toMatchObject({ status: 403, code: 'ASSET_QUOTA_EXCEEDED' });
    });
  });

  describe('getSignedUrlManager', () => {
    it('should return presigned URL for owner', async () => {
      vi.spyOn(storageDao, 'findAssetRecordById').mockResolvedValue({
        _id: assetId,
        authorId: { toString: () => childId },
        url: 'users/1/books/2/assets/3.png',
      });

      const result = await getSignedUrlManager({ childId, assetId });
      expect(result.url).toBe('https://minio.example.com/presigned');
      expect(result.expiresAt).toBeDefined();
    });

    it('should throw NOT_FOUND if asset missing', async () => {
      await expect(getSignedUrlManager({ childId, assetId }))
        .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    it('should throw FORBIDDEN if not owner', async () => {
      vi.spyOn(storageDao, 'findAssetRecordById').mockResolvedValue({ _id: assetId, authorId: { toString: () => 'other' }, url: 'x' });
      await expect(getSignedUrlManager({ childId, assetId }))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });
  });

  describe('purgeAssetsByAuthorManager', () => {
    it('should delete S3 objects and hard-delete records', async () => {
      vi.spyOn(storageDao, 'findAssetsByAuthor').mockResolvedValue([
        { _id: assetId, url: 'users/1/books/2/assets/3.png' },
      ]);

      await purgeAssetsByAuthorManager(childId);
      expect(storageService.deleteObject).toHaveBeenCalledWith('users/1/books/2/assets/3.png');
      expect(bookModel.Asset.deleteMany).toHaveBeenCalled();
    });

    it('should continue if S3 delete fails', async () => {
      vi.spyOn(storageDao, 'findAssetsByAuthor').mockResolvedValue([
        { _id: assetId, url: 'users/1/books/2/assets/3.png' },
      ]);
      vi.spyOn(storageService, 'deleteObject').mockRejectedValue(new Error('S3 fail'));

      await expect(purgeAssetsByAuthorManager(childId)).resolves.toBeUndefined();
      expect(bookModel.Asset.deleteMany).toHaveBeenCalled();
    });
  });
});
