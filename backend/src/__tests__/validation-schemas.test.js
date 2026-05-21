// Contopia — Validation Schemas Tests
import { describe, it, expect } from 'vitest';
import { registerSchema, resendSchema, childLoginSchema, bookUpdateSchema } from '../app/common/validation-schemas.js';

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
});
