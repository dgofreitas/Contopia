// Contopia — CSS 3D Support Detection Tests (STORY-041)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supportsPreserve3d, resetCachedSupport } from '../lib/css-3d-support.js';

describe('supportsPreserve3d', () => {
  beforeEach(() => {
    resetCachedSupport();
  });

  afterEach(() => {
    resetCachedSupport();
  });

  // ── Positive: CSS.supports returns true + runtime probe passes ──────────

  it('returns true when CSS.supports("transform-style", "preserve-3d") is supported and runtime probe passes', () => {
    // Mock CSS.supports to return true
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: vi.fn(() => true) };

    // Stub runtime probe: getComputedStyle returns preserve-3d, inner transform != none
    const origGetComputedStyle = globalThis.getComputedStyle;
    let callCount = 0;
    globalThis.getComputedStyle = vi.fn(() => {
      callCount++;
      if (callCount === 1) return { transformStyle: 'preserve-3d' };
      return { transform: 'matrix3d(...)' };
    });

    const result = supportsPreserve3d();

    expect(result).toBe(true);
    expect(CSS.supports).toHaveBeenCalledWith('transform-style', 'preserve-3d');

    // Restore
    globalThis.CSS = origCSS;
    globalThis.getComputedStyle = origGetComputedStyle;
  });

  // ── Negative: CSS is undefined ──────────────────────────────────────────

  it('returns false when CSS is undefined', () => {
    const origCSS = globalThis.CSS;
    delete globalThis.CSS;

    const result = supportsPreserve3d();

    expect(result).toBe(false);

    globalThis.CSS = origCSS;
  });

  // ── Negative: CSS.supports is not a function ────────────────────────────

  it('returns false when CSS.supports is not a function', () => {
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: 'not-a-function' };

    const result = supportsPreserve3d();

    expect(result).toBe(false);

    globalThis.CSS = origCSS;
  });

  // ── Negative: CSS.supports returns false ────────────────────────────────

  it('returns false when CSS.supports returns false (feature unsupported)', () => {
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: vi.fn(() => false) };

    const result = supportsPreserve3d();

    expect(result).toBe(false);
    expect(CSS.supports).toHaveBeenCalledWith('transform-style', 'preserve-3d');

    globalThis.CSS = origCSS;
  });

  // ── Negative: runtime probe fails (computed style != preserve-3d) ───────

  it('returns false when runtime probe computed style is not preserve-3d', () => {
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: vi.fn(() => true) };

    const origGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = vi.fn(() => ({
      transformStyle: 'flat',
      transform: 'matrix3d(...)',
    }));

    const result = supportsPreserve3d();

    expect(result).toBe(false);

    globalThis.CSS = origCSS;
    globalThis.getComputedStyle = origGetComputedStyle;
  });

  // ── Negative: runtime probe fails (inner transform === none) ────────────

  it('returns false when runtime probe inner transform is "none"', () => {
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: vi.fn(() => true) };

    const origGetComputedStyle = globalThis.getComputedStyle;
    let callCount = 0;
    globalThis.getComputedStyle = vi.fn(() => {
      callCount++;
      if (callCount === 1) return { transformStyle: 'preserve-3d' };
      return { transform: 'none' };
    });

    const result = supportsPreserve3d();

    expect(result).toBe(false);

    globalThis.CSS = origCSS;
    globalThis.getComputedStyle = origGetComputedStyle;
  });

  // ── Caching: subsequent calls return cached result without re-probing ───

  it('caches the result and does not re-call CSS.supports on subsequent calls', () => {
    const supportsMock = vi.fn(() => true);
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: supportsMock };

    const origGetComputedStyle = globalThis.getComputedStyle;
    let callCount = 0;
    globalThis.getComputedStyle = vi.fn(() => {
      callCount++;
      if (callCount === 1) return { transformStyle: 'preserve-3d' };
      return { transform: 'matrix3d(...)' };
    });

    // First call
    const result1 = supportsPreserve3d();
    expect(result1).toBe(true);
    expect(supportsMock).toHaveBeenCalledTimes(1);

    // Second call — should use cache
    const result2 = supportsPreserve3d();
    expect(result2).toBe(true);
    expect(supportsMock).toHaveBeenCalledTimes(1); // still 1

    globalThis.CSS = origCSS;
    globalThis.getComputedStyle = origGetComputedStyle;
  });

  // ── resetCachedSupport: clears cache, next call re-probes ───────────────

  it('resetCachedSupport clears cached result and forces re-probe', () => {
    const supportsMock = vi.fn(() => true);
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: supportsMock };

    const origGetComputedStyle = globalThis.getComputedStyle;
    let callCount = 0;
    globalThis.getComputedStyle = vi.fn(() => {
      callCount++;
      if (callCount <= 2) return { transformStyle: 'preserve-3d' };
      return { transform: 'matrix3d(...)' };
    });

    // First call — probes
    const result1 = supportsPreserve3d();
    expect(result1).toBe(true);
    expect(supportsMock).toHaveBeenCalledTimes(1);

    // Second call — cached
    supportsPreserve3d();
    expect(supportsMock).toHaveBeenCalledTimes(1);

    // Reset
    resetCachedSupport();

    // Third call — re-probes
    supportsPreserve3d();
    expect(supportsMock).toHaveBeenCalledTimes(2);

    globalThis.CSS = origCSS;
    globalThis.getComputedStyle = origGetComputedStyle;
  });

  // ── runtimeProbe creates and removes DOM elements ───────────────────────

  it('runtime probe creates and removes DOM elements from the document', () => {
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: vi.fn(() => true) };

    const origGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = vi.fn(() => ({
      transformStyle: 'preserve-3d',
      transform: 'matrix3d(...)',
    }));

    const appendSpy = vi.fn();
    const removeSpy = vi.fn();
    const origAppendChild = document.documentElement.appendChild;
    const origRemoveChild = document.documentElement.removeChild;
    document.documentElement.appendChild = appendSpy;
    document.documentElement.removeChild = removeSpy;

    supportsPreserve3d();

    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);

    document.documentElement.appendChild = origAppendChild;
    document.documentElement.removeChild = origRemoveChild;
    globalThis.CSS = origCSS;
    globalThis.getComputedStyle = origGetComputedStyle;
    resetCachedSupport();
  });
});

describe('resetCachedSupport', () => {
  it('resets internal cache to undefined', () => {
    // Prime cache
    const origCSS = globalThis.CSS;
    globalThis.CSS = { supports: vi.fn(() => false) };

    supportsPreserve3d();

    resetCachedSupport();

    // Next call should re-probe (if we change CSS.supports, result changes)
    globalThis.CSS = { supports: vi.fn(() => true) };
    const origGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = vi.fn(() => ({
      transformStyle: 'preserve-3d',
      transform: 'matrix3d(...)',
    }));

    const result = supportsPreserve3d();

    // Should reflect new environment
    expect(result).toBe(true);

    globalThis.CSS = origCSS;
    globalThis.getComputedStyle = origGetComputedStyle;
  });
});
