// Contopia — spine-colors.js unit tests
import { describe, it, expect } from 'vitest';
import {
  SPINE_PALETTE,
  isLightColor,
  getTextColor,
  spineColorFromId,
  getSpineColorFromId,
} from '../lib/spine-colors';

describe('spine-colors', () => {
  describe('SPINE_PALETTE', () => {
    it('has 7 colors', () => {
      expect(SPINE_PALETTE).toHaveLength(7);
    });

    it('contains valid hex colors', () => {
      const hexRegex = /^#[0-9A-F]{6}$/i;
      SPINE_PALETTE.forEach((color) => {
        expect(color).toMatch(hexRegex);
      });
    });
  });

  describe('isLightColor', () => {
    it('returns true for #FFEAA7 (yellow)', () => {
      expect(isLightColor('#FFEAA7')).toBe(true);
    });

    it('returns false for #FF6B6B (red)', () => {
      expect(isLightColor('#FF6B6B')).toBe(false);
    });

    it('returns true for light green #78C6A9', () => {
      expect(isLightColor('#78C6A9')).toBe(true);
    });

    it('returns true for mint #98D8C8', () => {
      expect(isLightColor('#98D8C8')).toBe(true);
    });

    it('returns false for dark colors', () => {
      expect(isLightColor('#1A1A1A')).toBe(false);
    });

    it('returns false for #000000 (pure black)', () => {
      expect(isLightColor('#000000')).toBe(false);
    });

    it('returns true for #FFFFFF (pure white)', () => {
      expect(isLightColor('#FFFFFF')).toBe(true);
    });
  });

  describe('getTextColor', () => {
    it('returns #1A1A1A for light colors', () => {
      expect(getTextColor('#FFEAA7')).toBe('#1A1A1A');
    });

    it('returns #FFFFFF for dark colors', () => {
      expect(getTextColor('#FF6B6B')).toBe('#FFFFFF');
    });

    it('returns #1A1A1A for #FFFFFF', () => {
      expect(getTextColor('#FFFFFF')).toBe('#1A1A1A');
    });

    it('returns #FFFFFF for #1A1A1A', () => {
      expect(getTextColor('#1A1A1A')).toBe('#FFFFFF');
    });
  });

  describe('spineColorFromId', () => {
    it('returns first palette color for null', () => {
      expect(spineColorFromId(null)).toBe(SPINE_PALETTE[0]);
    });

    it('returns first palette color for undefined', () => {
      expect(spineColorFromId(undefined)).toBe(SPINE_PALETTE[0]);
    });

    it('returns first palette color for empty string', () => {
      expect(spineColorFromId('')).toBe(SPINE_PALETTE[0]);
    });

    it('returns deterministic color for same ID', () => {
      const id = 'test-book-id';
      const color1 = spineColorFromId(id);
      const color2 = spineColorFromId(id);
      expect(color1).toBe(color2);
    });

    it('returns different colors for different IDs', () => {
      const color1 = spineColorFromId('book-1');
      const color2 = spineColorFromId('book-2');
      expect(color1).not.toBe(color2);
    });

    it('returns color from palette for numeric ID', () => {
      const color = spineColorFromId(123);
      expect(SPINE_PALETTE).toContain(color);
    });

    it('returns color from palette for string ID', () => {
      const color = spineColorFromId('abc123');
      expect(SPINE_PALETTE).toContain(color);
    });

    it('distributes IDs across palette', () => {
      const colors = new Set();
      for (let i = 0; i < 20; i++) {
        colors.add(spineColorFromId(`book-${i}`));
      }
      // Should use at least 5 different colors out of 7
      expect(colors.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getSpineColorFromId', () => {
    it('is an alias for spineColorFromId', () => {
      expect(getSpineColorFromId).toBe(spineColorFromId);
    });

    it('behaves the same as spineColorFromId', () => {
      const id = 'test-alias';
      expect(getSpineColorFromId(id)).toBe(spineColorFromId(id));
    });
  });
});