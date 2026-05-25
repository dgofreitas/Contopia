// Contopia — File Validator (MIME whitelist, magic bytes, size ≤5MB)
import pino from 'pino';

const logger = pino({ name: 'file-validator', level: process.env.LOG_LEVEL || 'info' });

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const FORBIDDEN_MIMES = new Set(['image/svg+xml']);

const MAGIC_BYTES = {
  png:  { offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  jpeg: { offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) },
  webp: { offset: 0, bytes: Buffer.from([0x52, 0x49, 0x46, 0x46]) }, // RIFF
};

// SVG magic byte patterns — rejected for XSS risk (embedded scripts)
const SVG_MAGIC_BYTES = [
  Buffer.from('<?xml'),
  Buffer.from('<svg'),
];

function checkMagicBytes(buffer) {
  for (const [, spec] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length < spec.offset + spec.bytes.length) continue;
    const slice = buffer.subarray(spec.offset, spec.offset + spec.bytes.length);
    if (slice.equals(spec.bytes)) return true;
  }
  return false;
}

/**
 * Check if the buffer starts with SVG-like content (XML declaration or <svg tag).
 * Defense-in-depth: rejects SVG even if MIME type is spoofed.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isSvgContent(buffer) {
  if (!buffer || buffer.length === 0) return false;
  for (const pattern of SVG_MAGIC_BYTES) {
    if (buffer.length < pattern.length) continue;
    const prefix = buffer.subarray(0, pattern.length).toString('utf8').trimStart();
    if (prefix.startsWith(pattern.toString('utf8'))) return true;
  }
  // Also check if the content contains <svg anywhere in the first 512 bytes
  const head = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').toLowerCase();
  if (head.includes('<svg')) return true;
  return false;
}

/**
 * Validate an uploaded file buffer for MIME type, magic bytes, and size.
 * @param {{ mimetype: string, size: number, buffer: Buffer }} file — multer file object
 * @throws {{ status: number, code: string, message: string }}
 */
export function validateFile(file) {
  if (!file) {
    const err = new Error('No file uploaded');
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    throw err;
  }

  // Size check
  if (file.size > MAX_SIZE_BYTES) {
    const err = new Error('This file is too big! Try a smaller picture.');
    err.status = 413;
    err.code = 'PAYLOAD_TOO_LARGE';
    throw err;
  }

  // SVG MIME rejection — defense against XSS via embedded scripts
  if (FORBIDDEN_MIMES.has(file.mimetype)) {
    const err = new Error("SVG files are not allowed — please use a PNG or JPG picture.");
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    throw err;
  }

  // MIME whitelist
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    const err = new Error("Oops! We only accept pictures (PNG, JPG, WebP).");
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    throw err;
  }

  // SVG content detection — catches SVG even if MIME is spoofed
  if (isSvgContent(file.buffer)) {
    const err = new Error("SVG files are not allowed — please use a PNG or JPG picture.");
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    throw err;
  }

  // Magic bytes check
  if (!checkMagicBytes(file.buffer)) {
    const err = new Error("Oops! We only accept pictures (PNG, JPG, WebP).");
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    throw err;
  }

  logger.info({ mimetype: file.mimetype, size: file.size }, 'File validated');
  return true;
}