// Contopia — Book Model Tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Book } from '../book-model.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('Book Model', () => {
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
    it('should create a book with minimum required fields', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'My First Book',
      });

      expect(book).toBeDefined();
      expect(book._id).toBeDefined();
      expect(book.authorId.toString()).toBe(authorId.toString());
      expect(book.title).toBe('My First Book');
      expect(book.description).toBe('');
      expect(book.status).toBe('draft');
      expect(book.chapterIds).toEqual([]);
      expect(book.coverAssetId).toBeNull();
      expect(book.templateId).toBeNull();
      expect(book.publishedAt).toBeNull();
      expect(book.language).toBe('pt-BR');
      expect(book.deletedAt).toBeNull();
      expect(book.createdAt).toBeInstanceOf(Date);
      expect(book.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce required authorId', async () => {
      await expect(Book.create({ title: 'No Author' })).rejects.toThrow();
    });

    it('should enforce required title', async () => {
      await expect(Book.create({ authorId: new mongoose.Types.ObjectId() })).rejects.toThrow();
    });

    it('should trim title', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: '  Spaced Title  ' });
      expect(book.title).toBe('Spaced Title');
    });

    it('should reject title exceeding 200 characters', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const longTitle = 'A'.repeat(201);
      await expect(Book.create({ authorId, title: longTitle })).rejects.toThrow();
    });

    it('should accept title of exactly 200 characters', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const exactTitle = 'A'.repeat(200);
      const book = await Book.create({ authorId, title: exactTitle });
      expect(book.title).toBe(exactTitle);
    });

    it('should enforce status enum values', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(Book.create({ authorId, title: 'Bad', status: 'invalid' })).rejects.toThrow();
    });

    it('should accept valid status values', async () => {
      const authorId = new mongoose.Types.ObjectId();
      for (const status of ['draft', 'published', 'archived']) {
        const book = await Book.create({ authorId, title: `Book ${status}`, status });
        expect(book.status).toBe(status);
      }
    });

    it('should accept optional description', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'With Description',
        description: 'A great story about testing',
      });
      expect(book.description).toBe('A great story about testing');
    });

    it('should reject description exceeding 2000 characters', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Long', description: 'X'.repeat(2001) })
      ).rejects.toThrow();
    });

    it('should default status to draft', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'Default Status' });
      expect(book.status).toBe('draft');
    });

    it('should accept custom language', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'EN Book', language: 'en-US' });
      expect(book.language).toBe('en-US');
    });

    it('should reject language exceeding 5 characters', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Lang', language: 'pt-BR-XX' })
      ).rejects.toThrow();
    });

    it('should accept chapterIds array', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const ch1 = new mongoose.Types.ObjectId();
      const ch2 = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'With Chapters',
        chapterIds: [ch1, ch2],
      });
      expect(book.chapterIds).toHaveLength(2);
      expect(book.chapterIds[0].toString()).toBe(ch1.toString());
    });

    it('should accept coverAssetId', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const coverId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'With Cover',
        coverAssetId: coverId,
      });
      expect(book.coverAssetId.toString()).toBe(coverId.toString());
    });

    it('should accept publishedAt date', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const pubDate = new Date('2026-05-01');
      const book = await Book.create({
        authorId,
        title: 'Published',
        status: 'published',
        publishedAt: pubDate,
      });
      expect(book.publishedAt).toEqual(pubDate);
    });

    // ── STORY-022: templateId field ─────────────────────────────────────────
    describe('templateId field', () => {
      it('should default templateId to null', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const book = await Book.create({ authorId, title: 'No Template' });
        expect(book.templateId).toBeNull();
      });

      it('should accept a valid templateId string', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const book = await Book.create({
          authorId,
          title: 'Galaxy Cover',
          templateId: 'galaxy',
        });
        expect(book.templateId).toBe('galaxy');
      });

      it('should trim templateId', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const book = await Book.create({
          authorId,
          title: 'Spaced Template',
          templateId: '  ocean  ',
        });
        expect(book.templateId).toBe('ocean');
      });

      it('should reject templateId exceeding 50 characters', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const longId = 'x'.repeat(51);
        await expect(
          Book.create({ authorId, title: 'Long Id', templateId: longId })
        ).rejects.toThrow();
      });

      it('should accept templateId of exactly 50 characters', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const exactId = 'x'.repeat(50);
        const book = await Book.create({
          authorId,
          title: 'Exact Template',
          templateId: exactId,
        });
        expect(book.templateId).toBe(exactId);
      });

      it('should allow setting templateId to null explicitly', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const book = await Book.create({
          authorId,
          title: 'Null Template',
          templateId: null,
        });
        expect(book.templateId).toBeNull();
      });

      it('should persist templateId update via save', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const book = await Book.create({ authorId, title: 'Update Template' });
        expect(book.templateId).toBeNull();

        book.templateId = 'adventure';
        await book.save();

        const found = await Book.findById(book._id);
        expect(found.templateId).toBe('adventure');
      });

      it('should coexist with other fields when templateId is set', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const book = await Book.create({
          authorId,
          title: 'Full Book',
          description: 'A full book with template',
          templateId: 'nature',
          language: 'en-US',
        });
        expect(book.title).toBe('Full Book');
        expect(book.description).toBe('A full book with template');
        expect(book.templateId).toBe('nature');
        expect(book.language).toBe('en-US');
      });
    });
  });

  describe('soft delete via deletedAt', () => {
    it('should default deletedAt to null', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'Active' });
      expect(book.deletedAt).toBeNull();
    });

    it('should allow setting deletedAt for soft delete', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'To Delete' });
      const now = new Date();
      book.deletedAt = now;
      await book.save();

      const deleted = await Book.findOne({ _id: book._id, deletedAt: null });
      expect(deleted).toBeNull();

      const found = await Book.findById(book._id);
      expect(found.deletedAt).toBeTruthy();
    });
  });

  describe('collection name', () => {
    it('should use books collection', () => {
      expect(Book.collection.collectionName).toBe('books');
    });
  });

  // ── STORY-025: spineColor & spineCustomized ──────────────────────────────────
  describe('spineColor field', () => {
    it('should default spineColor to null (raw), getter returns fallback', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'No Spine Color' });
      // Raw stored value is null; getter transforms it to a palette fallback
      expect(book._doc.spineColor).toBeNull();
      expect(book.spineColor).toBeDefined();
      expect(book.spineColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should accept a valid hex spineColor', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Red Spine',
        spineColor: '#FF6B6B',
      });
      expect(book.spineColor).toBe('#FF6B6B');
    });

    it('should accept lowercase hex spineColor', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Lowercase Spine',
        spineColor: '#4ecdc4',
      });
      expect(book.spineColor).toBe('#4ecdc4');
    });

    it('should accept mixed-case hex spineColor', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Mixed Spine',
        spineColor: '#45B7d1',
      });
      expect(book.spineColor).toBe('#45B7d1');
    });

    it('should reject invalid hex spineColor without hash', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Bad Spine', spineColor: 'FF6B6B' })
      ).rejects.toThrow();
    });

    it('should reject invalid hex spineColor with 5 chars', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Short Spine', spineColor: '#FF6B6' })
      ).rejects.toThrow();
    });

    it('should reject invalid hex spineColor with 8 chars', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Long Spine', spineColor: '#FF6B6BFF' })
      ).rejects.toThrow();
    });

    it('should reject spineColor with non-hex chars', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Invalid Spine', spineColor: '#GGHHII' })
      ).rejects.toThrow();
    });

    it('should reject spineColor that is just hash', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Hash Spine', spineColor: '#' })
      ).rejects.toThrow();
    });

    it('should allow setting spineColor to null explicitly (raw value)', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Null Spine',
        spineColor: null,
      });
      // Getter provides fallback; raw value is null
      expect(book._doc.spineColor).toBeNull();
      expect(book.spineColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should trim whitespace from spineColor', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Trimmed Spine',
        spineColor: '  #FF6B6B  ',
      });
      expect(book.spineColor).toBe('#FF6B6B');
    });

    it('should persist spineColor update via save', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'Update Spine' });
      expect(book._doc.spineColor).toBeNull();

      book.spineColor = '#96CEB4';
      await book.save();

      const found = await Book.findById(book._id);
      expect(found.spineColor).toBe('#96CEB4');
    });

    it('should return deterministic fallback color via getter when spineColor is null', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Fallback Spine',
        spineColor: null,
      });

      // Book was created with null spineColor — but when serialized with getters,
      // the getter should return a color from the palette
      const palette = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
      const idx = book._id.toString().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length;
      const expectedFallback = palette[idx];

      // Use toObject({ getters: true }) to trigger the getter
      const obj = book.toObject({ getters: true });
      expect(obj.spineColor).toBe(expectedFallback);
    });

    it('should return stored spineColor instead of fallback when set', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Stored Spine',
        spineColor: '#FFEAA7',
      });

      // When spineColor is explicitly set, getter should return it, not the fallback
      const obj = book.toObject({ getters: true });
      expect(obj.spineColor).toBe('#FFEAA7');
    });

    it('should produce consistent fallback for same book ID', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Consistent Spine',
        spineColor: null,
      });

      const obj1 = book.toObject({ getters: true });
      const obj2 = book.toObject({ getters: true });
      expect(obj1.spineColor).toBe(obj2.spineColor);
    });

    it('should accept exact 7-char hex spineColor', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Exact Spine',
        spineColor: '#123456',
      });
      expect(book.spineColor).toBe('#123456');
    });
  });

  describe('spineCustomized field', () => {
    it('should default spineCustomized to false', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'No Custom Spine' });
      expect(book.spineCustomized).toBe(false);
    });

    it('should accept spineCustomized set to true', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Custom Spine',
        spineCustomized: true,
      });
      expect(book.spineCustomized).toBe(true);
    });

    it('should accept spineCustomized set to false explicitly', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Explicit False',
        spineCustomized: false,
      });
      expect(book.spineCustomized).toBe(false);
    });

    it('should persist spineCustomized update via save', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'Toggle Spine' });
      expect(book.spineCustomized).toBe(false);

      book.spineCustomized = true;
      await book.save();

      const found = await Book.findById(book._id);
      expect(found.spineCustomized).toBe(true);
    });

    it('should reject non-boolean spineCustomized (object)', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Bad Custom', spineCustomized: { value: true } })
      ).rejects.toThrow();
    });
  });

  // ── STORY-024: coverTitle & stickers ────────────────────────────────────────
  describe('coverTitle field', () => {
    it('should default coverTitle to null', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'No Cover Title' });
      expect(book.coverTitle).toBeNull();
    });

    it('should accept a valid coverTitle string', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'My Book',
        coverTitle: 'My Custom Title',
      });
      expect(book.coverTitle).toBe('My Custom Title');
    });

    it('should trim coverTitle', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Spaced',
        coverTitle: '  Spaced Title  ',
      });
      expect(book.coverTitle).toBe('Spaced Title');
    });

    it('should reject coverTitle exceeding 120 characters', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Long', coverTitle: 'A'.repeat(121) })
      ).rejects.toThrow();
    });

    it('should accept coverTitle of exactly 120 characters', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const exact = 'A'.repeat(120);
      const book = await Book.create({ authorId, title: 'Exact', coverTitle: exact });
      expect(book.coverTitle).toBe(exact);
    });

    it('should allow setting coverTitle to null explicitly', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Null Cover Title',
        coverTitle: null,
      });
      expect(book.coverTitle).toBeNull();
    });

    it('should persist coverTitle update via save', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'Update Title' });
      expect(book.coverTitle).toBeNull();

      book.coverTitle = 'New Cover Title';
      await book.save();

      const found = await Book.findById(book._id);
      expect(found.coverTitle).toBe('New Cover Title');
    });
  });

  describe('stickers field', () => {
    it('should default stickers to an empty array', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'No Stickers' });
      expect(book.stickers).toEqual([]);
    });

    it('should accept stickers with svgId, x, y, and scale', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'With Stickers',
        stickers: [
          { svgId: 'star', x: 50, y: 50, scale: 1 },
          { svgId: 'heart', x: 25, y: 75, scale: 1.5 },
        ],
      });
      expect(book.stickers).toHaveLength(2);
      expect(book.stickers[0].svgId).toBe('star');
      expect(book.stickers[0].x).toBe(50);
      expect(book.stickers[0].y).toBe(50);
      expect(book.stickers[0].scale).toBe(1);
      expect(book.stickers[1].svgId).toBe('heart');
      expect(book.stickers[1].scale).toBe(1.5);
    });

    it('should default sticker scale to 1 when omitted', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Default Scale',
        stickers: [{ svgId: 'star', x: 50, y: 50 }],
      });
      expect(book.stickers[0].scale).toBe(1);
    });

    it('should trim sticker svgId', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Trimmed',
        stickers: [{ svgId: '  star  ', x: 50, y: 50 }],
      });
      expect(book.stickers[0].svgId).toBe('star');
    });

    it('should reject sticker svgId exceeding 30 characters', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Long SvgId', stickers: [{ svgId: 'x'.repeat(31), x: 50, y: 50 }] })
      ).rejects.toThrow();
    });

    it('should reject sticker x below 0', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Bad X', stickers: [{ svgId: 'star', x: -1, y: 50 }] })
      ).rejects.toThrow();
    });

    it('should reject sticker x above 100', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Bad X', stickers: [{ svgId: 'star', x: 101, y: 50 }] })
      ).rejects.toThrow();
    });

    it('should reject sticker y below 0', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Bad Y', stickers: [{ svgId: 'star', x: 50, y: -1 }] })
      ).rejects.toThrow();
    });

    it('should reject sticker y above 100', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Bad Y', stickers: [{ svgId: 'star', x: 50, y: 101 }] })
      ).rejects.toThrow();
    });

    it('should reject sticker scale below 0.5', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'Low Scale', stickers: [{ svgId: 'star', x: 50, y: 50, scale: 0.4 }] })
      ).rejects.toThrow();
    });

    it('should reject sticker scale above 2', async () => {
      const authorId = new mongoose.Types.ObjectId();
      await expect(
        Book.create({ authorId, title: 'High Scale', stickers: [{ svgId: 'star', x: 50, y: 50, scale: 2.1 }] })
      ).rejects.toThrow();
    });

    it('should accept sticker with scale of exactly 0.5', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Min Scale',
        stickers: [{ svgId: 'star', x: 50, y: 50, scale: 0.5 }],
      });
      expect(book.stickers[0].scale).toBe(0.5);
    });

    it('should accept sticker with scale of exactly 2', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({
        authorId,
        title: 'Max Scale',
        stickers: [{ svgId: 'star', x: 50, y: 50, scale: 2 }],
      });
      expect(book.stickers[0].scale).toBe(2);
    });

    it('should persist stickers update via save', async () => {
      const authorId = new mongoose.Types.ObjectId();
      const book = await Book.create({ authorId, title: 'Update Stickers' });
      expect(book.stickers).toEqual([]);

      book.stickers = [{ svgId: 'moon', x: 30, y: 70, scale: 1.2 }];
      await book.save();

      const found = await Book.findById(book._id);
      expect(found.stickers).toHaveLength(1);
      expect(found.stickers[0].svgId).toBe('moon');
      expect(found.stickers[0].x).toBe(30);
      expect(found.stickers[0].y).toBe(70);
      expect(found.stickers[0].scale).toBe(1.2);
    });
  });
});
