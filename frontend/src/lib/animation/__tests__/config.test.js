import { describe, it, expect } from 'vitest';
import { EASINGS, SPRINGS, DURATIONS, STAGGER } from '../config.js';

describe('animation/config', () => {
  describe('EASINGS', () => {
    it('exports easeOut as a cubic bezier array', () => {
      expect(Array.isArray(EASINGS.easeOut)).toBe(true);
      expect(EASINGS.easeOut).toHaveLength(4);
      expect(EASINGS.easeOut).toEqual([0.25, 0.1, 0.25, 1]);
    });

    it('exports easeInOut as a cubic bezier array', () => {
      expect(Array.isArray(EASINGS.easeInOut)).toBe(true);
      expect(EASINGS.easeInOut).toHaveLength(4);
    });

    it('exports anticipate as a cubic bezier array', () => {
      expect(Array.isArray(EASINGS.anticipate)).toBe(true);
      expect(EASINGS.anticipate).toHaveLength(4);
    });
  });

  describe('SPRINGS', () => {
    it('exports gentle with stiffness and damping', () => {
      expect(SPRINGS.gentle).toHaveProperty('stiffness');
      expect(SPRINGS.gentle).toHaveProperty('damping');
    });

    it('exports bouncy with stiffness and damping', () => {
      expect(SPRINGS.bouncy).toEqual({ stiffness: 300, damping: 20 });
    });

    it('exports stiff with stiffness and damping', () => {
      expect(SPRINGS.stiff).toHaveProperty('stiffness');
      expect(SPRINGS.stiff).toHaveProperty('damping');
    });

    it('exports snappy with stiffness and damping', () => {
      expect(SPRINGS.snappy).toHaveProperty('stiffness');
      expect(SPRINGS.snappy).toHaveProperty('damping');
    });
  });

  describe('DURATIONS', () => {
    it('has instant = 0', () => {
      expect(DURATIONS.instant).toBe(0);
    });

    it('has fast = 0.15', () => {
      expect(DURATIONS.fast).toBe(0.15);
    });

    it('has normal = 0.2', () => {
      expect(DURATIONS.normal).toBe(0.2);
    });

    it('has moderate = 0.3', () => {
      expect(DURATIONS.moderate).toBe(0.3);
    });

    it('has slow = 0.5', () => {
      expect(DURATIONS.slow).toBe(0.5);
    });
  });

  describe('STAGGER', () => {
    it('has perElementMs = 30', () => {
      expect(STAGGER.perElementMs).toBe(30);
    });

    it('has maxMs = 300', () => {
      expect(STAGGER.maxMs).toBe(300);
    });
  });
});