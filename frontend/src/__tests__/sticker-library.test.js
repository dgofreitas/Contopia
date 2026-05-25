// Contopia — Sticker Library Unit Tests (STORY-024 §7.1)
import { describe, it, expect } from 'vitest';
import { STICKER_LIBRARY, STICKER_CATEGORIES, getStickerBySvgId, getStickersByCategory } from '../lib/sticker-library.jsx';

describe('STICKER_LIBRARY', () => {
  const categoryIds = new Set(STICKER_CATEGORIES.map((c) => c.id));

  it('should have at least 20 stickers', () => {
    expect(STICKER_LIBRARY.length).toBeGreaterThanOrEqual(20);
  });

  it('should have at most 30 stickers', () => {
    expect(STICKER_LIBRARY.length).toBeLessThanOrEqual(30);
  });

  it('should have exactly 25 stickers', () => {
    expect(STICKER_LIBRARY.length).toBe(25);
  });

  it('every sticker entry has all required fields', () => {
    for (const entry of STICKER_LIBRARY) {
      expect(entry).toHaveProperty('svgId');
      expect(typeof entry.svgId).toBe('string');
      expect(entry.svgId.length).toBeGreaterThan(0);

      expect(entry).toHaveProperty('nameKey');
      expect(typeof entry.nameKey).toBe('string');

      expect(entry).toHaveProperty('category');
      expect(typeof entry.category).toBe('string');

      expect(entry).toHaveProperty('component');
      expect(typeof entry.component).toBe('function');
    }
  });

  it('all svgIds are unique', () => {
    const svgIds = STICKER_LIBRARY.map((s) => s.svgId);
    const uniqueSvgIds = new Set(svgIds);
    expect(uniqueSvgIds.size).toBe(svgIds.length);
  });

  it('all categories reference valid category IDs', () => {
    for (const entry of STICKER_LIBRARY) {
      expect(categoryIds.has(entry.category)).toBe(true);
    }
  });

  it('every category has at least 2 stickers', () => {
    for (const cat of STICKER_CATEGORIES) {
      const count = STICKER_LIBRARY.filter((s) => s.category === cat.id).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  it('STICKER_CATEGORIES has at least 4 categories', () => {
    expect(STICKER_CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });
});

describe('STICKER_CATEGORIES', () => {
  it('every category has id and nameKey', () => {
    for (const cat of STICKER_CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(typeof cat.id).toBe('string');
      expect(cat).toHaveProperty('nameKey');
      expect(typeof cat.nameKey).toBe('string');
    }
  });

  it('category ids are unique', () => {
    const ids = STICKER_CATEGORIES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('getStickerBySvgId', () => {
  it('returns sticker entry for valid svgId', () => {
    const result = getStickerBySvgId('star');
    expect(result).not.toBeNull();
    expect(result.svgId).toBe('star');
    expect(result.component).toBeDefined();
  });

  it('returns null for unknown svgId', () => {
    const result = getStickerBySvgId('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getStickerBySvgId('')).toBeNull();
  });

  it('is case-sensitive', () => {
    const result = getStickerBySvgId('STAR');
    expect(result).toBeNull();
  });
});

describe('getStickersByCategory', () => {
  STICKER_CATEGORIES.forEach((cat) => {
    it(`returns correct stickers for category "${cat.id}"`, () => {
      const results = getStickersByCategory(cat.id);
      expect(results.length).toBeGreaterThan(0);
      for (const s of results) {
        expect(s.category).toBe(cat.id);
      }
    });
  });

  it('returns empty array for unknown category', () => {
    const results = getStickersByCategory('nonexistent');
    expect(results).toEqual([]);
  });
});
