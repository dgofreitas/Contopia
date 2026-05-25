// Contopia — Storage Manager Tests (STORY-027)
// Tests for uploadAssetManager with type='cover' (cover upload flow)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// Mock sharp
const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  toBuffer: vi.fn(),
  stats: vi.fn(),
  metadata: vi.fn(),
  rotate: vi.fn().mockReturnThis(),
  withMetadata: vi.fn().mockReturnThis(),
};
vi.mock('sharp', () => ({
  default: vi.fn(() => mockSharpInstance),
}));

// Mongoose mock for ObjectId
vi.mock('mongoose', () => ({
  default: {
    Types: {
      ObjectId: vi.fn(() => ({
        toString: () => 'mocked-object-id',
      })),
    },
  },
  Types: {
    ObjectId: vi.fn(() => ({
      toString: () => 'mocked-object-id',
    })),
  },
}));

// Mock file-validator
vi.mock('../app/storage/file-validator.js', () => ({
  validateFile: vi.fn(),
}));

// Mock exif-stripper
vi.mock('../app/storage/exif-stripper.js', () => ({
  stripExif: vi.fn((buf) => Promise.resolve(buf)),
}));

// Mock storage-service
vi.mock('../app/storage/storage-service.js', () => ({
  putObject: vi.fn(),
  getSignedUrl: vi.fn(() => Promise.resolve('https://s3.example.com/signed-url')),
  deleteObject: vi.fn(),
}));

// Mock storage-dao
vi.mock('../app/storage/storage-dao.js', () => ({
  createAssetRecord: vi.fn((data) => Promise.resolve({
    _id: { toString: () => 'asset-' + (data.type || 'unknown') },
    ...data,
  })),
  findAssetRecordById: vi.fn(),
  findAssetsByAuthor: vi.fn(),
}));

// Mock book-dao
vi.mock('../app/book/book-dao.js', () => ({
  findBookById: vi.fn(),
  updateBookById: vi.fn(),
  sumAssetBytesByAuthor: vi.fn(() => Promise.resolve(0)),
}));

import { uploadAssetManager, getSignedUrlManager } from '../app/storage/storage-manager.js';
import { validateFile } from '../app/storage/file-validator.js';
import { stripExif } from '../app/storage/exif-stripper.js';
import * as storageService from '../app/storage/storage-service.js';
import * as storageDao from '../app/storage/storage-dao.js';
import * as bookDao from '../app/book/book-dao.js';

