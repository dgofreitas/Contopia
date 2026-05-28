// Contopia — Validation Schemas Tests
import { describe, it, expect } from 'vitest';
import { registerSchema, resendSchema, childLoginSchema, bookUpdateSchema, stickerSchema, progressUpdateSchema } from '../app/common/validation-schemas.js';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should accept valid email and name', () => {
      const result = registerSchema.safeParse({
        parentEmail: 'parent@example.com',
        childFirstName: 'João',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        parentEmail: 'invalid-email',
        childFirstName: 'João',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('invalid_string');
    });

    it('should reject empty name', () => {
      const result = registerSchema.safeParse({
        parentEmail: 'parent@example.com',
        childFirstName: '',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('too_small');
    });

    it('should reject name too long', () => {
      const longName = 'a'.repeat(51);
      const result = registerSchema.safeParse({
        parentEmail: 'parent@example.com',
        childFirstName: longName,
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('too_big');
    });

    it('should reject name with numbers', () => {
      const result = registerSchema.safeParse({
        parentEmail: 'parent@example.com',
        childFirstName: 'João123',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('invalid_string');
    });

    it('should reject name with special chars', () => {
      const result = registerSchema.safeParse({
        parentEmail: 'parent@example.com',
        childFirstName: 'João-Silva',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('invalid_string');
    });

    it('should accept unicode letters', () => {
      const result = registerSchema.safeParse({
        parentEmail: 'parent@example.com',
        childFirstName: 'José',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('resendSchema', () => {
    it('should accept valid email', () => {
      const result = resendSchema.safeParse({
        parentEmail: 'parent@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = resendSchema.safeParse({
        parentEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('invalid_string');
    });
  });

  describe('childLoginSchema', () => {
    it('should accept valid IDs', () => {
      const result = childLoginSchema.safeParse({
        childId: '507f1f77bcf86cd799439011',
        parentId: '507f1f77bcf86cd799439012',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty childId', () => {
      const result = childLoginSchema.safeParse({
        childId: '',
        parentId: '507f1f77bcf86cd799439012',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('too_small');
    });

    it('should reject empty parentId', () => {
      const result = childLoginSchema.safeParse({
        childId: '507f1f77bcf86cd799439011',
        parentId: '',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('too_small');
    });
  });

  describe('bookUpdateSchema — templateId', () => {
    const validBase = { title: 'Updated Book' };

    it('should accept book update without templateId', () => {
      const result = bookUpdateSchema.safeParse(validBase);
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('templateId');
    });

    it('should accept templateId as a string', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, templateId: 'galaxy' });
      expect(result.success).toBe(true);
      expect(result.data.templateId).toBe('galaxy');
    });

    it('should accept templateId as null (clearing selection)', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, templateId: null });
      expect(result.success).toBe(true);
      expect(result.data.templateId).toBeNull();
    });

    it('should trim templateId value', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, templateId: '  ocean  ' });
      expect(result.success).toBe(true);
      expect(result.data.templateId).toBe('ocean');
    });

    it('should reject templateId exceeding 50 characters', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, templateId: 'x'.repeat(51) });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].code).toBe('too_big');
    });

    it('should accept templateId of exactly 50 characters', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, templateId: 'x'.repeat(50) });
      expect(result.success).toBe(true);
      expect(result.data.templateId).toBe('x'.repeat(50));
    });

    it('should reject templateId as number', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, templateId: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject templateId as boolean', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, templateId: true });
      expect(result.success).toBe(false);
    });

    it('should accept templateId alongside other valid fields', () => {
      const result = bookUpdateSchema.safeParse({
        title: 'New Title',
        description: 'Updated description',
        language: 'en-US',
        templateId: 'adventure',
      });
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('New Title');
      expect(result.data.description).toBe('Updated description');
      expect(result.data.language).toBe('en-US');
      expect(result.data.templateId).toBe('adventure');
    });
  });

  describe('stickerSchema', () => {
    it('should accept a valid sticker', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50 });
      expect(result.success).toBe(true);
      expect(result.data.svgId).toBe('star');
      expect(result.data.x).toBe(50);
      expect(result.data.y).toBe(50);
      expect(result.data.scale).toBe(1); // default
    });

    it('should accept a sticker with explicit scale', () => {
      const result = stickerSchema.safeParse({ svgId: 'heart', x: 25, y: 75, scale: 1.5 });
      expect(result.success).toBe(true);
      expect(result.data.scale).toBe(1.5);
    });

    it('should default scale to 1 when omitted', () => {
      const result = stickerSchema.safeParse({ svgId: 'moon', x: 10, y: 90 });
      expect(result.success).toBe(true);
      expect(result.data.scale).toBe(1);
    });

    it('should trim svgId', () => {
      const result = stickerSchema.safeParse({ svgId: '  star  ', x: 50, y: 50 });
      expect(result.success).toBe(true);
      expect(result.data.svgId).toBe('star');
    });

    it('should reject svgId exceeding 30 characters', () => {
      const result = stickerSchema.safeParse({ svgId: 'x'.repeat(31), x: 50, y: 50 });
      expect(result.success).toBe(false);
    });

    it('should reject svgId of exactly 30 characters', () => {
      const result = stickerSchema.safeParse({ svgId: 'x'.repeat(30), x: 50, y: 50 });
      expect(result.success).toBe(true);
    });

    it('should reject x below 0', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: -1, y: 50 });
      expect(result.success).toBe(false);
    });

    it('should reject x above 100', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 101, y: 50 });
      expect(result.success).toBe(false);
    });

    it('should reject y below 0', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject y above 100', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject scale below 0.5', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50, scale: 0.4 });
      expect(result.success).toBe(false);
    });

    it('should reject scale above 2', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50, scale: 2.1 });
      expect(result.success).toBe(false);
    });

    it('should accept scale of exactly 0.5', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50, scale: 0.5 });
      expect(result.success).toBe(true);
    });

    it('should accept scale of exactly 2', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50, scale: 2 });
      expect(result.success).toBe(true);
    });

    it('should accept coordinates at boundary values (0 and 100)', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 0, y: 100 });
      expect(result.success).toBe(true);
    });

    it('should reject non-number x', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: '50', y: 50 });
      expect(result.success).toBe(false);
    });

    it('should reject non-number y', () => {
      const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: '50' });
      expect(result.success).toBe(false);
    });

    it('should reject missing svgId', () => {
      const result = stickerSchema.safeParse({ x: 50, y: 50 });
      expect(result.success).toBe(false);
    });
  });

  describe('bookUpdateSchema — coverTitle', () => {
    const validBase = { title: 'Updated Book' };

    it('should accept book update without coverTitle', () => {
      const result = bookUpdateSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it('should accept coverTitle as a string', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, coverTitle: 'My Cover Title' });
      expect(result.success).toBe(true);
      expect(result.data.coverTitle).toBe('My Cover Title');
    });

    it('should accept coverTitle as null (resetting to default)', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, coverTitle: null });
      expect(result.success).toBe(true);
      expect(result.data.coverTitle).toBeNull();
    });

    it('should trim coverTitle', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, coverTitle: '  Spaced Title  ' });
      expect(result.success).toBe(true);
      expect(result.data.coverTitle).toBe('Spaced Title');
    });

    it('should reject coverTitle exceeding 120 characters', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, coverTitle: 'A'.repeat(121) });
      expect(result.success).toBe(false);
    });

    it('should accept coverTitle of exactly 120 characters', () => {
      const result = bookUpdateSchema.safeParse({ ...validBase, coverTitle: 'A'.repeat(120) });
      expect(result.success).toBe(true);
    });
  });

  describe('bookUpdateSchema — stickers', () => {
    const validBase = { title: 'Updated Book' };

    it('should accept book update without stickers (defaults to empty array)', () => {
      const result = bookUpdateSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it('should accept stickers as an array of valid sticker objects', () => {
      const result = bookUpdateSchema.safeParse({
        ...validBase,
        stickers: [
          { svgId: 'star', x: 50, y: 50 },
          { svgId: 'heart', x: 25, y: 75, scale: 1.5 },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.data.stickers).toHaveLength(2);
      expect(result.data.stickers[0].svgId).toBe('star');
      expect(result.data.stickers[0].scale).toBe(1); // default
      expect(result.data.stickers[1].scale).toBe(1.5);
    });

    it('should default stickers to empty array when not provided', () => {
      const result = bookUpdateSchema.safeParse(validBase);
      expect(result.success).toBe(true);
      expect(result.data.stickers).toEqual([]);
    });

    it('should reject stickers array exceeding 10 items', () => {
      const stickers = Array.from({ length: 11 }, (_, i) => ({
        svgId: `s${i}`, x: i * 9, y: i * 9,
      }));
      const result = bookUpdateSchema.safeParse({ ...validBase, stickers });
      expect(result.success).toBe(false);
    });

    it('should accept stickers array with exactly 10 items', () => {
      const stickers = Array.from({ length: 10 }, (_, i) => ({
        svgId: `s${i}`, x: i * 9, y: i * 9,
      }));
      const result = bookUpdateSchema.safeParse({ ...validBase, stickers });
      expect(result.success).toBe(true);
    });

    it('should reject sticker with invalid svgId (too long)', () => {
      const result = bookUpdateSchema.safeParse({
        ...validBase,
        stickers: [{ svgId: 'x'.repeat(31), x: 50, y: 50 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject sticker with x outside 0–100', () => {
      const result = bookUpdateSchema.safeParse({
        ...validBase,
        stickers: [{ svgId: 'star', x: 101, y: 50 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject sticker with y outside 0–100', () => {
      const result = bookUpdateSchema.safeParse({
        ...validBase,
        stickers: [{ svgId: 'star', x: 50, y: -1 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject sticker with scale below 0.5', () => {
      const result = bookUpdateSchema.safeParse({
        ...validBase,
        stickers: [{ svgId: 'star', x: 50, y: 50, scale: 0.3 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject sticker with scale above 2', () => {
      const result = bookUpdateSchema.safeParse({
        ...validBase,
        stickers: [{ svgId: 'star', x: 50, y: 50, scale: 3 }],
      });
      expect(result.success).toBe(false);
    });

    it('should accept coverTitle and stickers together', () => {
      const result = bookUpdateSchema.safeParse({
        title: 'Updated',
        coverTitle: 'Custom Cover',
        stickers: [{ svgId: 'star', x: 50, y: 50 }],
      });
      expect(result.success).toBe(true);
      expect(result.data.coverTitle).toBe('Custom Cover');
      expect(result.data.stickers).toHaveLength(1);
      expect(result.data.stickers[0].svgId).toBe('star');
    });
  });

  describe('progressUpdateSchema — STORY-033', () => {
    it('should accept valid progress update with all fields', () => {
      const result = progressUpdateSchema.safeParse({
        lastChapterId: '507f1f77bcf86cd799439011',
        lastPosition: 42,
        percentage: 75,
        finished: true,
      });
      expect(result.success).toBe(true);
      expect(result.data.lastChapterId).toBe('507f1f77bcf86cd799439011');
      expect(result.data.lastPosition).toBe(42);
      expect(result.data.percentage).toBe(75);
      expect(result.data.finished).toBe(true);
    });

    it('should accept progress update with only percentage', () => {
      const result = progressUpdateSchema.safeParse({ percentage: 50 });
      expect(result.success).toBe(true);
      expect(result.data.percentage).toBe(50);
    });

    it('should accept progress update with finished = true', () => {
      const result = progressUpdateSchema.safeParse({ finished: true });
      expect(result.success).toBe(true);
      expect(result.data.finished).toBe(true);
    });

    it('should accept progress update with finished = false', () => {
      const result = progressUpdateSchema.safeParse({ finished: false });
      expect(result.success).toBe(true);
      expect(result.data.finished).toBe(false);
    });

    it('should accept empty progress update (all optional)', () => {
      const result = progressUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept lastChapterId as null', () => {
      const result = progressUpdateSchema.safeParse({ lastChapterId: null });
      expect(result.success).toBe(true);
      expect(result.data.lastChapterId).toBeNull();
    });

    it('should reject non-boolean finished value', () => {
      const result = progressUpdateSchema.safeParse({ finished: 'yes' });
      expect(result.success).toBe(false);
    });

    it('should reject numeric finished value', () => {
      const result = progressUpdateSchema.safeParse({ finished: 1 });
      expect(result.success).toBe(false);
    });

    it('should reject percentage below 0', () => {
      const result = progressUpdateSchema.safeParse({ percentage: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject percentage above 100', () => {
      const result = progressUpdateSchema.safeParse({ percentage: 101 });
      expect(result.success).toBe(false);
    });

    it('should accept finished alongside percentage', () => {
      const result = progressUpdateSchema.safeParse({ percentage: 99, finished: true });
      expect(result.success).toBe(true);
      expect(result.data.percentage).toBe(99);
      expect(result.data.finished).toBe(true);
    });
  });
});
