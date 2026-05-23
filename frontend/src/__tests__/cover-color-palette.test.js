// Contopia — Cover Color Palette Unit Tests (STORY-023)
import { describe, it, expect } from 'vitest';
import { COVER_COLOR_PALETTE } from '../lib/cover-color-palette';

describe('COVER_COLOR_PALETTE', () => {
  // Positive Tests
  it('contains exactly 16 child-friendly colors', () => {
    expect(COVER_COLOR_PALETTE).toHaveLength(16);
  });

  it('each color entry has required fields: id, hex, nameKey', () => {
    COVER_COLOR_PALETTE.forEach((color) => {
      expect(color).toHaveProperty('id');
      expect(color).toHaveProperty('hex');
      expect(color).toHaveProperty('nameKey');
    });
  });

  it('all hex values are valid CSS hex codes starting with #', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    COVER_COLOR_PALETTE.forEach((color) => {
      expect(color.hex).toMatch(hexRegex);
    });
  });

  it('all color IDs are unique', () => {
    const ids = COVER_COLOR_PALETTE.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all nameKey values follow the "cover.colors.xxx" pattern', () => {
    COVER_COLOR_PALETTE.forEach((color) => {
      expect(color.nameKey).toMatch(/^cover\.colors\./);
    });
  });

  it('contains expected specific colors', () => {
    expect(COVER_COLOR_PALETTE).toContainEqual(
      expect.objectContaining({ id: 'sky-blue', hex: '#87CEEB' })
    );
    expect(COVER_COLOR_PALETTE).toContainEqual(
      expect.objectContaining({ id: 'ocean-blue', hex: '#1E90FF' })
    );
    expect(COVER_COLOR_PALETTE).toContainEqual(
      expect.objectContaining({ id: 'midnight', hex: '#1E1B4B' })
    );
  });

  it('hex values use uppercase for consistency', () => {
    COVER_COLOR_PALETTE.forEach((color) => {
      expect(color.hex).toBe(color.hex.toUpperCase());
    });
  });

  // Negative/Edge Case Tests
  it('does not contain any empty or null values', () => {
    COVER_COLOR_PALETTE.forEach((color) => {
      expect(color.id).not.toBeNull();
      expect(color.id).not.toBe('');
      expect(color.hex).not.toBeNull();
      expect(color.hex).not.toBe('');
      expect(color.nameKey).not.toBeNull();
      expect(color.nameKey).not.toBe('');
    });
  });

  it('does not contain invalid hex formats like 3-digit shorthand', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    COVER_COLOR_PALETTE.forEach((color) => {
      expect(color.hex.length).toBe(7); // # + 6 chars
      expect(color.hex).toMatch(hexRegex);
    });
  });

  it('does not contain duplicate hex values', () => {
    const hexes = COVER_COLOR_PALETTE.map((c) => c.hex);
    const uniqueHexes = new Set(hexes);
    expect(uniqueHexes.size).toBe(hexes.length);
  });
});