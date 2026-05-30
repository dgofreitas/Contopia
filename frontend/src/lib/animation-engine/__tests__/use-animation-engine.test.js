import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useAnimationEngine } from '../use-animation-engine.js';

describe('useAnimationEngine', () => {
  it('returns animate, stagger, prefersReducedMotion, isPaused', () => {
    const { result } = renderHook(() => useAnimationEngine());

    expect(result.current.animate).toBeTypeOf('function');
    expect(result.current.stagger).toBeTypeOf('function');
    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });
});