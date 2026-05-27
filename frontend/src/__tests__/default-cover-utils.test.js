// Contopia — Default Cover Utils Unit Tests (STORY-028)
import { describe, it, expect } from 'vitest';
import {
  getDefaultCoverColor,
  getDefaultTextColor,
  deriveDefaultEdgeColor,
} from '../lib/default-cover-utils';
import { DEFAULT_COVER_PALETTE } from '../lib/default-cover-palette';

describe('getDefaultCoverColor', () => {
  it('returns first palette hex when bookId is null', () => {
    expect(getDefaultCoverColor(null)).toBe(DEFAULT_COVER_PALETTE[0].hex);
  });

  it('returns first palette hex when bookId is undefined', () => {
    expect(getDefaultCoverColor(undefined)).toBe(DEFAULT_COVER_PALETTE[0].hex);
  });

  it('returns first palette hex when bookId is empty string', () => {
    expect(getDefaultCoverColor('')).toBe(DEFAULT_COVER_PALETTE[0].hex);
  });

  it('returns deterministic color for same bookId', () => {
    const id = '507f1f77bcf86cd799439011';
    const color1 = getDefaultCoverColor(id);
    const color2 = getDefaultCoverColor(id);
    expect(color1).toBe(color2);
  });

  it('returns a color from the palette', () => {
    const id = '507f1f77bcf86cd799439011';
    const color = getDefaultCoverColor(id);
    expect(DEFAULT_COVER_PALETTE.map((e) => e.hex)).toContain(color);
  });

  it('distributes IDs across palette', () => {
    const colors = new Set();
    for (let i = 0; i < 24; i++) {
      colors.add(getDefaultCoverColor(`book-${i}`));
    }
    expect(colors.size).toBeGreaterThan(1);
  });

  it('handles numeric ID', () => {
    const color = getDefaultCoverColor(12345);
    expect(DEFAULT_COVER_PALETTE.map((e) => e.hex)).toContain(color);
  });
});

describe('getDefaultTextColor', () => {
  it('returns #FFFFFF when bgHex is null', () => {
    expect(getDefaultTextColor(null)).toBe('#FFFFFF');
  });

  it('returns #FFFFFF when bgHex is undefined', () => {
    expect(getDefaultTextColor(undefined)).toBe('#FFFFFF');
  });

  it('returns #FFFFFF when bgHex is empty string', () => {
    expect(getDefaultTextColor('')).toBe('#FFFFFF');
  });

  it('returns dark text for light background (#F87171 coral is light)', () => {
    // #F87171 has r=248,g=113,b=113 → brightness ≈ 0.593 → isLight → yes
    // Actually 0.299*248 + 0.587*113 + 0.114*113 = 74+66+12 = 152/255 = 0.596
    // This is > 0.595, so it IS light → returns dark text
    const result = getDefaultTextColor('#F87171');
    expect(result).toBe('#1A1A1A');
  });

  it('returns white text for dark background (#A855F7)', () => {
    // #A855F7 has r=168,g=85,b=247 → brightness formula check
    const result = getDefaultTextColor('#A855F7');
    expect(result).toBe('#FFFFFF');
  });

  it('returns white text for midnight (#1E1B4B — very dark)', () => {
    expect(getDefaultTextColor('#1E1B4B')).toBe('#FFFFFF');
  });

  it('returns dark text for white background', () => {
    expect(getDefaultTextColor('#FFFFFF')).toBe('#1A1A1A');
  });

  it('returns white text for black background', () => {
    expect(getDefaultTextColor('#000000')).toBe('#FFFFFF');
  });
});

describe('deriveDefaultEdgeColor', () => {
  it('darkens red (#FF6B6B → #d62121)', () => {
    const result = deriveDefaultEdgeColor('#FF6B6B');
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    expect(parseInt(result.slice(1, 3), 16)).toBeLessThan(parseInt('FF', 16));
    });

    it('darkens teal (#4ECDC4)', () => {
      const result = deriveDefaultEdgeColor('#4ECDC4');
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(parseInt(result.slice(1, 3), 16)).toBeLessThan(parseInt('4E', 16));
    });

    it('darkens midnight (#1E1B4B)', () => {
      const result = deriveDefaultEdgeColor('#1E1B4B');
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      const r = parseInt(result.slice(1, 3), 16);
      expect(r).toBeGreaterThanOrEqual(0);
    });

    it('returns null when input is null', () => {
      expect(deriveDefaultEdgeColor(null)).toBeNull();
  });

  it('returns undefined when input is undefined', () => {
    expect(deriveDefaultEdgeColor(undefined)).toBeUndefined();
  });

  it('returns empty string when input is empty string', () => {
    expect(deriveDefaultEdgeColor('')).toBe('');
  });

  it('returns rgba strings as-is', () => {
    expect(deriveDefaultEdgeColor('rgba(0,0,0,0.2)')).toBe('rgba(0,0,0,0.2)');
  });

  it('returns short strings as-is', () => {
    expect(deriveDefaultEdgeColor('#fff')).toBe('#fff');
  });

  it('darkens pastel colors correctly', () => {
    const result = deriveDefaultEdgeColor('#FFEAA7');
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    expect(parseInt(result.slice(1, 3), 16)).toBeLessThan(parseInt('FF', 16));
  });

  it('ensures result is always valid hex (no negative channels)', () => {
    // Midnight is very dark — subtracting 50 from each channel should floor at 0
    const result = deriveDefaultEdgeColor('#1E1B4B');
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    const r = parseInt(result.slice(1, 3), 16);
    expect(r).toBeGreaterThanOrEqual(0);
  });
});
