import DOMPurify from 'dompurify';

export function sanitizeText(text) {
  if (!text) return '';
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}
