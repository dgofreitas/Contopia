// Contopia — Asset Model Tests
// STORY-004: Core Data Model & Database Migrations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Asset } from '../../book/book-model.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('Asset Model', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  describe('Schema Validation', () => {
    it('should create an asset with all required fields', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const authorId = new mongoose.Types.ObjectId();
      const asset = await Asset.create({
        bookId,
        authorId,
        url: 'https://example.com/image.jpg',
        type: 'cover',
        mimeType: 'image/jpeg',
        sizeBytes: 102400,
      });

      expect(asset).toBeDefined();
      expect(asset._id).toBeDefined();
      expect(asset.bookId.toString()).toBe(bookId.toString());
      expect(asset.authorId.toString()).toBe(authorId.toString());
      expect(asset.url).toBe('https://example.com/image.jpg');
      expect(asset.type).toBe('cover');
      expect(asset.mimeType).toBe('image/jpeg');
      expect(asset.sizeBytes).toBe(102400);
      expect(asset.deletedAt).toBeNull();
      expect(asset.createdAt).toBeInstanceOf(Date);
      expect(asset.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce required bookId', async () => {
      await expect(
        Asset.create({
          authorId: new mongoose.Types.ObjectId(),
          url: 'https://example.com/img.jpg',
          type: 'cover',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
        })
      ).rejects.toThrow();
    });

    it('should enforce required authorId', async () => {
      await expect(
        Asset.create({
          bookId: new mongoose.Types.ObjectId(),
          url: 'https://example.com/img.jpg',
          type: 'cover',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
        })
      ).rejects.toThrow();
    });

    it('should enforce required url', async () => {
      await expect(
        Asset.create({
          bookId: new mongoose.Types.ObjectId(),
          authorId: new mongoose.Types.ObjectId(),
          type: 'cover',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
        })
      ).rejects.toThrow();
    });

    it('should enforce required type', async () => {
      await expect(
        Asset.create({
          bookId: new mongoose.Types.ObjectId(),
          authorId: new mongoose.Types.ObjectId(),
          url: 'https://example.com/img.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
        })
      ).rejects.toThrow();
    });

    it('should enforce required mimeType', async () => {
      await expect(
        Asset.create({
          bookId: new mongoose.Types.ObjectId(),
          authorId: new mongoose.Types.ObjectId(),
          url: 'https://example.com/img.jpg',
          type: 'cover',
          sizeBytes: 100,
        })
      ).rejects.toThrow();
    });

    it('should enforce required sizeBytes', async () => {
      await expect(
        Asset.create({
          bookId: new mongoose.Types.ObjectId(),
          authorId: new mongoose.Types.ObjectId(),
          url: 'https://example.com/img.jpg',
          type: 'cover',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow();
    });

    it('should enforce type enum values', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Asset.create({
          bookId,
          authorId,
          url: 'https://example.com/img.jpg',
          type: 'invalid_type',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
        })
      ).rejects.toThrow();
    });

    it('should accept all valid type enum values', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const authorId = new mongoose.Types.ObjectId();
      const validTypes = ['cover', 'spine', 'edge', 'upload'];

      for (const type of validTypes) {
        const asset = await Asset.create({
          bookId,
          authorId,
          url: `https://example.com/${type}.jpg`,
          type,
          mimeType: 'image/jpeg',
          sizeBytes: 100,
        });
        expect(asset.type).toBe(type);
      }
    });

    it('should reject mimeType exceeding 100 characters', async () => {
      await expect(
        Asset.create({
          bookId: new mongoose.Types.ObjectId(),
          authorId: new mongoose.Types.ObjectId(),
          url: 'https://example.com/img.jpg',
          type: 'cover',
          mimeType: 'a'.repeat(101),
          sizeBytes: 100,
        })
      ).rejects.toThrow();
    });

    it('should reject negative sizeBytes', async () => {
      await expect(
        Asset.create({
          bookId: new mongoose.Types.ObjectId(),
          authorId: new mongoose.Types.ObjectId(),
          url: 'https://example.com/img.jpg',
          type: 'cover',
          mimeType: 'image/jpeg',
          sizeBytes: -1,
        })
      ).rejects.toThrow();
    });

    it('should accept sizeBytes of 0', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const authorId = new mongoose.Types.ObjectId();
      const asset = await Asset.create({
        bookId,
        authorId,
        url: 'https://example.com/empty.jpg',
        type: 'cover',
        mimeType: 'image/jpeg',
        sizeBytes: 0,
      });
      expect(asset.sizeBytes).toBe(0);
    });
  });

  describe('Soft Delete', () => {
    it('should default deletedAt to null', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const authorId = new mongoose.Types.ObjectId();
      const asset = await Asset.create({
        bookId,
        authorId,
        url: 'https://example.com/active.jpg',
        type: 'cover',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
      });
      expect(asset.deletedAt).toBeNull();
    });

    it('should allow setting deletedAt for soft delete', async () => {
      const bookId = new mongoose.Types.ObjectId();
      const authorId = new mongoose.Types.ObjectId();
      const asset = await Asset.create({
        bookId,
        authorId,
        url: 'https://example.com/delete.jpg',
        type: 'cover',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
      });
      const now = new Date();
      asset.deletedAt = now;
      await asset.save();

      const notFound = await Asset.findOne({ _id: asset._id, deletedAt: null });
      expect(notFound).toBeNull();
    });
  });

  describe('Collection name', () => {
    it('should use assets collection', () => {
      expect(Asset.collection.collectionName).toBe('assets');
    });
  });
});
