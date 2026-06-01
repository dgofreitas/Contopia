// Contopia — TXT Parser (buffer → title + paragraphs)
const MAX_PARAGRAPH_COUNT = 10000;

/**
 * Parse a TXT file buffer into title and paragraphs.
 * @param {Buffer} buffer - sanitized UTF-8 buffer
 * @param {string} filename - original filename
 * @returns {{ title: string, paragraphs: string[] }}
 */
export function parseTxtBuffer(buffer, filename) {
  const title = extractTitle(filename);
  const text = buffer.toString('utf-8');
  const paragraphs = text
    .split(/\n\n+/)                    // Split by double newline
    .map((p) => p.trim())              // Trim each paragraph
    .filter((p) => p.length > 0)       // Remove empty paragraphs
    .slice(0, MAX_PARAGRAPH_COUNT);    // Cap at max

  return { title, paragraphs };
}

/**
 * Extract title from filename by stripping extension and sanitizing.
 * @param {string} filename
 * @returns {string}
 */
export function extractTitle(filename) {
  if (!filename) return 'Untitled';
  // Strip .txt extension
  const name = filename.replace(/\.txt$/i, '').trim();
  // Sanitize: remove path separators and dangerous chars, keep alphanumerics, spaces, hyphens, underscores
  const sanitized = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  return sanitized || 'Untitled';
}

export { MAX_PARAGRAPH_COUNT };