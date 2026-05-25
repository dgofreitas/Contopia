// Contopia — Image Upload Utils Tests (STORY-027)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateImageFile, getImagePreviewUrl, cleanupPreviewUrl, ErrorCodes } from '../lib/image-upload-utils';

describe('image-upload-utils', () => {
  describe('validateImageFile', () => {
    it('should accept valid PNG file under 5MB', () => {
      const file = new File(['png-data'], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const result = validateImageFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.errorCode).toBeNull();
    });

    it('should accept valid JPEG file under 5MB', () => {
      const file = new File(['jpeg-data'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 });

      const result = validateImageFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject null file', () => {
      const result = validateImageFile(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file selected');
      expect(result.errorCode).toBe(ErrorCodes.INVALID_TYPE);
    });

    it('should reject undefined file', () => {
      const result = validateImageFile(undefined);
      expect(result.valid).toBe(false);
    });

    it('should reject SVG by MIME type', () => {
      const file = new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' });
      Object.defineProperty(file, 'size', { value: 100 });

      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SVG');
      expect(result.errorCode).toBe(ErrorCodes.SVG_NOT_ALLOWED);
    });

    it('should reject SVG by file extension', () => {
      const file = new File(['<svg/>'], 'image.svg', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 100 });

      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.SVG_NOT_ALLOWED);
    });

    it('should reject oversized files (>5MB)', () => {
      const file = new File(['large-data'], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
      expect(result.errorCode).toBe(ErrorCodes.FILE_TOO_LARGE);
    });

    it('should reject files exactly at size boundary (5MB + 1 byte)', () => {
      const file = new File(['data'], 'edge.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });

      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
    });

    it('should reject GIF files (not in allowed types)', () => {
      const file = new File(['gif-data'], 'test.gif', { type: 'image/gif' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.INVALID_TYPE);
    });

    it('should reject .exe renamed to .png (mime type is not image)', () => {
      const file = new File(['exe-data'], 'virus.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('getImagePreviewUrl', () => {
    beforeEach(() => {
      globalThis.URL.createObjectURL = globalThis.URL.createObjectURL || vi.fn(() => 'blob:http://localhost/mocked-url');
    });

    it('should return a blob URL for a valid file', () => {
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const url = getImagePreviewUrl(file);
      expect(url).toBe('blob:http://localhost/mocked-url');
      expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    it('should return null for null file', () => {
      expect(getImagePreviewUrl(null)).toBeNull();
    });

    it('should return null for undefined file', () => {
      expect(getImagePreviewUrl(undefined)).toBeNull();
    });
  });

  describe('cleanupPreviewUrl', () => {
    beforeEach(() => {
      globalThis.URL.revokeObjectURL = globalThis.URL.revokeObjectURL || vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should revoke the object URL', () => {
      cleanupPreviewUrl('blob:http://localhost/test');
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test');
    });

    it('should not throw when url is null', () => {
      expect(() => cleanupPreviewUrl(null)).not.toThrow();
    });

    it('should not throw when url is undefined', () => {
      expect(() => cleanupPreviewUrl(undefined)).not.toThrow();
    });
  });
});
