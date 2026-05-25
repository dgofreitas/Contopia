// Contopia — Edge Patterns Unit Tests (STORY-026)
import { describe, it, expect } from 'vitest';
import { EDGE_PATTERNS } from '../lib/edge-patterns';

describe('EDGE_PATTERNS', () => {
  it('has exactly 5 patterns', () => {
    expect(EDGE_PATTERNS).toHaveLength(5);
  });

  it('each pattern has required fields', () => {
    EDGE_PATTERNS.forEach((pattern) => {
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('nameKey');
      expect(pattern).toHaveProperty('type');
      expect(pattern).toHaveProperty('cssClass');
    });
  });

  it('has unique IDs', () => {
    const ids = EDGE_PATTERNS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('includes solid pattern as first entry', () => {
    expect(EDGE_PATTERNS[0].id).toBe('solid');
    expect(EDGE_PATTERNS[0].cssClass).toBe('cover-edge--solid');
  });

  it('includes gradient pattern', () => {
    const pattern = EDGE_PATTERNS.find((p) => p.id === 'gradient');
    expect(pattern).toBeDefined();
    expect(pattern.cssClass).toBe('cover-edge--gradient');
  });

  it('includes marbling pattern', () => {
    const pattern = EDGE_PATTERNS.find((p) => p.id === 'marbling');
    expect(pattern).toBeDefined();
    expect(pattern.cssClass).toBe('cover-edge--marbling');
  });

  it('includes dots pattern', () => {
    const pattern = EDGE_PATTERNS.find((p) => p.id === 'dots');
    expect(pattern).toBeDefined();
    expect(pattern.cssClass).toBe('cover-edge--dots');
  });

  it('includes chevron pattern', () => {
    const pattern = EDGE_PATTERNS.find((p) => p.id === 'chevron');
    expect(pattern).toBeDefined();
    expect(pattern.cssClass).toBe('cover-edge--chevron');
  });

  it('all nameKeys start with cover.edge.patterns', () => {
    EDGE_PATTERNS.forEach((pattern) => {
      expect(pattern.nameKey).toMatch(/^cover\.edge\.patterns\./);
    });
  });

  it('has valid CSS class names (cover-edge-- prefixed)', () => {
    EDGE_PATTERNS.forEach((pattern) => {
      expect(pattern.cssClass).toMatch(/^cover-edge--/);
    });
  });
});