describe('storage-manager — cover upload flow', () => {
  const mockCoverBuffer = Buffer.from('processed-cover');
  const mockThumbBuffer = Buffer.from('processed-thumb');

  const baseParams = {
    childId: '507f1f77bcf86cd799439011',
    bookId: '507f1f77bcf86cd799439012',
    file: {
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('original-image-data'),
    },
    type: 'cover',
  };

  const mockBook = {
    _id: { toString: () => '507f1f77bcf86cd799439012' },
    authorId: { toString: () => '507f1f77bcf86cd799439011' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    validateFile.mockReturnValue(true);
    stripExif.mockImplementation((buf) => Promise.resolve(buf));

    // sharp instance mocks for image-processor + color-extractor
    mockSharpInstance.toBuffer
      .mockResolvedValueOnce({ data: mockThumbBuffer, info: { width: 300, height: 450, format: 'jpeg' } })
      .mockResolvedValueOnce({ data: mockCoverBuffer, info: { width: 600, height: 900, format: 'jpeg' } });
    mockSharpInstance.stats.mockResolvedValue({
      channels: [{ mean: 74 }, { mean: 155 }, { mean: 110 }],
    });

    bookDao.findBookById.mockResolvedValue(mockBook);
    bookDao.sumAssetBytesByAuthor.mockResolvedValue(0);
    storageDao.createAssetRecord.mockImplementation((data) =>
      Promise.resolve({
        _id: { toString: () => 'asset-' + (data.type || 'unknown') },
        ...data,
      })
    );
    storageService.getSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');
    storageService.putObject.mockResolvedValue();
  });

  describe('uploadAssetManager with type=cover', () => {
    it('should validate file on cover upload', async () => {
      await uploadAssetManager(baseParams);
      expect(validateFile).toHaveBeenCalledWith(baseParams.file);
    });

    it('should check book ownership', async () => {
      await uploadAssetManager(baseParams);
      expect(bookDao.findBookById).toHaveBeenCalledWith(baseParams.bookId);
    });

    it('should throw 403 when child does not own the book', async () => {
      bookDao.findBookById.mockResolvedValue({
        ...mockBook,
        authorId: { toString: () => 'different-author-id' },
      });

      await expect(uploadAssetManager(baseParams)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should throw 404 when book not found', async () => {
      bookDao.findBookById.mockResolvedValue(null);

      await expect(uploadAssetManager(baseParams)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should check storage quota', async () => {
      await uploadAssetManager(baseParams);
      expect(bookDao.sumAssetBytesByAuthor).toHaveBeenCalledWith(baseParams.childId);
    });

    it('should throw 403 when quota exceeded', async () => {
      bookDao.sumAssetBytesByAuthor.mockResolvedValue(524_288_000); // already at quota

      await expect(uploadAssetManager(baseParams)).rejects.toMatchObject({
        status: 403,
        code: 'ASSET_QUOTA_EXCEEDED',
      });
    });

    it('should strip EXIF from uploaded buffer', async () => {
      await uploadAssetManager(baseParams);
      expect(stripExif).toHaveBeenCalledWith(baseParams.file.buffer);
    });

    it('should generate thumbnail and cover-size in parallel', async () => {
      await uploadAssetManager(baseParams);
      // toBuffer called twice: once for thumbnail, once for cover-size
      expect(mockSharpInstance.toBuffer).toHaveBeenCalledTimes(2);
    });

    it('should extract dominant color', async () => {
      await uploadAssetManager(baseParams);
      expect(mockSharpInstance.stats).toHaveBeenCalledTimes(1);
    });

    it('should upload both variants to S3', async () => {
      await uploadAssetManager(baseParams);
      expect(storageService.putObject).toHaveBeenCalledTimes(2);
    });

    it('should create two asset records (cover + thumbnail)', async () => {
      await uploadAssetManager(baseParams);
      expect(storageDao.createAssetRecord).toHaveBeenCalledTimes(2);
      const calls = storageDao.createAssetRecord.mock.calls;
      expect(calls[0][0].type).toBe('cover');
      expect(calls[1][0].type).toBe('cover_thumbnail');
    });

    it('should update book coverAssetId', async () => {
      await uploadAssetManager(baseParams);
      expect(bookDao.updateBookById).toHaveBeenCalledWith(
        baseParams.bookId,
        expect.objectContaining({ coverAssetId: expect.any(String) })
      );
    });

    it('should generate presigned URLs', async () => {
      await uploadAssetManager(baseParams);
      expect(storageService.getSignedUrl).toHaveBeenCalledTimes(2);
    });

    it('should return complete cover response', async () => {
      const result = await uploadAssetManager(baseParams);
      expect(result).toMatchObject({
        assetId: expect.any(String),
        thumbnailAssetId: expect.any(String),
        thumbnailUrl: expect.any(String),
        fullUrl: expect.any(String),
        dominantColor: expect.any(String),
        expiresAt: expect.any(String),
      });
    });

    it('should return dominantColor hex', async () => {
      const result = await uploadAssetManager(baseParams);
      expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('uploadAssetManager without type=cover (default upload)', () => {
    it('should return basic asset response without thumbnail or dominantColor', async () => {
      const params = { ...baseParams, type: 'upload' };
      const result = await uploadAssetManager(params);
      expect(result).toMatchObject({
        assetId: expect.any(String),
        url: expect.any(String),
        expiresAt: expect.any(String),
      });
      expect(result.thumbnailUrl).toBeUndefined();
      expect(result.dominantColor).toBeUndefined();
    });
  });

  describe('getSignedUrlManager', () => {
    it('should return signed URL for owned asset', async () => {
      storageDao.findAssetRecordById.mockResolvedValue({
        url: 'users/child/books/book/assets/asset.jpg',
        authorId: { toString: () => '507f1f77bcf86cd799439011' },
      });

      const result = await getSignedUrlManager({
        childId: '507f1f77bcf86cd799439011',
        assetId: '507f1f77bcf86cd799439013',
      });

      expect(result.url).toBe('https://s3.example.com/signed-url');
      expect(result.expiresAt).toBeDefined();
    });

    it('should throw 403 when asset belongs to another user', async () => {
      storageDao.findAssetRecordById.mockResolvedValue({
        url: 'users/other/books/book/assets/asset.jpg',
        authorId: { toString: () => 'other-author-id' },
      });

      await expect(getSignedUrlManager({
        childId: '507f1f77bcf86cd799439011',
        assetId: '507f1f77bcf86cd799439013',
      })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('should throw 404 when asset not found', async () => {
      storageDao.findAssetRecordById.mockResolvedValue(null);

      await expect(getSignedUrlManager({
        childId: '507f1f77bcf86cd799439011',
        assetId: '507f1f77bcf86cd799439013',
      })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });
  });
});
