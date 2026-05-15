// Contopia — EXIF Stripper (sharp-based metadata removal)
import sharp from 'sharp';
import pino from 'pino';

const logger = pino({ name: 'exif-stripper', level: process.env.LOG_LEVEL || 'info' });

/**
 * Strip EXIF and all metadata from an image buffer using sharp.
 * Preserves image orientation by rotating first, then removes all metadata.
 * @param {Buffer} buffer — Raw image buffer
 * @returns {Promise<Buffer>} — Buffer with no EXIF/metadata
 */
export async function stripExif(buffer) {
  try {
    const result = await sharp(buffer)
      .rotate() // auto-orient from EXIF, then strip metadata
      .withMetadata({ exif: {} }) // clear EXIF
      .toBuffer();

    logger.info({ inputSize: buffer.length, outputSize: result.length }, 'EXIF stripped');
    return result;
  } catch (err) {
    logger.error({ err }, 'EXIF strip failed');
    const error = new Error("We couldn't process your picture. Try again.");
    error.status = 500;
    error.code = 'PROCESSING_ERROR';
    throw error;
  }
}