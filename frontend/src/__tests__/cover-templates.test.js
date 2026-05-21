// Contopia — Cover Templates Unit Tests (STORY-022)
import { describe, it, expect } from 'vitest';
import { COVER_TEMPLATES } from '../lib/cover-templates';

describe('COVER_TEMPLATES', () => {
  it('exports exactly 15 templates', () => {
    expect(COVER_TEMPLATES).toHaveLength(15);
  });

  it('every template has a unique id', () => {
    const ids = COVER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every template has all required fields', () => {
    const requiredFields = ['id', 'nameKey', 'descriptionKey', 'background', 'decoration', 'textColor', 'accentColor'];
    for (const template of COVER_TEMPLATES) {
      for (const field of requiredFields) {
        expect(template).toHaveProperty(field);
      }
    }
  });

  it('every template has a non-empty id', () => {
    for (const template of COVER_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(typeof template.id).toBe('string');
    }
  });

  it('every template has a nameKey starting with cover.templates.', () => {
    for (const template of COVER_TEMPLATES) {
      expect(template.nameKey).toMatch(/^cover\.templates\./);
    }
  });

  it('every template has a descriptionKey starting with cover.templates.', () => {
    for (const template of COVER_TEMPLATES) {
      expect(template.descriptionKey).toMatch(/^cover\.templates\./);
    }
  });

  it('every template has valid background type', () => {
    const validTypes = ['gradient', 'pattern'];
    for (const template of COVER_TEMPLATES) {
      expect(validTypes).toContain(template.background.type);
      expect(Array.isArray(template.background.colors)).toBe(true);
      expect(template.background.colors.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every template has a decoration type', () => {
    for (const template of COVER_TEMPLATES) {
      expect(template.decoration).toHaveProperty('type');
      expect(typeof template.decoration.type).toBe('string');
      expect(template.decoration.type.length).toBeGreaterThan(0);
    }
  });

  it('every template has valid textColor hex', () => {
    for (const template of COVER_TEMPLATES) {
      expect(template.textColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('every template has valid accentColor hex', () => {
    for (const template of COVER_TEMPLATES) {
      expect(template.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('id field matches cover-template--{id} class naming convention', () => {
    for (const template of COVER_TEMPLATES) {
      // The class `cover-template--{id}` is used in TemplateCard and CoverPreview
      expect(template.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('does not contain any templates with empty decoration', () => {
    for (const template of COVER_TEMPLATES) {
      expect(template.decoration.type).toBeTruthy();
    }
  });

  it('rainbow template has 6 colors (one per band)', () => {
    const rainbow = COVER_TEMPLATES.find((t) => t.id === 'rainbow');
    expect(rainbow).toBeDefined();
    expect(rainbow.background.colors).toHaveLength(6);
  });

  it('galaxy template has specific colors', () => {
    const galaxy = COVER_TEMPLATES.find((t) => t.id === 'galaxy');
    expect(galaxy).toBeDefined();
    expect(galaxy.background.colors).toEqual(['#0f0c29', '#302b63', '#24243e']);
    expect(galaxy.textColor).toBe('#ffffff');
    expect(galaxy.accentColor).toBe('#ffd700');
  });

  it('stripe template uses dark text on light pattern for contrast', () => {
    const stripes = COVER_TEMPLATES.find((t) => t.id === 'stripes');
    expect(stripes).toBeDefined();
    expect(stripes.textColor).toBe('#1f2937');
  });
});
