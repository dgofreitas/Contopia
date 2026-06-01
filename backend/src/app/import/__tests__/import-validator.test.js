// Contopia — Import Validator Unit Tests
import { describe, it, expect } from 'vitest';
import { validateImportFile, sanitizeTxtContent, MAX_IMPORT_SIZE_BYTES } from '../import-validator.js';

describe('Import Validator', () => {
  // ── 1. Valid TXT file with text/plain MIME → passes ──────────────────
  it('should accept a valid TXT file with text/plain MIME', () => {
    const buffer = Buffer.from('Hello world');
    const file = { mimetype: 'text/plain', size: buffer.length, buffer, originalname: 'test.txt' };
    const result = validateImportFile(file, 'txt');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // ── 2. Non-TXT MIME (application/pdf) → INVALID_FILE_TYPE ───────────
  it('should reject file with wrong MIME type', () => {
    const buffer = Buffer.from('Hello world');
    const file = { mimetype: 'application/pdf', size: buffer.length, buffer, originalname: 'test.pdf' };
    const result = validateImportFile(file, 'txt');
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('INVALID_FILE_TYPE');
  });

  // ── 3. TXT >25MB → PAYLOAD_TOO_LARGE ────────────────────────────────
  it('should reject file exceeding 25MB', () => {
    const buffer = Buffer.from('x');
    const file = { mimetype: 'text/plain', size: 26 * 1024 * 1024, buffer, originalname: 'big.txt' };
    const result = validateImportFile(file, 'txt');
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  // ── 4. TXT at exactly 25MB → passes ─────────────────────────────────
  it('should accept file at exactly 25MB', () => {
    const buffer = Buffer.from('x');
    const file = { mimetype: 'text/plain', size: 25 * 1024 * 1024, buffer, originalname: 'exact.txt' };
    const result = validateImportFile(file, 'txt');
    expect(result.valid).toBe(true);
  });

  // ── 5. Null/undefined file → NO_FILE error ──────────────────────────
  it('should reject null file with NO_FILE', () => {
    const result = validateImportFile(null, 'txt');
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('NO_FILE');
  });

  it('should reject undefined file with NO_FILE', () => {
    const result = validateImportFile(undefined, 'txt');
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('NO_FILE');
  });

  // ── 6. Dangerous MIME type → DANGEROUS_FILE error ────────────────────
  it('should reject dangerous MIME type with DANGEROUS_FILE', () => {
    const buffer = Buffer.from('malicious');
    const file = { mimetype: 'application/x-executable', size: buffer.length, buffer, originalname: 'malware.exe' };
    const result = validateImportFile(file, 'txt');
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('DANGEROUS_FILE');
  });

  it('should reject text/html MIME as dangerous', () => {
    const buffer = Buffer.from('<html><body>XSS</body></html>');
    const file = { mimetype: 'text/html', size: buffer.length, buffer, originalname: 'xss.html' };
    const result = validateImportFile(file, 'txt');
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('DANGEROUS_FILE');
  });

  // ── 7. sanitizeTxtContent strips null bytes → clean output ───────────
  it('should strip null bytes from content', () => {
    const input = Buffer.from('Hello\x00World\x00');
    const result = sanitizeTxtContent(input);
    expect(result).toBe('HelloWorld');
  });

  // ── 8. sanitizeTxtContent preserves \n, \r, \t ─────────────────────
  it('should preserve newlines, carriage returns, and tabs', () => {
    const input = Buffer.from('Line1\nLine2\r\n\tIndented');
    const result = sanitizeTxtContent(input);
    expect(result).toBe('Line1\nLine2\r\n\tIndented');
  });

  // ── Additional: unsupported format → INVALID_FORMAT ──────────────────
  it('should reject unsupported format', () => {
    const buffer = Buffer.from('data');
    const file = { mimetype: 'text/plain', size: buffer.length, buffer, originalname: 'test.txt' };
    const result = validateImportFile(file, 'pdf');
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('INVALID_FORMAT');
  });

  // ── Additional: sanitize strips control chars ────────────────────────
  it('should strip control characters except newline, cr, tab', () => {
    const input = Buffer.from('a\x01b\x02c\x07d\x0Be\x0Cf\x1Fg\x7Fh');
    const result = sanitizeTxtContent(input);
    expect(result).toBe('abcdefgh');
  });
});