// Contopia — spine-colors.js unit tests (STORY-028 palette expansion)
import { describe, it, expect } from 'vitest';
import {
  SPINE_PALETTE,
  isLightColor,
  getTextColor,
  spineColorFromId,
  getSpineColorFromId,
} from '../lib/spine-colors';

describe('spine-colors (STORY-028)', () => {
  describe('SPINE_PALETTE', () => {
    it('has 12 colors (expanded from 7 to 12)', () => {
      expect(SPINE_PALETTE).toHaveLength(12);
    });

    it('contains valid hex colors', () => {
      const hexRegex = /^#[0-9A-F]{6}$/i;
      SPINE_PALETTE.forEach((color) => {
        expect(color).toMatch(hexRegex);
      });
    });

    it('contains original red #FF6B6B', () => {
      expect(SPINE_PALETTE).toContain('#FF6B6B');
    });

    it('contains new colors like #A78BFA (lavender)', () => {
      expect(SPINE_PALETTE).toContain('#A78BFA');
    });

    it('contains new colors like #1E1B4B (midnight)', () => {
      expect(SPINE_PALETTE).toContain('#1E1B4B');
    });
  });

  describe('isLightColor', () => {
    it('returns true for light colors', () => {
      expect(isLightColor('#FFEAA7')).toBe(true);
      expect(isLightColor('#78C6A9')).toBe(true);
      expect(isLightColor('#98D8C8')).toBe(true);
    });

    it('returns false for dark colors', () => {
      expect(isLightColor('#FF6B6B')).toBe(false);
      expect(isLightColor('#1A1A1A')).toBe(false);
      expect(isLightColor('#000000')).toBe(false);
      expect(isLightColor('#1E1B4B')).toBe(false);
    });

    it('returns true for pure white', () => {
      expect(isLightColor('#FFFFFF')).toBe(true);
    });

    it('returns false for pure black', () => {
      expect(isLightColor('#000000')).toBe(false);
    });

    it('handles #45B7D1 (sky blue) near threshold', () => {
      // brightness ≈ 0.596 > 0.595 → light
      expect(isLightColor('#45B7D1')).toBe(true);
    });

    it('handles #FF6B6B (red) near threshold', () => {
      // brightness ≈ 0.593 < 0.595 → dark
      expect(isLightColor('#FF6B6B')).toBe(false);
    });
  });

  describe('getTextColor', () => {
    it('returns #1A1A1A for light colors', () => {
      expect(getTextColor('#FFEAA7')).toBe('#1A1A1A');
    });

    it('returns #FFFFFF for dark colors', () => {
      expect(getTextColor('#FF6B6B')).toBe('#FFFFFF');
    });

    it('returns #FFFFFF for null/undefined', () => {
      expect(getTextColor(null)).toBe('#FFFFFF');
      expect(getTextColor(undefined)).toBe('#FFFFFF');
    });
  });

  describe('spineColorFromId', () => {
    it('returns first palette color for null/undefined/empty', () => {
      expect(spineColorFromId(null)).toBe(SPINE_PALETTE[0]);
      expect(spineColorFromId(undefined)).toBe(SPINE_PALETTE[0]);
      expect(spineColorFromId('')).toBe(SPINE_PALETTE[0]);
    });

    it('returns deterministic color for same ID', () => {
      const id = 'test-book-id';
      expect(spineColorFromId(id)).toBe(spineColorFromId(id));
    });

    it('returns color from palette', () => {
      const color = spineColorFromId('abc123');
      expect(SPINE_PALETTE).toContain(color);
    });

    it('distributes IDs across palette', () => {
      const colors = new Set();
      for (let i = 0; i < 25; i++) {
        colors.add(spineColorFromId(`book-${i}`));
      }
      expect(colors.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getSpineColorFromId (alias)', () => {
    it('is an alias for spineColorFromId', () => {
      expect(getSpineColorFromId).toBe(spineColorFromId);
    });

    it('returns same result', () => {
      expect(getSpineColorFromId('test')).toBe(spineColorFromId('test'));
    });
  });
});
