// Contopia — Validation Schemas Tests for coverAssetId (STORY-027)
import { describe, it, expect } from 'vitest';
import { bookUpdateSchema } from '../app/common/validation-schemas.js';

describe('Validation Schemas — coverAssetId', () => {
  describe('bookUpdateSchema', () => {
    it('should accept valid coverAssetId (24-char hex)', () => {
      const result = bookUpdateSchema.safeParse({
        coverAssetId: '507f1f77bcf86cd799439011',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null coverAssetId (removing cover)', () => {
      const result = bookUpdateSchema.safeParse({
        coverAssetId: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept undefined coverAssetId (not provided)', () => {
      const result = bookUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.coverAssetId).toBeUndefined();
    });

    it('should reject invalid ObjectId format for coverAssetId', () => {
      const result = bookUpdateSchema.safeParse({
        coverAssetId: 'not-a-valid-id',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-hex characters in coverAssetId', () => {
      const result = bookUpdateSchema.safeParse({
        coverAssetId: 'zzzz1f77bcf86cd799439011',
      });
      expect(result.success).toBe(false);
    });

    it('should reject coverAssetId with wrong length', () => {
      const result = bookUpdateSchema.safeParse({
        coverAssetId: 'abc',
      });
      expect(result.success).toBe(false);
    });

    it('should reject numeric coverAssetId', () => {
      const result = bookUpdateSchema.safeParse({
        coverAssetId: 12345,
      });
      expect(result.success).toBe(false);
    });

    it('should accept coverAssetId alongside other valid fields', () => {
      const result = bookUpdateSchema.safeParse({
        title: 'Updated Title',
        coverAssetId: '507f1f77bcf86cd799439011',
        spineColor: '#4a9b6e',
      });
      expect(result.success).toBe(true);
    });
  });
});
