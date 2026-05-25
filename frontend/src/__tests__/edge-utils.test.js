// Contopia — Edge Utils Unit Tests (STORY-026)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deriveEdgeColor } from '../lib/edge-utils';

// Mock spine-colors to return deterministic fallback
vi.mock('../lib/spine-colors', () => ({
  spineColorFromId: vi.fn((id) => {
    if (!id) return '#FF6B6B';
    const palette = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const idx = id.toString().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length;
    return palette[idx];
  }),
  isLightColor: vi.fn(),
  getTextColor: vi.fn(),
}));

// Mock cover-templates to provide test templates
vi.mock('../lib/cover-templates', () => ({
  COVER_TEMPLATES: [
    { id: 'galaxy', background: { type: 'gradient', colors: ['#0f0c29', '#302b63', '#24243e'] } },
    { id: 'ocean', background: { type: 'gradient', colors: ['#0d9488', '#0e7490', '#1e40af'] } },
    { id: 'simple', background: { type: 'solid', colors: [] } },
  ],
}));

describe('deriveEdgeColor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns edgeColor when edgeColor is set', () => {
    const result = deriveEdgeColor({
      edgeColor: '#FF6B6B',
      spineColor: '#4ECDC4',
      coverColor: '#45B7D1',
      template: 'galaxy',
      bookId: 'abc123',
    });
    expect(result).toBe('#FF6B6B');
  });

  it('returns spineColor when edgeColor is null and spineColor is set', () => {
    const result = deriveEdgeColor({
      edgeColor: null,
      spineColor: '#4ECDC4',
      coverColor: '#45B7D1',
      template: 'galaxy',
      bookId: 'abc123',
    });
    expect(result).toBe('#4ECDC4');
  });

  it('returns spineColor when edgeColor is undefined and spineColor is set', () => {
    const result = deriveEdgeColor({
      spineColor: '#4ECDC4',
      coverColor: '#45B7D1',
      template: 'galaxy',
      bookId: 'abc123',
    });
    expect(result).toBe('#4ECDC4');
  });

  it('returns coverColor when edgeColor and spineColor are null', () => {
    const result = deriveEdgeColor({
      edgeColor: null,
      spineColor: null,
      coverColor: '#45B7D1',
      template: 'galaxy',
      bookId: 'abc123',
    });
    expect(result).toBe('#45B7D1');
  });

  it('returns template first color when edgeColor, spineColor, coverColor are null', () => {
    const result = deriveEdgeColor({
      edgeColor: null,
      spineColor: null,
      coverColor: null,
      template: 'ocean',
      bookId: 'abc123',
    });
    expect(result).toBe('#0d9488');
  });

  it('returns bookId fallback when no color sources available', () => {
    const result = deriveEdgeColor({
      bookId: 'xyz789',
    });
    // Deterministic from char codes of 'xyz789'
    expect(result).toBeDefined();
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('returns null when nothing is provided', () => {
    const result = deriveEdgeColor({});
    expect(result).toBeNull();
  });

  it('returns null when all sources are null/undefined and no bookId', () => {
    const result = deriveEdgeColor({
      edgeColor: null,
      spineColor: null,
      coverColor: null,
      template: null,
      bookId: null,
    });
    expect(result).toBeNull();
  });

  it('returns null when template has no colors', () => {
    const result = deriveEdgeColor({
      edgeColor: null,
      spineColor: null,
      coverColor: null,
      template: 'simple',
      bookId: null,
    });
    expect(result).toBeNull();
  });

  it('ignores template when template id does not exist', () => {
    const result = deriveEdgeColor({
      edgeColor: null,
      spineColor: null,
      coverColor: null,
      template: 'nonexistent-template',
      bookId: null,
    });
    expect(result).toBeNull();
  });

  it('is deterministic — same inputs produce same output', () => {
    const inputs = {
      edgeColor: null,
      spineColor: '#96CEB4',
      coverColor: null,
      template: 'galaxy',
      bookId: 'test-id',
    };
    const result1 = deriveEdgeColor(inputs);
    const result2 = deriveEdgeColor(inputs);
    expect(result1).toBe(result2);
  });
});
