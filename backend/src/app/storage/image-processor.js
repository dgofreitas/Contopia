// Contopia — Image Processor (thumbnail + cover-size generation with sharp)
import sharp from 'sharp';
import pino from 'pino';

const logger = pino({ name: 'image-processor', level: process.env.LOG_LEVEL || 'info' });

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 450;
const COVER_WIDTH = 600;
const COVER_HEIGHT = 900;

/**
 * Generate a thumbnail image (300x450) from a buffer.
 * Strips EXIF and resizes to fit within bounds, preserving aspect ratio.
 * @param {Buffer} buffer — Clean image buffer (EXIF already stripped)
 * @param {{ width?: number, height?: number }} [options]
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, format: string }>}
 */
export async function generateThumbnail(buffer, options = {}) {
  const width = options.width ?? THUMBNAIL_WIDTH;
  const height = options.height ?? THUMBNAIL_HEIGHT;

  try {
    const result = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

    logger.info(
      { inputSize: buffer.length, outputSize: result.data.length, width: result.info.width, height: result.info.height },
      'Thumbnail generated',
    );

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      format: result.info.format,
    };
  } catch (err) {
    logger.error({ err }, 'Thumbnail generation failed');
    const error = new Error("We couldn't process your picture. Try again.");
    error.status = 500;
    error.code = 'PROCESSING_ERROR';
    throw error;
  }
}

/**
 * Generate a cover-size image (600x900) from a buffer.
 * Strips EXIF and resizes to fit within bounds, preserving aspect ratio.
 * @param {Buffer} buffer — Clean image buffer (EXIF already stripped)
 * @param {{ width?: number, height?: number }} [options]
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, format: string }>}
 */
export async function generateCoverSize(buffer, options = {}) {
  const width = options.width ?? COVER_WIDTH;
  const height = options.height ?? COVER_HEIGHT;

  try {
    const result = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    logger.info(
      { inputSize: buffer.length, outputSize: result.data.length, width: result.info.width, height: result.info.height },
      'Cover-size image generated',
    );

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      format: result.info.format,
    };
  } catch (err) {
    logger.error({ err }, 'Cover-size generation failed');
    const error = new Error("We couldn't process your picture. Try again.");
    error.status = 500;
    error.code = 'PROCESSING_ERROR';
    throw error;
  }
}

/**
 * Get image metadata (width, height, format) from a buffer without full processing.
 * @param {Buffer} buffer — Image buffer
 * @returns {Promise<{ width: number, height: number, format: string }>}
 */
export async function getImageMetadata(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch (err) {
    logger.error({ err }, 'Image metadata extraction failed');
    const error = new Error("We couldn't process your picture. Try again.");
    error.status = 500;
    error.code = 'PROCESSING_ERROR';
    throw error;
  }
}