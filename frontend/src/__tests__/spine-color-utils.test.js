import { describe, it, expect } from 'vitest';
import { deriveSpineColor } from '../lib/spine-color-utils';
import { SPINE_PALETTE, spineColorFromId } from '../lib/spine-colors';

describe('deriveSpineColor', () => {
  it('returns coverColor when provided', () => {
    expect(deriveSpineColor({ coverColor: '#FF6B6B', template: 'galaxy', bookId: 'b1' })).toBe('#FF6B6B');
  });

  it("returns template's first background color when no coverColor but template is provided", () => {
    const result = deriveSpineColor({ coverColor: null, template: 'galaxy', bookId: 'b1' });
    expect(result).toBe('#0f0c29');
  });

  it('returns deterministic color via spineColorFromId when neither coverColor nor template', () => {
    const result = deriveSpineColor({ coverColor: null, template: null, bookId: 'book-abc' });
    expect(result).toBe(spineColorFromId('book-abc'));
    expect(SPINE_PALETTE).toContain(result);
  });

  it('returns null when nothing is set', () => {
    expect(deriveSpineColor({ coverColor: null, template: null, bookId: null })).toBeNull();
    expect(deriveSpineColor({})).toBeNull();
  });
});