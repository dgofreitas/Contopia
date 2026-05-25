// Contopia — File Validator Tests (STORY-027)
// Tests for validateFile: MIME whitelist, magic bytes, SVG rejection, size limit
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { validateFile } from '../app/storage/file-validator.js';

function makeFile(mimetype, size, bufferContent) {
  return {
    mimetype,
    size,
    buffer: Buffer.from(bufferContent),
  };
}

describe('file-validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('valid file types', () => {
    it('should accept valid PNG with correct magic bytes', () => {
      const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);
      const file = makeFile('image/png', 1024, pngMagic);
      expect(validateFile(file)).toBe(true);
    });

    it('should accept valid JPEG with correct magic bytes', () => {
      const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const file = makeFile('image/jpeg', 2048, jpegMagic);
      expect(validateFile(file)).toBe(true);
    });

    it('should accept valid WebP with correct magic bytes', () => {
      const webpMagic = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
      const file = makeFile('image/webp', 3072, webpMagic);
      expect(validateFile(file)).toBe(true);
    });
  });

  describe('file size validation', () => {
    it('should reject files larger than 5MB', () => {
      const file = makeFile('image/png', 5 * 1024 * 1024 + 1, 'some-data');
      expect(() => validateFile(file)).toThrow('This file is too big! Try a smaller picture.');
    });

    it('should accept files exactly at 5MB boundary', () => {
      const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const file = makeFile('image/png', 5 * 1024 * 1024, pngMagic);
      expect(validateFile(file)).toBe(true);
    });

    it('should return PAYLOAD_TOO_LARGE code for oversized files', () => {
      const file = makeFile('image/jpeg', 10 * 1024 * 1024, 'some-data');
      try {
        validateFile(file);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).toBe(413);
        expect(err.code).toBe('PAYLOAD_TOO_LARGE');
      }
    });
  });

  describe('SVG rejection (security)', () => {
    it('should reject files with SVG MIME type', () => {
      const file = makeFile('image/svg+xml', 1024, '<svg><rect/></svg>');
      expect(() => validateFile(file)).toThrow('SVG files are not allowed');
    });

    it('should reject SVG via magic bytes (<?xml prefix)', () => {
      const file = makeFile('image/png', 1024, '<?xml version="1.0"?><svg>...</svg>');
      expect(() => validateFile(file)).toThrow('SVG files are not allowed');
    });

    it('should reject SVG via magic bytes (<svg prefix)', () => {
      const file = makeFile('image/png', 1024, '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
      expect(() => validateFile(file)).toThrow('SVG files are not allowed');
    });

    it('should reject SVG with embedded script in first 512 bytes', () => {
      const content = '<html><body><svg onload="alert(1)"><rect/></svg></body></html>';
      const file = makeFile('image/png', 1024, content);
      expect(() => validateFile(file)).toThrow('SVG files are not allowed');
    });

    it('should reject SVG content with leading whitespace before <svg', () => {
      const file = makeFile('image/png', 1024, '  <svg xmlns="...">');
      expect(() => validateFile(file)).toThrow('SVG files are not allowed');
    });

    it('should return INVALID_FILE_TYPE code for SVG', () => {
      const file = makeFile('image/svg+xml', 1024, '<svg/>');
      try {
        validateFile(file);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).toBe(400);
        expect(err.code).toBe('INVALID_FILE_TYPE');
      }
    });
  });

  describe('spoofed extension / MIME mismatch', () => {
    it('should reject .exe renamed to .png (wrong magic bytes)', () => {
      const exeContent = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const file = makeFile('image/png', 4096, exeContent);
      expect(() => validateFile(file)).toThrow('Oops! We only accept pictures');
    });

    it('should reject PDF (wrong magic bytes)', () => {
      const pdfContent = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
      const file = makeFile('image/png', 2048, pdfContent);
      expect(() => validateFile(file)).toThrow('Oops! We only accept pictures');
    });

    it('should reject empty buffer (no magic bytes match)', () => {
      const file = makeFile('image/jpeg', 0, Buffer.alloc(0));
      expect(() => validateFile(file)).toThrow('Oops! We only accept pictures');
    });
  });

  describe('null/undefined file', () => {
    it('should reject null file', () => {
      expect(() => validateFile(null)).toThrow('No file uploaded');
    });

    it('should reject undefined file', () => {
      expect(() => validateFile(undefined)).toThrow('No file uploaded');
    });

    it('should return 400 for missing file', () => {
      try {
        validateFile(null);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).toBe(400);
        expect(err.code).toBe('INVALID_FILE_TYPE');
      }
    });
  });

  describe('unlisted MIME types', () => {
    it('should reject image/gif even with plausible buffer', () => {
      const gifMagic = Buffer.from([0x47, 0x49, 0x46, 0x38]);
      const file = makeFile('image/gif', 1024, gifMagic);
      expect(() => validateFile(file)).toThrow('Oops! We only accept pictures');
    });

    it('should reject application/octet-stream', () => {
      const file = makeFile('application/octet-stream', 512, 'some-binary');
      expect(() => validateFile(file)).toThrow('Oops! We only accept pictures');
    });
  });
});
