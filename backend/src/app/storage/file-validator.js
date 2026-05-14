// Contopia — File Validator (MIME whitelist, magic bytes, size ≤5MB)
import pino from 'pino';

const logger = pino({ name: 'file-validator', level: process.env.LOG_LEVEL || 'info' });

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const MAGIC_BYTES = {
  png:  { offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  jpeg: { offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) },
  webp: { offset: 0, bytes: Buffer.from([0x52, 0x49, 0x46, 0x46]) }, // RIFF
};

function checkMagicBytes(buffer) {
  for (const [, spec] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length < spec.offset + spec.bytes.length) continue;
    const slice = buffer.subarray(spec.offset, spec.offset + spec.bytes.length);
    if (slice.equals(spec.bytes)) return true;
  }
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

  // MIME whitelist
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    const err = new Error("Oops! We only accept pictures (PNG, JPG, WebP).");
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