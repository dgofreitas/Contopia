// Contopia — Validation Schemas Tests (STORY-028)
import { describe, it, expect } from 'vitest';
import {
  bookUpdateSchema,
  bookCreateSchema,
  stickerSchema,
} from '../validation-schemas.js';

describe('bookUpdateSchema', () => {
  describe('default_font field', () => {
    it('accepts sans-serif', () => {
      const result = bookUpdateSchema.safeParse({ default_font: 'sans-serif' });
      expect(result.success).toBe(true);
    });

    it('accepts serif', () => {
      const result = bookUpdateSchema.safeParse({ default_font: 'serif' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid font value', () => {
      const result = bookUpdateSchema.safeParse({ default_font: 'monospace' });
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = bookUpdateSchema.safeParse({ default_font: '' });
      expect(result.success).toBe(false);
    });

    it('is optional — omitted is valid', () => {
      const result = bookUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('coverColor field', () => {
    it('accepts valid 6-char hex', () => {
      const result = bookUpdateSchema.safeParse({ coverColor: '#F87171' });
      expect(result.success).toBe(true);
    });

    it('accepts lowercase hex', () => {
      const result = bookUpdateSchema.safeParse({ coverColor: '#f87171' });
      expect(result.success).toBe(true);
    });

    it('rejects hex without hash', () => {
      const result = bookUpdateSchema.safeParse({ coverColor: 'F87171' });
      expect(result.success).toBe(false);
    });

    it('rejects short hex', () => {
      const result = bookUpdateSchema.safeParse({ coverColor: '#F87' });
      expect(result.success).toBe(false);
    });

    it('accepts null', () => {
      const result = bookUpdateSchema.safeParse({ coverColor: null });
      expect(result.success).toBe(true);
    });

    it('is optional', () => {
      const result = bookUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('coverPattern field', () => {
    it('accepts known patterns', () => {
      for (const p of ['none', 'stripes', 'dots', 'stars', 'chevron', 'waves']) {
        const result = bookUpdateSchema.safeParse({ coverPattern: p });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid pattern', () => {
      const result = bookUpdateSchema.safeParse({ coverPattern: 'zigzag' });
      expect(result.success).toBe(false);
    });

    it('accepts null', () => {
      const result = bookUpdateSchema.safeParse({ coverPattern: null });
      expect(result.success).toBe(true);
    });
  });

  describe('spineColor field', () => {
    it('accepts valid hex', () => {
      const result = bookUpdateSchema.safeParse({ spineColor: '#FF6B6B' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid hex', () => {
      const result = bookUpdateSchema.safeParse({ spineColor: '#GGHHII' });
      expect(result.success).toBe(false);
    });

    it('accepts null', () => {
      const result = bookUpdateSchema.safeParse({ spineColor: null });
      expect(result.success).toBe(true);
    });
  });

  describe('spineCustomized field', () => {
    it('accepts boolean true', () => {
      const result = bookUpdateSchema.safeParse({ spineCustomized: true });
      expect(result.success).toBe(true);
    });

    it('accepts boolean false', () => {
      const result = bookUpdateSchema.safeParse({ spineCustomized: false });
      expect(result.success).toBe(true);
    });

    it('rejects non-boolean', () => {
      const result = bookUpdateSchema.safeParse({ spineCustomized: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  describe('edgeColor field', () => {
    it('accepts valid hex', () => {
      const result = bookUpdateSchema.safeParse({ edgeColor: '#123456' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid hex', () => {
      const result = bookUpdateSchema.safeParse({ edgeColor: '#xyz' });
      expect(result.success).toBe(false);
    });

    it('accepts null', () => {
      const result = bookUpdateSchema.safeParse({ edgeColor: null });
      expect(result.success).toBe(true);
    });
  });

  describe('edgePattern field', () => {
    it('accepts known patterns', () => {
      for (const p of ['solid', 'gradient', 'marbling', 'dots', 'chevron']) {
        const result = bookUpdateSchema.safeParse({ edgePattern: p });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid pattern', () => {
      const result = bookUpdateSchema.safeParse({ edgePattern: 'stripes' });
      expect(result.success).toBe(false);
    });
  });

  describe('coverTitle field', () => {
    it('accepts string up to 120 chars', () => {
      const result = bookUpdateSchema.safeParse({ coverTitle: 'My Custom Title' });
      expect(result.success).toBe(true);
    });

    it('accepts null', () => {
      const result = bookUpdateSchema.safeParse({ coverTitle: null });
      expect(result.success).toBe(true);
    });
  });

  describe('stickers field', () => {
    it('accepts array of valid stickers', () => {
      const result = bookUpdateSchema.safeParse({
        stickers: [
          { svgId: 'star', x: 50, y: 50, scale: 1 },
          { svgId: 'heart', x: 25, y: 75 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('defaults to empty array when omitted', () => {
      const result = bookUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stickers).toEqual([]);
      }
    });

    it('rejects more than 10 stickers', () => {
      const stickers = Array.from({ length: 11 }, (_, i) => ({
        svgId: `s${i}`, x: 50, y: 50,
      }));
      const result = bookUpdateSchema.safeParse({ stickers });
      expect(result.success).toBe(false);
    });
  });
});

describe('stickerSchema', () => {
  it('accepts sticker with all fields', () => {
    const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50, scale: 1.5 });
    expect(result.success).toBe(true);
  });

  it('defaults scale to 1', () => {
    const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scale).toBe(1);
    }
  });

  it('rejects scale below 0.5', () => {
    const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50, scale: 0.4 });
    expect(result.success).toBe(false);
  });

  it('rejects scale above 2', () => {
    const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 50, scale: 2.1 });
    expect(result.success).toBe(false);
  });

  it('rejects x below 0', () => {
    const result = stickerSchema.safeParse({ svgId: 'star', x: -1, y: 50 });
    expect(result.success).toBe(false);
  });

  it('rejects x above 100', () => {
    const result = stickerSchema.safeParse({ svgId: 'star', x: 101, y: 50 });
    expect(result.success).toBe(false);
  });

  it('rejects y below 0', () => {
    const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects y above 100', () => {
    const result = stickerSchema.safeParse({ svgId: 'star', x: 50, y: 101 });
    expect(result.success).toBe(false);
  });
});

describe('bookCreateSchema', () => {
  it('accepts valid minimal input', () => {
    const result = bookCreateSchema.safeParse({ title: 'My Book' });
    expect(result.success).toBe(true);
  });

  it('defaults description to empty string', () => {
    const result = bookCreateSchema.safeParse({ title: 'My Book' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
    }
  });

  it('defaults language to pt-BR', () => {
    const result = bookCreateSchema.safeParse({ title: 'My Book' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('pt-BR');
    }
  });

  it('rejects empty title', () => {
    const result = bookCreateSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 120 chars', () => {
    const result = bookCreateSchema.safeParse({ title: 'A'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('accepts title of exactly 120 chars', () => {
    const result = bookCreateSchema.safeParse({ title: 'A'.repeat(120) });
    expect(result.success).toBe(true);
  });

  it('rejects description exceeding 500 chars', () => {
    const result = bookCreateSchema.safeParse({ title: 'My Book', description: 'X'.repeat(501) });
    expect(result.success).toBe(false);
  });
});
