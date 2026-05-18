import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeImageUrl } from '../lib/sanitize';

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
