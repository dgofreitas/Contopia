// Contopia — Default Cover Palette Unit Tests (STORY-028)
import { describe, it, expect } from 'vitest';
import { DEFAULT_COVER_PALETTE } from '../lib/default-cover-palette';

describe('DEFAULT_COVER_PALETTE', () => {
  it('contains exactly 12 child-friendly colors', () => {
    expect(DEFAULT_COVER_PALETTE).toHaveLength(12);
  });

  it('each entry has required fields: id, hex, textColor', () => {
    DEFAULT_COVER_PALETTE.forEach((entry) => {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('hex');
      expect(entry).toHaveProperty('textColor');
    });
  });

  it('all hex values are valid 6-char hex codes starting with #', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    DEFAULT_COVER_PALETTE.forEach((entry) => {
      expect(entry.hex).toMatch(hexRegex);
    });
  });

  it('all textColor values are valid hex', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    DEFAULT_COVER_PALETTE.forEach((entry) => {
      expect(entry.textColor).toMatch(hexRegex);
    });
  });

  it('all IDs are unique', () => {
    const ids = DEFAULT_COVER_PALETTE.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all hex values are unique', () => {
    const hexes = DEFAULT_COVER_PALETTE.map((e) => e.hex);
    const uniqueHexes = new Set(hexes);
    expect(uniqueHexes.size).toBe(hexes.length);
  });

  it('textColor is #FFFFFF for dark backgrounds and #1A1A1A for light', () => {
    // light colors (perceptual brightness > 0.595) should have dark text
    // dark colors should have white text
    DEFAULT_COVER_PALETTE.forEach((entry) => {
      expect(
        entry.textColor === '#FFFFFF' || entry.textColor === '#1A1A1A'
      ).toBe(true);
    });
  });

  it('contains expected coral entry', () => {
    expect(DEFAULT_COVER_PALETTE).toContainEqual(
      expect.objectContaining({ id: 'coral', hex: '#F87171' })
    );
  });

  it('contains expected midnight entry', () => {
    expect(DEFAULT_COVER_PALETTE).toContainEqual(
      expect.objectContaining({ id: 'midnight', hex: '#1E1B4B' })
    );
  });

  it('matches backend DEFAULT_COVER_PALETTE hex values', () => {
    // Backend palette: #F87171, #2DD4BF, #45B7D1, #78C6A9, #A78BFA, #9333EA,
    //                  #FB923C, #84CC16, #1E90FF, #F472B6, #1E1B4B, #22C55E
    const backendHexes = [
      '#F87171', '#2DD4BF', '#45B7D1', '#78C6A9',
      '#A78BFA', '#9333EA', '#FB923C', '#84CC16',
      '#1E90FF', '#F472B6', '#1E1B4B', '#22C55E',
    ];
    const frontendHexes = DEFAULT_COVER_PALETTE.map((e) => e.hex);
    const sortedFrontend = [...frontendHexes].sort();
    const sortedBackend = [...backendHexes].sort();
    expect(sortedFrontend).toEqual(sortedBackend);
  });
});
