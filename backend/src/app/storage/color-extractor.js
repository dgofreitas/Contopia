// Contopia — Dominant Color Extractor (sharp stats-based)
import sharp from 'sharp';
import pino from 'pino';

const logger = pino({ name: 'color-extractor', level: process.env.LOG_LEVEL || 'info' });

/**
 * Extract the dominant (average) color from an image buffer using sharp.stats().
 * Returns a hex color string suitable for spine auto-color.
 * @param {Buffer} buffer — Image buffer
 * @returns {Promise<string>} — Hex color string (e.g. '#4a9b6e')
 */
export async function extractDominantColor(buffer) {
  try {
    const stats = await sharp(buffer).stats();
    const [r, g, b] = stats.channels.map((c) => Math.round(c.mean));
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    logger.info({ hex, r, g, b }, 'Dominant color extracted');
    return hex;
  } catch (err) {
    logger.error({ err }, 'Dominant color extraction failed');
    const error = new Error("We couldn't process your picture. Try again.");
    error.status = 500;
    error.code = 'PROCESSING_ERROR';
    throw error;
  }
}

/**
 * Determine whether a hex color is "light" (for contrast decisions).
 * Uses the relative luminance formula per WCAG 2.0.
 * @param {string} hex — Hex color string (e.g. '#ffffff' or 'ffffff')
 * @returns {boolean} — true if the color is considered "light"
 */
export function isLightColor(hex) {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  // Linearize sRGB values
  const linearize = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // Relative luminance per WCAG 2.0
  const luminance = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;

  // Light if luminance > 0.5
  return luminance > 0.5;
}