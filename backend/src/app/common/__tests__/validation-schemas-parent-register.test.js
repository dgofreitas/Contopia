// Contopia — Validation Schemas: parentRegisterSchema Tests (STORY-057)
import { describe, it, expect } from 'vitest';
import { parentRegisterSchema } from '../validation-schemas.js';

describe('parentRegisterSchema (STORY-057)', () => {
  // ── Positive Cases ───────────────────────────────────────────────────────

  it('should accept valid registration data', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'StrongPass1',
      ageConsent: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('parent@example.com');
      expect(result.data.password).toBe('StrongPass1');
      expect(result.data.ageConsent).toBe(true);
    }
  });

  it('should accept email with plus addressing', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent+tag@example.com',
      password: 'ValidPass1',
      ageConsent: true,
    });

    expect(result.success).toBe(true);
  });

  it('should accept email with subdomain', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@sub.example.com',
      password: 'ValidPass1',
      ageConsent: true,
    });

    expect(result.success).toBe(true);
  });

  it('should accept password at minimum length (8) with uppercase and number', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'Abcd1234',
      ageConsent: true,
    });

    expect(result.success).toBe(true);
  });

  it('should accept password with maximum complexity', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'A1b2C3d4E5f6G7h8',
      ageConsent: true,
    });

    expect(result.success).toBe(true);
  });

  // ── Negative: Email ─────────────────────────────────────────────────────

  it('should reject missing email', () => {
    const result = parentRegisterSchema.safeParse({
      password: 'StrongPass1',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty email', () => {
    const result = parentRegisterSchema.safeParse({
      email: '',
      password: 'StrongPass1',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongPass1',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
  });

  it('should reject email without domain', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@',
      password: 'StrongPass1',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
  });

  // ── Negative: Password ───────────────────────────────────────────────────

  it('should reject missing password', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'Abc1',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('8 characters'))).toBe(true);
    }
  });

  it('should reject password without uppercase letter', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'lowercase1',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('uppercase'))).toBe(true);
    }
  });

  it('should reject password without number', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'NoNumberA',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('number'))).toBe(true);
    }
  });

  it('should reject password with only lowercase letters', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'abcdefgh',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
  });

  it('should reject password with only numbers', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: '12345678',
      ageConsent: true,
    });

    expect(result.success).toBe(false);
  });

  // ── Negative: ageConsent ─────────────────────────────────────────────────

  it('should reject missing ageConsent', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'StrongPass1',
    });

    expect(result.success).toBe(false);
  });

  it('should reject ageConsent set to false', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'StrongPass1',
      ageConsent: false,
    });

    expect(result.success).toBe(false);
  });

  it('should reject ageConsent set to string', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'StrongPass1',
      ageConsent: 'yes',
    });

    expect(result.success).toBe(false);
  });

  it('should reject ageConsent set to number', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'StrongPass1',
      ageConsent: 1,
    });

    expect(result.success).toBe(false);
  });

  it('should provide specific error message for ageConsent', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'parent@example.com',
      password: 'StrongPass1',
      ageConsent: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const ageConsentIssue = result.error.issues.find((i) => i.path.includes('ageConsent'));
      expect(ageConsentIssue).toBeDefined();
      // Zod literal(false) produces "Invalid literal value, expected true"
      expect(ageConsentIssue.message).toContain('expected true');
    }
  });

  // ── Negative: Multiple Errors ───────────────────────────────────────────

  it('should report multiple validation errors at once', () => {
    const result = parentRegisterSchema.safeParse({
      email: 'bad',
      password: 'short',
      ageConsent: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Should have at least 3 issues: email, password (min + uppercase + number), ageConsent
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});
