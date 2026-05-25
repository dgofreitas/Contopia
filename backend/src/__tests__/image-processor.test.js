// Contopia — Image Processor Tests (STORY-027)
// Tests for generateThumbnail, generateCoverSize, getImageMetadata
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock sharp at module level ──────────────────────────────────────────────
const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  toBuffer: vi.fn(),
  metadata: vi.fn(),
};

vi.mock('sharp', () => ({
  default: vi.fn(() => mockSharpInstance),
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

const mockBuffer = Buffer.from('fake-image-data');
const validResult = {
  data: Buffer.from('processed-image-data'),
  info: { width: 300, height: 450, format: 'jpeg' },
};

import { generateThumbnail, generateCoverSize, getImageMetadata } from '../app/storage/image-processor.js';

describe('image-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSharpInstance.resize.mockReturnThis();
    mockSharpInstance.jpeg.mockReturnThis();
  });

  describe('generateThumbnail', () => {
    it('should generate a thumbnail with default dimensions (300x450)', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(validResult);

      const result = await generateThumbnail(mockBuffer);

      expect(result.buffer).toEqual(validResult.data);
      expect(result.width).toBe(300);
      expect(result.height).toBe(450);
      expect(result.format).toBe('jpeg');
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(300, 450, { fit: 'inside', withoutEnlargement: true });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 80 });
    });

    it('should generate a thumbnail with custom dimensions', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue({
        data: Buffer.from('small-thumb'),
        info: { width: 150, height: 200, format: 'jpeg' },
      });

      const result = await generateThumbnail(mockBuffer, { width: 150, height: 200 });

      expect(result.width).toBe(150);
      expect(result.height).toBe(200);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(150, 200, { fit: 'inside', withoutEnlargement: true });
    });

    it('should throw PROCESSING_ERROR when sharp fails', async () => {
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('sharp failure'));

      await expect(generateThumbnail(mockBuffer)).rejects.toThrow("We couldn't process your picture. Try again.");
      await expect(generateThumbnail(mockBuffer)).rejects.toMatchObject({
        status: 500,
        code: 'PROCESSING_ERROR',
      });
    });
  });

  describe('generateCoverSize', () => {
    it('should generate a cover-size image with default dimensions (600x900)', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(validResult);

      const result = await generateCoverSize(mockBuffer);

      expect(result.buffer).toBeDefined();
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(600, 900, { fit: 'inside', withoutEnlargement: true });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 85 });
    });

    it('should generate a cover-size image with custom dimensions', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue({
        data: Buffer.from('cover'),
        info: { width: 800, height: 1200, format: 'jpeg' },
      });

      const result = await generateCoverSize(mockBuffer, { width: 800, height: 1200 });

      expect(result.width).toBe(800);
      expect(result.height).toBe(1200);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, 1200, { fit: 'inside', withoutEnlargement: true });
    });

    it('should throw PROCESSING_ERROR when sharp fails', async () => {
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('sharp failure'));

      await expect(generateCoverSize(mockBuffer)).rejects.toThrow("We couldn't process your picture. Try again.");
      await expect(generateCoverSize(mockBuffer)).rejects.toMatchObject({
        status: 500,
        code: 'PROCESSING_ERROR',
      });
    });
  });

  describe('getImageMetadata', () => {
    it('should return metadata from sharp', async () => {
      mockSharpInstance.metadata.mockResolvedValue({ width: 600, height: 900, format: 'jpeg' });

      const result = await getImageMetadata(mockBuffer);

      expect(result.width).toBe(600);
      expect(result.height).toBe(900);
      expect(result.format).toBe('jpeg');
      expect(mockSharpInstance.metadata).toHaveBeenCalledTimes(1);
    });

    it('should throw PROCESSING_ERROR when metadata extraction fails', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('metadata failure'));

      await expect(getImageMetadata(mockBuffer)).rejects.toThrow("We couldn't process your picture. Try again.");
      await expect(getImageMetadata(mockBuffer)).rejects.toMatchObject({
        status: 500,
        code: 'PROCESSING_ERROR',
      });
    });
  });
});
