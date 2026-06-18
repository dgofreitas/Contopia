// Contopia — PDF Parser (text extraction + metadata + thumbnail rendering)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { getDocument } = require('./pdfjs-wrapper.cjs');
import { createCanvas } from 'canvas';
import pino from 'pino';

const logger = pino({ name: 'pdf-parser', level: process.env.LOG_LEVEL || 'info' });

const SCANNED_THRESHOLD_CHARS = 50;
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 280;

/**
 * Extract text and metadata from a PDF buffer.
 * @param {Buffer} buffer - PDF file buffer
 * @returns {{ text: string, title: string|null, author: string|null, numPages: number, isScanned: boolean }}
 */
export async function extractPdfContent(buffer) {
  let doc;
  try {
    doc = await getDocument({
      data: new Uint8Array(buffer),
      disableJavaScript: true,
      disableAutoFetch: true,
    }).promise;
  } catch (err) {
    logger.error({ err }, 'Failed to open PDF document');
    const error = new Error('This PDF seems broken. Try a different file!');
    error.code = 'CORRUPT_PDF';
    error.status = 400;
    throw error;
  }

  try {
    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    // Metadata
    const metadata = await doc.getMetadata();
    const info = metadata?.info || {};
    const title = info.Title || null;
    const author = info.Author || null;

    const isScanned = fullText.trim().length < SCANNED_THRESHOLD_CHARS;

    return {
      text: isScanned ? '' : fullText,
      title,
      author,
      numPages: doc.numPages,
      isScanned,
    };
  } finally {
    doc.destroy();
  }
}

/**
 * Render the first page of a PDF to a PNG buffer (thumbnail).
 * @param {Buffer} buffer - PDF file buffer
 * @param {{ width?: number, height?: number }} options - Target dimensions
 * @returns {Promise<{ buffer: Buffer, width: number, height: number }>}
 */
export async function renderPdfThumbnail(buffer, { width = THUMBNAIL_WIDTH, height = THUMBNAIL_HEIGHT } = {}) {
  let doc;
  try {
    doc = await getDocument({
      data: new Uint8Array(buffer),
      disableJavaScript: true,
      disableAutoFetch: true,
    }).promise;
  } catch (err) {
    logger.error({ err }, 'Failed to open PDF for thumbnail rendering');
    const error = new Error('This PDF seems broken. Try a different file!');
    error.code = 'CORRUPT_PDF';
    error.status = 400;
    throw error;
  }

  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    // Calculate scale to fit within target dimensions
    const scale = Math.min(width / viewport.width, height / viewport.height);
    const scaledViewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(scaledViewport.width), Math.ceil(scaledViewport.height));
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

    const pngBuffer = canvas.toBuffer('image/png');

    logger.info(
      { width: scaledViewport.width, height: scaledViewport.height, sizeBytes: pngBuffer.length },
      'PDF thumbnail rendered',
    );

    return { buffer: pngBuffer, width: Math.ceil(scaledViewport.width), height: Math.ceil(scaledViewport.height) };
  } finally {
    doc.destroy();
  }
}

export { SCANNED_THRESHOLD_CHARS, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT };