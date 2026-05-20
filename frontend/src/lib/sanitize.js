import DOMPurify from 'dompurify';

export const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'h2', 'hr', 'span'];

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

export function sanitizeRichContent(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  });
}
