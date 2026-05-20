// Contopia — Sanitize Content Unit Tests (STORY-018)
import { describe, it, expect } from 'vitest';
import { sanitizeChapterContent, ALLOWED_TAGS, ALLOWED_ATTR } from '../sanitize-content.js';

describe('sanitizeChapterContent', () => {
  // ── Allowed tags ────────────────────────────────────────────────────────────

  it('preserves allowed tags: p, br, strong, em, h2, hr, span', () => {
    const input = '<p>Hello <strong>bold</strong> and <em>italic</em></p><h2>Heading</h2><hr><span class="mark">text</span><br>';
    const result = sanitizeChapterContent(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('<h2>');
    expect(result).toContain('<hr>');
    expect(result).toContain('<span class="mark">');
    expect(result).toContain('<br>');
  });

  it('preserves class attribute on allowed tags', () => {
    const input = '<p class="intro">Hello</p>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('<p class="intro">Hello</p>');
  });

  // ── Strips scripts and dangerous content ─────────────────────────────────────

  it('strips script tags and preserves surrounding text', () => {
    const input = '<script>alert(1)</script><p>Hello</p>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('<p>Hello</p>');
  });

  it('strips img tags with onerror', () => {
    const input = '<img src=x onerror=alert(1)>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('');
  });

  it('strips javascript: URLs in anchor tags', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('click');
  });

  it('strips SVG with onload event', () => {
    const input = '<svg onload=alert(1)>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('');
  });

  it('strips style tags', () => {
    const input = '<style>body{color:red}</style><p>text</p>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('<p>text</p>');
  });

  it('strips inline event handlers from allowed tags', () => {
    const input = '<p onclick="alert(1)">Hello</p>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('<p>Hello</p>');
  });

  it('strips style attributes from allowed tags', () => {
    const input = '<p style="background:url(javascript:alert(1))">Hello</p>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('<p>Hello</p>');
  });

  it('strips disallowed tags but keeps text content', () => {
    const input = '<div><p>Hello</p></div>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('<p>Hello</p>');
  });

  it('strips iframe tags', () => {
    const input = '<iframe src="https://evil.com"></iframe><p>Safe</p>';
    const result = sanitizeChapterContent(input);
    expect(result).toBe('<p>Safe</p>');
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it('returns empty string for null input', () => {
    expect(sanitizeChapterContent(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(sanitizeChapterContent(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(sanitizeChapterContent('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    const result = sanitizeChapterContent('   ');
    expect(result.trim()).toBe('');
  });

  it('preserves plain text without HTML', () => {
    const result = sanitizeChapterContent('Hello world');
    expect(result).toBe('Hello world');
  });

  // ── Allowlist constants ─────────────────────────────────────────────────────

  it('exports correct ALLOWED_TAGS', () => {
    expect(ALLOWED_TAGS).toEqual(['p', 'br', 'strong', 'em', 'h2', 'hr', 'span']);
  });

  it('exports correct ALLOWED_ATTR', () => {
    expect(ALLOWED_ATTR).toEqual(['class']);
  });
});