// Contopia — TXT Parser Unit Tests
import { describe, it, expect } from 'vitest';
import { parseTxtBuffer, extractTitle, MAX_PARAGRAPH_COUNT } from '../txt-parser.js';

describe('TXT Parser', () => {
  // ── 1. Simple TXT → title from filename, paragraphs split by \n\n ────
  it('should parse simple TXT into title and paragraphs', () => {
    const buffer = Buffer.from('First paragraph\n\nSecond paragraph\n\nThird paragraph');
    const result = parseTxtBuffer(buffer, 'my-story.txt');
    expect(result.title).toBe('my-story');
    expect(result.paragraphs).toEqual(['First paragraph', 'Second paragraph', 'Third paragraph']);
  });

  // ── 2. TXT with long content → paragraphs preserved correctly ────────
  it('should preserve long content in paragraphs', () => {
    const longText = 'A'.repeat(50000);
    const buffer = Buffer.from(`${longText}\n\n${longText}`);
    const result = parseTxtBuffer(buffer, 'long.txt');
    expect(result.paragraphs).toHaveLength(2);
    expect(result.paragraphs[0]).toHaveLength(50000);
  });

  // ── 3. TXT with many blank lines → empty paragraphs filtered ────────
  it('should filter empty paragraphs from multiple blank lines', () => {
    const buffer = Buffer.from('Para 1\n\n\n\n\n\nPara 2\n\n\n\nPara 3');
    const result = parseTxtBuffer(buffer, 'blanks.txt');
    expect(result.paragraphs).toEqual(['Para 1', 'Para 2', 'Para 3']);
  });

  // ── 4. Filename with .txt extension → stripped correctly ─────────────
  it('should strip .txt extension from filename', () => {
    const buffer = Buffer.from('Content');
    const result = parseTxtBuffer(buffer, 'dragon-story.txt');
    expect(result.title).toBe('dragon-story');
  });

  it('should strip .TXT (uppercase) extension from filename', () => {
    const buffer = Buffer.from('Content');
    const result = parseTxtBuffer(buffer, 'MY-STORY.TXT');
    expect(result.title).toBe('MY-STORY');
  });

  // ── 5. Filename with special chars → sanitized title ────────────────
  it('should sanitize special characters from filename', () => {
    const buffer = Buffer.from('Content');
    const result = parseTxtBuffer(buffer, 'my<story>:file|name.txt');
    expect(result.title).toBe('mystoryfilename');
  });

  it('should return Untitled for empty filename after sanitization', () => {
    const buffer = Buffer.from('Content');
    const result = parseTxtBuffer(buffer, '<>:|*.txt');
    expect(result.title).toBe('Untitled');
  });

  it('should return Untitled for null filename', () => {
    const buffer = Buffer.from('Content');
    const result = parseTxtBuffer(buffer, null);
    expect(result.title).toBe('Untitled');
  });

  // ── 6. Paragraph count exceeds 10,000 → capped at MAX_PARAGRAPH_COUNT
  it('should cap paragraphs at MAX_PARAGRAPH_COUNT', () => {
    const paragraphs = Array.from({ length: 12000 }, (_, i) => `Paragraph ${i}`);
    const content = paragraphs.join('\n\n');
    const buffer = Buffer.from(content);
    const result = parseTxtBuffer(buffer, 'large.txt');
    expect(result.paragraphs).toHaveLength(MAX_PARAGRAPH_COUNT);
    expect(MAX_PARAGRAPH_COUNT).toBe(10000);
  });
});