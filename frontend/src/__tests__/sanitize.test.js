import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeImageUrl, sanitizeRichContent, ALLOWED_TAGS } from '../lib/sanitize';

describe('sanitizeText', () => {
  it('returns empty string for null or undefined', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(sanitizeText('Hello World')).toBe('Hello World');
  });

  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitizeText('<b>bold</b>')).not.toContain('<b>');
    expect(sanitizeText('<img src=x onerror=alert(1)>')).not.toContain('<img');
  });

  it('keeps text content after stripping tags', () => {
    expect(sanitizeText('<b>Hello</b> <i>World</i>')).toBe('Hello World');
  });

  it('handles malformed HTML gracefully', () => {
    const result = sanitizeText('<p>Hello');
    expect(result).not.toContain('<p>');
  });
});

describe('sanitizeImageUrl (STORY-012)', () => {
  it('returns empty string for null or undefined', () => {
    expect(sanitizeImageUrl(null)).toBe('');
    expect(sanitizeImageUrl(undefined)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeImageUrl('')).toBe('');
  });

  it('accepts https:// URLs', () => {
    expect(sanitizeImageUrl('https://example.com/cover.jpg')).toBe('https://example.com/cover.jpg');
    expect(sanitizeImageUrl('HTTPS://SECURE.COM/cover.png')).toBe('HTTPS://SECURE.COM/cover.png');
  });

  it('accepts relative paths starting with /', () => {
    expect(sanitizeImageUrl('/assets/covers/book-123.jpg')).toBe('/assets/covers/book-123.jpg');
    expect(sanitizeImageUrl('/covers/cover.png')).toBe('/covers/cover.png');
  });

  it('blocks javascript: URLs', () => {
    expect(sanitizeImageUrl('javascript:alert("xss")')).toBe('');
    expect(sanitizeImageUrl('JAVASCRIPT:alert(1)')).toBe('');
  });

  it('blocks data: URLs', () => {
    expect(sanitizeImageUrl('data:image/svg+xml,<script>alert(1)</script>')).toBe('');
    expect(sanitizeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('blocks http: URLs (insecure)', () => {
    expect(sanitizeImageUrl('http://example.com/cover.jpg')).toBe('');
    expect(sanitizeImageUrl('HTTP://INSECURE.COM/cover.png')).toBe('');
  });

  it('trims whitespace before validation', () => {
    expect(sanitizeImageUrl('  https://example.com/cover.jpg  ')).toBe('https://example.com/cover.jpg');
    expect(sanitizeImageUrl('\t/assets/cover.png\t')).toBe('/assets/cover.png');
    expect(sanitizeImageUrl('\nhttps://secure.com/image.jpg\n')).toBe('https://secure.com/image.jpg');
  });

  it('returns empty string for trimmed whitespace-only input', () => {
    expect(sanitizeImageUrl('   ')).toBe('');
    expect(sanitizeImageUrl('\t\n')).toBe('');
  });

  it('returns empty string for ftp: URLs', () => {
    expect(sanitizeImageUrl('ftp://example.com/cover.jpg')).toBe('');
  });

  it('returns empty string for malformed URLs', () => {
    expect(sanitizeImageUrl('not-a-url')).toBe('');
    expect(sanitizeImageUrl('://bad-url')).toBe('');
  });
});

describe('sanitizeRichContent (STORY-018)', () => {
  it('returns empty string for null or undefined', () => {
    expect(sanitizeRichContent(null)).toBe('');
    expect(sanitizeRichContent(undefined)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeRichContent('')).toBe('');
  });

  it('allows safe tags: p, br, strong, em, h2, hr, span', () => {
    expect(sanitizeRichContent('<p>Hello</p>')).toBe('<p>Hello</p>');
    expect(sanitizeRichContent('<strong>Bold</strong>')).toBe('<strong>Bold</strong>');
    expect(sanitizeRichContent('<em>Italic</em>')).toBe('<em>Italic</em>');
    expect(sanitizeRichContent('<h2>Heading</h2>')).toBe('<h2>Heading</h2>');
    expect(sanitizeRichContent('<hr>')).toContain('hr');
    expect(sanitizeRichContent('<span>text</span>')).toBe('<span>text</span>');
  });

  it('allows class attribute', () => {
    expect(sanitizeRichContent('<p class="intro">Text</p>')).toBe('<p class="intro">Text</p>');
  });

  it('strips script tags', () => {
    expect(sanitizeRichContent('<script>alert(1)</script>Hello')).not.toContain('<script>');
  });

  it('strips img tags with onerror', () => {
    const result = sanitizeRichContent('<img src=x onerror=alert(1)>');
    expect(result).not.toContain('onerror');
  });

  it('strips javascript URLs', () => {
    const result = sanitizeRichContent('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript');
  });

  it('strips SVG with event handlers', () => {
    const result = sanitizeRichContent('<svg onload=alert(1)>');
    expect(result).not.toContain('onload');
  });

  it('strips inline styles', () => {
    const result = sanitizeRichContent('<div style="background:url(javascript:alert(1))">Text</div>');
    expect(result).not.toContain('style');
    expect(result).not.toContain('javascript');
  });

  it('preserves combined rich content', () => {
    const html = '<h2>Chapter Title</h2><p>Some <strong>bold</strong> and <em>italic</em> text.</p><hr><p>New section</p>';
    const result = sanitizeRichContent(html);
    expect(result).toContain('<h2>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('<p>');
  });

  it('exports ALLOWED_TAGS constant', () => {
    expect(ALLOWED_TAGS).toEqual(['p', 'br', 'strong', 'em', 'h2', 'hr', 'span']);
  });
});
