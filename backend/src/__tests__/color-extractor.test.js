// Contopia — Color Extractor Tests (STORY-027)
// Tests for extractDominantColor, isLightColor
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock sharp at module level ──────────────────────────────────────────────
const mockSharpInstance = {
  stats: vi.fn(),
};

vi.mock('sharp', () => ({
  default: vi.fn(() => mockSharpInstance),
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { extractDominantColor, isLightColor } from '../app/storage/color-extractor.js';

describe('color-extractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractDominantColor', () => {
    it('should extract dominant color from image stats', async () => {
      mockSharpInstance.stats.mockResolvedValue({
        channels: [
          { mean: 74 },   // R
          { mean: 155 },  // G
          { mean: 110 },  // B
        ],
      });

      const result = await extractDominantColor(Buffer.from('test-image'));
      expect(result).toBe('#4a9b6e');
    });

    it('should handle very dark images (low RGB values)', async () => {
      mockSharpInstance.stats.mockResolvedValue({
        channels: [
          { mean: 10 },
          { mean: 10 },
          { mean: 10 },
        ],
      });

      const result = await extractDominantColor(Buffer.from('dark-image'));
      expect(result).toBe('#0a0a0a');
    });

    it('should handle very bright images (high RGB values)', async () => {
      mockSharpInstance.stats.mockResolvedValue({
        channels: [
          { mean: 255 },
          { mean: 255 },
          { mean: 255 },
        ],
      });

      const result = await extractDominantColor(Buffer.from('white-image'));
      expect(result).toBe('#ffffff');
    });

    it('should round color values correctly', async () => {
      mockSharpInstance.stats.mockResolvedValue({
        channels: [
          { mean: 74.7 },  // rounds to 75
          { mean: 155.3 }, // rounds to 155
          { mean: 110.5 }, // rounds to 111
        ],
      });

      const result = await extractDominantColor(Buffer.from('gradient-image'));
      expect(result).toBe('#4b9b6f');
    });

    it('should throw PROCESSING_ERROR when sharp fails', async () => {
      mockSharpInstance.stats.mockRejectedValue(new Error('sharp stats failure'));

      await expect(extractDominantColor(Buffer.from('bad-image'))).rejects.toThrow("We couldn't process your picture. Try again.");
      await expect(extractDominantColor(Buffer.from('bad-image'))).rejects.toMatchObject({
        status: 500,
        code: 'PROCESSING_ERROR',
      });
    });
  });

  describe('isLightColor', () => {
    it('should return true for white', () => {
      expect(isLightColor('#ffffff')).toBe(true);
    });

    it('should return true for light yellow', () => {
      expect(isLightColor('#ffff99')).toBe(true);
    });

    it('should return false for black', () => {
      expect(isLightColor('#000000')).toBe(false);
    });

    it('should return false for dark blue', () => {
      expect(isLightColor('#1a1a4e')).toBe(false);
    });

    it('should return false for dark red', () => {
      expect(isLightColor('#8b0000')).toBe(false);
    });

    it('should handle hex without # prefix', () => {
      expect(isLightColor('ffffff')).toBe(true);
      expect(isLightColor('000000')).toBe(false);
    });

    it('should handle medium gray correctly (borderline)', () => {
      // #808080 — roughly luminance 0.2158 — should be dark
      expect(isLightColor('#808080')).toBe(false);
    });

    it('should handle light gray correctly', () => {
      // #d3d3d3 — roughly luminance 0.654 — should be light
      expect(isLightColor('#d3d3d3')).toBe(true);
    });
  });
});
