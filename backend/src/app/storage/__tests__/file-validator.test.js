// Contopia — File Validator Unit Tests
// STORY-006: MIME whitelist, magic bytes, size validation
import { describe, it, expect } from 'vitest';
import { validateFile } from '../file-validator.js';

describe('File Validator', () => {
  // ── Valid PNG ────────────────────────────────────────────────────────────
  it('should accept a valid PNG file', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);
    const file = { mimetype: 'image/png', size: pngBuffer.length, buffer: pngBuffer };
    expect(() => validateFile(file)).not.toThrow();
  });

  // ── Valid JPEG ───────────────────────────────────────────────────────────
  it('should accept a valid JPEG file', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(100)]);
    const file = { mimetype: 'image/jpeg', size: jpegBuffer.length, buffer: jpegBuffer };
    expect(() => validateFile(file)).not.toThrow();
  });

  // ── Valid WEBP ───────────────────────────────────────────────────────────
  it('should accept a valid WEBP file', () => {
    const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, ...Buffer.alloc(100)]);
    const file = { mimetype: 'image/webp', size: webpBuffer.length, buffer: webpBuffer };
    expect(() => validateFile(file)).not.toThrow();
  });

  // ── No file ─────────────────────────────────────────────────────────────
  it('should reject null file', () => {
    expect(() => validateFile(null)).toThrow();
    expect(() => validateFile(null)).toThrow('No file uploaded');
  });

  // ── File too large ──────────────────────────────────────────────────────
  it('should reject file > 5MB', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);
    const file = { mimetype: 'image/png', size: 6 * 1024 * 1024, buffer: pngBuffer };
    try {
      validateFile(file);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.status).toBe(413);
      expect(err.code).toBe('PAYLOAD_TOO_LARGE');
      expect(err.message).toBe('This file is too big! Try a smaller picture.');
    }
  });

  // ── Invalid MIME type ───────────────────────────────────────────────────
  it('should reject invalid MIME type', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);
    const file = { mimetype: 'application/exe', size: pngBuffer.length, buffer: pngBuffer };
    try {
      validateFile(file);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_FILE_TYPE');
      expect(err.message).toBe("Oops! We only accept pictures (PNG, JPG, WebP).");
    }
  });

  // ── Bad magic bytes (exe renamed to png) ──────────────────────────────
  it('should reject file with wrong magic bytes even if MIME is correct', () => {
    const fakeBuffer = Buffer.from('MZ\x90\x00' + 'A'.repeat(100));
    const file = { mimetype: 'image/png', size: fakeBuffer.length, buffer: fakeBuffer };
    try {
      validateFile(file);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_FILE_TYPE');
      expect(err.message).toBe("Oops! We only accept pictures (PNG, JPG, WebP).");
    }
  });

  // ── SVG MIME ────────────────────────────────────────────────────────────
  it('should reject SVG MIME type', () => {
    const svgContent = Buffer.from('<svg></svg>');
    const file = { mimetype: 'image/svg+xml', size: svgContent.length, buffer: svgContent };
    try {
      validateFile(file);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_FILE_TYPE');
    }
  });

  // ── Exactly 5MB should be accepted ─────────────────────────────────────
  it('should accept file exactly 5MB', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(100)]);
    const file = { mimetype: 'image/png', size: 5 * 1024 * 1024, buffer: pngBuffer };
    expect(() => validateFile(file)).not.toThrow();
  });
});