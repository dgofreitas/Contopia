// Contopia — Import File Validator (MIME, size, dangerous content)
const MAX_IMPORT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

const FORMAT_MIME_MAP = {
  txt: { mimes: ['text/plain'], magic: null },
  // pdf and epub entries added by STORY-046/047
};

const DANGEROUS_MIMES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-javascript',
  'application/javascript',
  'text/html',
];

/**
 * Validate an uploaded import file.
 * @param {object} file - multer file object { mimetype, size, buffer, originalname }
 * @param {string} format - expected format ('txt', 'pdf', 'epub')
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
export function validateImportFile(file, format) {
  // 1. File exists
  if (!file) {
    return { valid: false, error: { code: 'NO_FILE', message: 'No file provided' } };
  }

  // 2. Format supported
  const allowed = FORMAT_MIME_MAP[format];
  if (!allowed) {
    return { valid: false, error: { code: 'INVALID_FORMAT', message: `Unsupported format: ${format}` } };
  }

  // 3. Reject dangerous MIME types first
  if (DANGEROUS_MIMES.includes(file.mimetype)) {
    return { valid: false, error: { code: 'DANGEROUS_FILE', message: 'Executable files are not allowed' } };
  }

  // 4. MIME whitelist per format
  if (!allowed.mimes.includes(file.mimetype)) {
    return { valid: false, error: { code: 'INVALID_FILE_TYPE', message: `Expected ${allowed.mimes.join('/')} but got ${file.mimetype}` } };
  }

  // 5. Size ≤ 25MB
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return { valid: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'File size exceeds 25MB limit' } };
  }

  // 6. Magic bytes check (if applicable for format)
  if (allowed.magic) {
    const header = file.buffer.slice(0, allowed.magic.length);
    if (!header.equals(allowed.magic)) {
      return { valid: false, error: { code: 'INVALID_FILE_TYPE', message: 'File content does not match expected format' } };
    }
  }

  return { valid: true };
}

/**
 * Sanitize text content: strip null bytes and control chars, preserve \n, \r, \t.
 * @param {Buffer} buffer
 * @returns {string} sanitized text content
 */
export function sanitizeTxtContent(buffer) {
  const text = buffer.toString('utf-8');
  // Strip \x00-\x08, \x0B, \x0C, \x0E-\x1F, \x7F — preserve \n (\x0A), \r (\x0D), \t (\x09)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export { MAX_IMPORT_SIZE_BYTES, FORMAT_MIME_MAP };