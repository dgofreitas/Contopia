import { describe, it, expect } from 'vitest';
import { overlayVariants, slideVariants, fadeVariants } from '../variants.js';
import { EASINGS, DURATIONS } from '../config.js';

describe('animation/variants', () => {
  describe('overlayVariants', () => {
    it('returns empty objects when reducedMotion is true', () => {
      const { backdrop, panel } = overlayVariants(true);
      expect(backdrop).toEqual({});
      expect(panel).toEqual({});
    });

    it('returns backdrop and panel variants when reducedMotion is false', () => {
      const { backdrop, panel } = overlayVariants(false);
      expect(backdrop.initial).toEqual({ opacity: 0 });
      expect(backdrop.animate).toEqual({ opacity: 1 });
      expect(backdrop.exit).toEqual({ opacity: 0 });
      expect(backdrop.transition.duration).toBe(DURATIONS.fast);
    });

    it('panel variants have scale and opacity', () => {
      const { panel } = overlayVariants(false);
      expect(panel.initial).toEqual({ opacity: 0, scale: 0.9 });
      expect(panel.animate).toEqual({ opacity: 1, scale: 1 });
      expect(panel.exit).toEqual({ opacity: 0, scale: 0.9 });
      expect(panel.transition.ease).toEqual(EASINGS.easeOut);
    });
  });

  describe('slideVariants', () => {
    it('returns empty variants when reducedMotion is true', () => {
      const variants = slideVariants(1, true);
      expect(variants.initial).toEqual({});
      expect(variants.animate).toEqual({});
      expect(variants.exit).toEqual({});
    });

    it('returns slide-right variants for direction=1 (forward)', () => {
      const variants = slideVariants(1, false);
      expect(variants.initial.x).toBe('100%');
      expect(variants.animate.x).toBe(0);
      expect(variants.exit.x).toBe('-100%');
    });

    it('returns slide-left variants for direction=-1 (backward)', () => {
      const variants = slideVariants(-1, false);
      expect(variants.initial.x).toBe('-100%');
      expect(variants.animate.x).toBe(0);
      expect(variants.exit.x).toBe('100%');
    });

    it('includes transition with easeOut and moderate duration', () => {
      const variants = slideVariants(1, false);
      expect(variants.transition.duration).toBe(DURATIONS.moderate);
      expect(variants.transition.ease).toEqual(EASINGS.easeOut);
    });
  });

  describe('fadeVariants', () => {
    it('returns empty object when reducedMotion is true', () => {
      const variants = fadeVariants(true);
      expect(variants).toEqual({});
    });

    it('returns fade-up variants when reducedMotion is false', () => {
      const variants = fadeVariants(false);
      expect(variants.initial).toEqual({ opacity: 0, y: 16 });
      expect(variants.animate).toEqual({ opacity: 1, y: 0 });
      expect(variants.exit).toEqual({ opacity: 0, y: 16 });
    });

    it('uses easeOut and normal duration in transition', () => {
      const variants = fadeVariants(false);
      expect(variants.transition.duration).toBe(DURATIONS.normal);
      expect(variants.transition.ease).toEqual(EASINGS.easeOut);
    });
  });
});