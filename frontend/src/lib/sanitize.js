import DOMPurify from 'dompurify';

export function sanitizeText(text) {
  if (!text) return '';
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

export function sanitizeImageUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https:\/\//i.test(trimmed) || /^\//.test(trimmed)) {
    return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] });
  }
  return '';
}
