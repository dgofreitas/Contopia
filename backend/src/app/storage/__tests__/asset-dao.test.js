// Contopia — Asset DAO Tests
// STORY-004: Core Data Model & Database Migrations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Asset } from '../../book/book-model.js';
import * as bookDao from '../../book/book-dao.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('Asset DAO', () => {
  let bookId;
  let authorId;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    authorId = new mongoose.Types.ObjectId();
    // We need the book to exist in the DB (Asset references Book, but no FK constraint)
    // Actually Asset just stores bookId as ObjectId — no FK enforcement
    bookId = new mongoose.Types.ObjectId();
  });

  const assetData = (overrides = {}) => ({
    bookId,
    authorId,
    url: 'https://example.com/image.jpg',
    type: 'cover',
    mimeType: 'image/jpeg',
    sizeBytes: 102400,
    ...overrides,
  });

  describe('createAsset', () => {
    it('should create and return an asset document', async () => {
      const asset = await bookDao.createAsset(assetData());
      expect(asset).toBeDefined();
      expect(asset._id).toBeDefined();
      expect(asset.url).toBe('https://example.com/image.jpg');
      expect(asset.type).toBe('cover');

      // Verify persisted
      const found = await Asset.findById(asset._id);
      expect(found).toBeDefined();
    });
  });

  describe('findAssetById', () => {
    it('should find an active asset by ID', async () => {
      const created = await bookDao.createAsset(assetData());
      const found = await bookDao.findAssetById(created._id);
      expect(found).toBeDefined();
      expect(found.url).toBe('https://example.com/image.jpg');
    });

    it('should return null for non-existent ID', async () => {
      const found = await bookDao.findAssetById(new mongoose.Types.ObjectId());
      expect(found).toBeNull();
    });

    it('should not return soft-deleted assets', async () => {
      const created = await bookDao.createAsset(assetData());
      await bookDao.softDeleteAsset(created._id);
      const found = await bookDao.findAssetById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('findAssetsByBook', () => {
    it('should return all assets for a book', async () => {
      await bookDao.createAsset(assetData({ url: 'https://example.com/1.jpg', type: 'cover' }));
      await bookDao.createAsset(assetData({ url: 'https://example.com/2.jpg', type: 'spine' }));
      await bookDao.createAsset(assetData({ url: 'https://example.com/3.jpg', type: 'edge' }));

      const assets = await bookDao.findAssetsByBook(bookId);
      expect(assets).toHaveLength(3);
    });

    it('should return empty array for book with no assets', async () => {
      const assets = await bookDao.findAssetsByBook(new mongoose.Types.ObjectId());
      expect(assets).toEqual([]);
    });

    it('should filter by type when provided', async () => {
      await bookDao.createAsset(assetData({ url: 'https://example.com/cover.jpg', type: 'cover' }));
      await bookDao.createAsset(assetData({ url: 'https://example.com/spine.jpg', type: 'spine' }));
      await bookDao.createAsset(assetData({ url: 'https://example.com/edge.jpg', type: 'edge' }));

      const covers = await bookDao.findAssetsByBook(bookId, { type: 'cover' });
      expect(covers).toHaveLength(1);
      expect(covers[0].type).toBe('cover');
    });

    it('should not return soft-deleted assets', async () => {
      const a1 = await bookDao.createAsset(assetData({ url: 'https://example.com/keep.jpg' }));
      const a2 = await bookDao.createAsset(assetData({ url: 'https://example.com/remove.jpg' }));
      await bookDao.softDeleteAsset(a2._id);

      const assets = await bookDao.findAssetsByBook(bookId);
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/keep.jpg');
    });

    it('should not return assets from a different book', async () => {
      const otherBookId = new mongoose.Types.ObjectId();
      await bookDao.createAsset(assetData({ bookId, url: 'https://example.com/ours.jpg' }));
      await bookDao.createAsset(assetData({ bookId: otherBookId, url: 'https://example.com/theirs.jpg' }));

      const assets = await bookDao.findAssetsByBook(bookId);
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/ours.jpg');
    });
  });

  describe('sumAssetBytesByAuthor', () => {
    it('should sum sizeBytes for all active assets by author', async () => {
      await bookDao.createAsset(assetData({ sizeBytes: 100 }));
      await bookDao.createAsset(assetData({ sizeBytes: 200, url: 'https://example.com/2.jpg' }));
      await bookDao.createAsset(assetData({ sizeBytes: 300, url: 'https://example.com/3.jpg' }));

      const total = await bookDao.sumAssetBytesByAuthor(authorId);
      expect(total).toBe(600);
    });

    it('should return 0 for author with no assets', async () => {
      const total = await bookDao.sumAssetBytesByAuthor(new mongoose.Types.ObjectId());
      expect(total).toBe(0);
    });

    it('should exclude soft-deleted assets from sum', async () => {
      await bookDao.createAsset(assetData({ sizeBytes: 100 }));
      const toDelete = await bookDao.createAsset(assetData({ sizeBytes: 200, url: 'https://example.com/2.jpg' }));
      await bookDao.softDeleteAsset(toDelete._id);

      const total = await bookDao.sumAssetBytesByAuthor(authorId);
      expect(total).toBe(100);
    });

    it('should not sum assets from other authors', async () => {
      const otherAuthor = new mongoose.Types.ObjectId();
      await bookDao.createAsset(assetData({ sizeBytes: 100 }));
      await bookDao.createAsset(assetData({ authorId: otherAuthor, sizeBytes: 999, url: 'https://example.com/other.jpg' }));

      const total = await bookDao.sumAssetBytesByAuthor(authorId);
      expect(total).toBe(100);
    });
  });

  describe('softDeleteAsset', () => {
    it('should set deletedAt on the asset', async () => {
      const asset = await bookDao.createAsset(assetData());
      const deleted = await bookDao.softDeleteAsset(asset._id);
      expect(deleted.deletedAt).toBeInstanceOf(Date);
    });

    it('should make asset unfindable by findAssetById', async () => {
      const asset = await bookDao.createAsset(assetData());
      await bookDao.softDeleteAsset(asset._id);
      const found = await bookDao.findAssetById(asset._id);
      expect(found).toBeNull();
    });
  });

  describe('softDeleteAssetsByBook', () => {
    it('should soft delete all assets for a book', async () => {
      await bookDao.createAsset(assetData({ url: 'https://example.com/1.jpg' }));
      await bookDao.createAsset(assetData({ url: 'https://example.com/2.jpg' }));
      await bookDao.createAsset(assetData({ url: 'https://example.com/3.jpg' }));

      const result = await bookDao.softDeleteAssetsByBook(bookId);
      expect(result.modifiedCount).toBe(3);

      const assets = await bookDao.findAssetsByBook(bookId);
      expect(assets).toHaveLength(0);
    });

    it('should not affect assets from other books', async () => {
      const otherBookId = new mongoose.Types.ObjectId();
      await bookDao.createAsset(assetData({ bookId, url: 'https://example.com/delete.jpg' }));
      await bookDao.createAsset(assetData({ bookId: otherBookId, url: 'https://example.com/keep.jpg' }));

      await bookDao.softDeleteAssetsByBook(bookId);

      const ourAssets = await bookDao.findAssetsByBook(bookId);
      expect(ourAssets).toHaveLength(0);

      const otherAssets = await bookDao.findAssetsByBook(otherBookId);
      expect(otherAssets).toHaveLength(1);
      expect(otherAssets[0].url).toBe('https://example.com/keep.jpg');
    });
  });

  describe('hardDeleteAsset', () => {
    it('should permanently remove an asset', async () => {
      const asset = await bookDao.createAsset(assetData());
      await bookDao.hardDeleteAsset(asset._id);
      const found = await Asset.findById(asset._id);
      expect(found).toBeNull();
    });
  });
});
