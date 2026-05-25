const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const BLOCKED_MIME_TYPES = ['image/svg+xml'];

export const ErrorCodes = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_TYPE: 'INVALID_TYPE',
  SVG_NOT_ALLOWED: 'SVG_NOT_ALLOWED',
};

export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected', errorCode: ErrorCodes.INVALID_TYPE };
  }

  if (BLOCKED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'SVG files are not allowed', errorCode: ErrorCodes.SVG_NOT_ALLOWED };
  }

  if (file.name && file.name.toLowerCase().endsWith('.svg')) {
    return { valid: false, error: 'SVG files are not allowed', errorCode: ErrorCodes.SVG_NOT_ALLOWED };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPG and PNG images are allowed', errorCode: ErrorCodes.INVALID_TYPE };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File is too large (max 5MB)', errorCode: ErrorCodes.FILE_TOO_LARGE };
  }

  return { valid: true, error: null, errorCode: null };
}

export function getImagePreviewUrl(file) {
  if (!file) return null;
  return URL.createObjectURL(file);
}

export function cleanupPreviewUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}