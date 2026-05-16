import { describe, it, expect } from 'vitest';
import { sanitizeText } from '../lib/sanitize';

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
