// Contopia — HTML Content Sanitization Utility (STORY-018)
// Server-side sanitization using DOMPurify + jsdom to strip dangerous HTML
// before persisting chapter content to MongoDB.
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/** Tags allowed in chapter content (TipTap rich-text allowlist). */
export const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'h2', 'hr', 'span'];

/** Attributes allowed in chapter content. */
export const ALLOWED_ATTR = ['class'];

/**
 * Sanitize chapter HTML content, stripping any tags/attributes not in the allowlist.
 * Returns empty string if input is falsy.
 *
 * @param {string} html — raw HTML from TipTap editor
 * @returns {string} — sanitized HTML safe for storage
 */
export function sanitizeChapterContent(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}