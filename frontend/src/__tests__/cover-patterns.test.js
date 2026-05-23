// Contopia — Cover Patterns Unit Tests (STORY-023)
import { describe, it, expect } from 'vitest';
import { COVER_PATTERNS } from '../lib/cover-patterns';

describe('COVER_PATTERNS', () => {
  // Positive Tests
  it('contains exactly 6 pattern options', () => {
    expect(COVER_PATTERNS).toHaveLength(6);
  });

  it('each pattern entry has required fields: id, nameKey, type, cssClass', () => {
    COVER_PATTERNS.forEach((pattern) => {
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('nameKey');
      expect(pattern).toHaveProperty('type');
      expect(pattern).toHaveProperty('cssClass');
    });
  });

  it('all pattern IDs are unique', () => {
    const ids = COVER_PATTERNS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all nameKey values follow the "cover.patterns.xxx" pattern', () => {
    COVER_PATTERNS.forEach((pattern) => {
      expect(pattern.nameKey).toMatch(/^cover\.patterns\./);
    });
  });

  it('contains the "none" pattern', () => {
    const nonePattern = COVER_PATTERNS.find((p) => p.id === 'none');
    expect(nonePattern).toBeDefined();
    expect(nonePattern.type).toBe('none');
    expect(nonePattern.cssClass).toBeNull();
  });

  it('gradient patterns have valid cssClass strings', () => {
    const gradientPatterns = COVER_PATTERNS.filter((p) => p.type === 'gradient');
    gradientPatterns.forEach((pattern) => {
      expect(pattern.cssClass).toBeTruthy();
      expect(typeof pattern.cssClass).toBe('string');
      expect(pattern.cssClass).toMatch(/^cover-pattern--/);
    });
  });

  it('contains expected specific patterns', () => {
    expect(COVER_PATTERNS).toContainEqual(
      expect.objectContaining({ id: 'stripes' })
    );
    expect(COVER_PATTERNS).toContainEqual(
      expect.objectContaining({ id: 'dots' })
    );
    expect(COVER_PATTERNS).toContainEqual(
      expect.objectContaining({ id: 'stars' })
    );
  });

  // Negative/Edge Case Tests
  it('does not contain any empty or null values for id, nameKey, type', () => {
    COVER_PATTERNS.forEach((pattern) => {
      expect(pattern.id).not.toBeNull();
      expect(pattern.id).not.toBe('');
      expect(pattern.nameKey).not.toBeNull();
      expect(pattern.nameKey).not.toBe('');
      expect(pattern.type).not.toBeNull();
      expect(pattern.type).not.toBe('');
    });
  });

  it('does not allow non-unique CSS classes (except null)', () => {
    const cssClasses = COVER_PATTERNS
      .map((p) => p.cssClass)
      .filter((cls) => cls !== null);
    const uniqueClasses = new Set(cssClasses);
    expect(uniqueClasses.size).toBe(cssClasses.length);
  });

  it('type field only contains "none" or "gradient"', () => {
    COVER_PATTERNS.forEach((pattern) => {
      expect(['none', 'gradient']).toContain(pattern.type);
    });
  });

  it('cssClass is null only for type "none"', () => {
    const nonePattern = COVER_PATTERNS.find((p) => p.id === 'none');
    expect(nonePattern.cssClass).toBeNull();

    const gradientPatterns = COVER_PATTERNS.filter((p) => p.type === 'gradient');
    gradientPatterns.forEach((pattern) => {
      expect(pattern.cssClass).not.toBeNull();
    });
  });
});