// Contopia — Validation Schemas Tests
import { describe, it, expect } from 'vitest';
import { registerSchema, resendSchema, childLoginSchema } from '../app/common/validation-schemas.js';

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
});
