// Contopia — Storage DAO Unit Tests
// STORY-006: Asset record persistence
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Asset } from '../../book/book-model.js';
import * as storageDao from '../storage-dao.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('Storage DAO', () => {
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
    bookId = new mongoose.Types.ObjectId();
    authorId = new mongoose.Types.ObjectId();
  });

  describe('createAssetRecord', () => {
    it('should create an asset record', async () => {
      const data = {
        bookId,
        authorId,
        url: 'users/author1/books/book1/assets/asset1.png',
        type: 'upload',
        mimeType: 'image/png',
        sizeBytes: 1024,
      };

      const asset = await storageDao.createAssetRecord(data);
      expect(asset).toBeDefined();
      expect(asset._id).toBeDefined();
      expect(asset.bookId.toString()).toBe(bookId.toString());
      expect(asset.authorId.toString()).toBe(authorId.toString());
      expect(asset.url).toContain('users/');
      expect(asset.mimeType).toBe('image/png');
      expect(asset.type).toBe('upload');
    });
  });

  describe('findAssetRecordById', () => {
    it('should find an active asset by ID', async () => {
      const created = await storageDao.createAssetRecord({
        bookId, authorId,
        url: 'users/author1/books/book1/assets/asset1.png',
        type: 'upload', mimeType: 'image/png', sizeBytes: 1024,
      });

      const found = await storageDao.findAssetRecordById(created._id.toString());
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(created._id.toString());
    });

    it('should return null for non-existent ID', async () => {
      const found = await storageDao.findAssetRecordById(new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });

    it('should not return soft-deleted assets', async () => {
      const created = await storageDao.createAssetRecord({
        bookId, authorId,
        url: 'users/author1/books/book1/assets/asset1.png',
        type: 'upload', mimeType: 'image/png', sizeBytes: 1024,
      });

      await Asset.updateOne({ _id: created._id }, { deletedAt: new Date() });
      const found = await storageDao.findAssetRecordById(created._id.toString());
      expect(found).toBeNull();
    });
  });

  describe('findAssetsByAuthor', () => {
    it('should find all active assets for an author', async () => {
      await storageDao.createAssetRecord({
        bookId, authorId,
        url: 'users/author1/books/book1/assets/asset1.png',
        type: 'upload', mimeType: 'image/png', sizeBytes: 1024,
      });
      await storageDao.createAssetRecord({
        bookId, authorId,
        url: 'users/author1/books/book1/assets/asset2.jpg',
        type: 'cover', mimeType: 'image/jpeg', sizeBytes: 2048,
      });

      const assets = await storageDao.findAssetsByAuthor(authorId.toString());
      expect(assets).toHaveLength(2);
    });

    it('should exclude soft-deleted assets', async () => {
      const created = await storageDao.createAssetRecord({
        bookId, authorId,
        url: 'users/author1/books/book1/assets/asset1.png',
        type: 'upload', mimeType: 'image/png', sizeBytes: 1024,
      });

      await Asset.updateOne({ _id: created._id }, { deletedAt: new Date() });
      const assets = await storageDao.findAssetsByAuthor(authorId.toString());
      expect(assets).toHaveLength(0);
    });
  });

  describe('hardDeleteAssetRecord', () => {
    it('should permanently remove an asset record', async () => {
      const created = await storageDao.createAssetRecord({
        bookId, authorId,
        url: 'users/author1/books/book1/assets/asset1.png',
        type: 'upload', mimeType: 'image/png', sizeBytes: 1024,
      });

      await storageDao.hardDeleteAssetRecord(created._id.toString());
      const found = await Asset.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('softDeleteAssetsByAuthor', () => {
    it('should soft-delete all active assets for an author', async () => {
      await storageDao.createAssetRecord({
        bookId, authorId,
        url: 'users/author1/books/book1/assets/asset1.png',
        type: 'upload', mimeType: 'image/png', sizeBytes: 1024,
      });
      await storageDao.createAssetRecord({
        bookId, authorId,
        url: 'users/author1/books/book1/assets/asset2.jpg',
        type: 'cover', mimeType: 'image/jpeg', sizeBytes: 2048,
      });

      await storageDao.softDeleteAssetsByAuthor(authorId.toString());
      const assets = await storageDao.findAssetsByAuthor(authorId.toString());
      expect(assets).toHaveLength(0);
    });
  });
});