// Contopia — EPUB Parser (ZIP extraction, DRM detection, metadata, chapters, cover)
import AdmZip from 'adm-zip';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import pino from 'pino';

const logger = pino({ name: 'epub-parser', level: process.env.LOG_LEVEL || 'info' });

// DOMPurify instance for XHTML sanitization
const domWindow = new JSDOM('').window;
const DOMPurify = createDOMPurify(domWindow);

// Tags allowed in EPUB chapter content after sanitization
const EPUB_ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'h2', 'h3', 'h4', 'hr'];

/**
 * Parse an EPUB buffer and extract metadata, chapters, and cover image.
 *
 * @param {Buffer} buffer — EPUB file buffer
 * @returns {{ title: string, author: string|null, chapters: [{order:number,title:string,content:string}], coverImage: {buffer:Buffer,mimeType:string}|null }}
 */
export async function parseEpub(buffer) {
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch (err) {
    logger.error({ err }, 'Failed to open EPUB as ZIP');
    const error = new Error('Oops! This file couldn\'t be opened. It might be protected or damaged.');
    error.code = 'CORRUPT_EPUB';
    error.status = 400;
    throw error;
  }

  // 1. DRM detection — fail fast
  detectDrm(zip);

  // 2. Parse container.xml → find .opf path
  const opfPath = resolveOpfPath(zip);

  // 3. Parse OPF document
  const opfResult = parseOpf(zip, opfPath);

  // 4. Extract chapters from spine order
  const chapters = extractChapters(zip, opfResult, opfPath);

  if (chapters.length === 0) {
    const error = new Error('This EPUB has no readable content. Try a different file!');
    error.code = 'EMPTY_EPUB';
    error.status = 422;
    throw error;
  }

  // 5. Extract cover image (if any)
  const coverImage = extractCover(zip, opfResult, opfPath);

  return {
    title: opfResult.title,
    author: opfResult.author,
    chapters,
    coverImage,
  };
}

/**
 * Check for DRM protection. If META-INF/encryption.xml exists, reject.
 * @param {AdmZip} zip
 */
function detectDrm(zip) {
  const entry = zip.getEntry('META-INF/encryption.xml');
  if (entry) {
    const error = new Error('Oops! This file couldn\'t be opened. It might be protected or damaged.');
    error.code = 'DRM_PROTECTED';
    error.status = 400;
    throw error;
  }
}

/**
 * Parse META-INF/container.xml to find the .opf file path.
 * @param {AdmZip} zip
 * @returns {string} — path to OPF file within ZIP
 */
function resolveOpfPath(zip) {
  const containerEntry = zip.getEntry('META-INF/container.xml');
  if (!containerEntry) {
    logger.error('Missing META-INF/container.xml in EPUB');
    const error = new Error('Oops! This file couldn\'t be opened. It might be protected or damaged.');
    error.code = 'CORRUPT_EPUB';
    error.status = 400;
    throw error;
  }

  try {
    const containerXml = containerEntry.getData().toString('utf-8');
    const dom = new JSDOM(containerXml, { contentType: 'application/xml' });
    const rootfileEl = dom.window.document.querySelector('rootfile');
    const opfPath = rootfileEl?.getAttribute('full-path');

    if (!opfPath) {
      logger.error('No rootfile full-path in container.xml');
      const error = new Error('Oops! This file couldn\'t be opened. It might be protected or damaged.');
      error.code = 'CORRUPT_EPUB';
      error.status = 400;
      throw error;
    }

    return opfPath;
  } catch (err) {
    if (err.code === 'CORRUPT_EPUB') throw err;
    logger.error({ err }, 'Failed to parse container.xml');
    const error = new Error('Oops! This file couldn\'t be opened. It might be protected or damaged.');
    error.code = 'CORRUPT_EPUB';
    error.status = 400;
    throw error;
  }
}

/**
 * Parse the OPF (content.opf or similar) to extract metadata, manifest, and spine.
 * @param {AdmZip} zip
 * @param {string} opfPath — path to OPF within ZIP
 * @returns {{ title: string, author: string|null, spineIds: string[], manifest: Object, coverMetaId: string|null, contentBasePath: string }}
 */
function parseOpf(zip, opfPath) {
  const opfEntry = zip.getEntry(opfPath);
  if (!opfEntry) {
    logger.error({ opfPath }, 'OPF file not found in ZIP');
    const error = new Error('Oops! This file couldn\'t be opened. It might be protected or damaged.');
    error.code = 'CORRUPT_EPUB';
    error.status = 400;
    throw error;
  }

  let dom;
  try {
    const opfXml = opfEntry.getData().toString('utf-8');
    dom = new JSDOM(opfXml, { contentType: 'application/xml' });
  } catch (err) {
    logger.error({ err, opfPath }, 'Failed to parse OPF XML');
    const error = new Error('Oops! This file couldn\'t be opened. It might be protected or damaged.');
    error.code = 'CORRUPT_EPUB';
    error.status = 400;
    throw error;
  }

  const doc = dom.window.document;

  // Extract title
  const titleEl = doc.querySelector('metadata title') || doc.getElementsByTagNameNS('*', 'title')[0];
  const title = titleEl?.textContent?.trim() || null;

  // Extract author/creator
  const creatorEl = doc.querySelector('metadata creator') || doc.getElementsByTagNameNS('*', 'creator')[0];
  const author = creatorEl?.textContent?.trim() || null;

  // Build manifest map: id → { href, mediaType }
  const manifest = {};
  const manifestItems = doc.querySelectorAll('manifest item');
  for (const item of manifestItems) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') || item.getAttribute('mediaType') || '';
    if (id && href) {
      manifest[id] = { href, mediaType };
    }
  }

  // Extract spine item IDs in order
  const spineIds = [];
  const spineItemrefs = doc.querySelectorAll('spine itemref');
  for (const itemref of spineItemrefs) {
    const idref = itemref.getAttribute('idref');
    if (idref) {
      spineIds.push(idref);
    }
  }

  // Extract cover meta: <meta name="cover" content="cover-image-id" />
  let coverMetaId = null;
  const metaElements = doc.querySelectorAll('metadata meta');
  for (const meta of metaElements) {
    if (meta.getAttribute('name') === 'cover') {
      coverMetaId = meta.getAttribute('content');
      break;
    }
  }

  // Compute base path for resolving OPF-relative hrefs
  const lastSlash = opfPath.lastIndexOf('/');
  const contentBasePath = lastSlash >= 0 ? opfPath.substring(0, lastSlash) : '';

  return {
    title,
    author,
    spineIds,
    manifest,
    coverMetaId,
    contentBasePath,
  };
}

/**
 * Extract chapters from EPUB spine items.
 * Each spine item maps to a manifest item → XHTML file → sanitized content.
 *
 * @param {AdmZip} zip
 * @param {object} opfResult — output from parseOpf()
 * @param {string} opfPath — path to OPF within ZIP
 * @returns {[{ order: number, title: string, content: string }]}
 */
function extractChapters(zip, opfResult, opfPath) {
  const chapters = [];

  for (let i = 0; i < opfResult.spineIds.length; i++) {
    const idref = opfResult.spineIds[i];
    const manifestItem = opfResult.manifest[idref];

    if (!manifestItem) {
      logger.warn({ idref, index: i }, 'Spine item not found in manifest — skipping');
      continue;
    }

    // Skip non-XHTML items (images, CSS, etc.)
    const mediaType = manifestItem.mediaType.toLowerCase();
    if (!isXhtmlMediaType(mediaType)) {
      logger.warn({ idref, mediaType }, 'Skipping non-XHTML spine item');
      continue;
    }

    // Resolve the XHTML file path within the ZIP
    const xhtmlPath = resolveZipPath(opfResult.contentBasePath, manifestItem.href);
    const xhtmlEntry = zip.getEntry(xhtmlPath);

    if (!xhtmlEntry) {
      logger.warn({ xhtmlPath, idref, index: i }, 'XHTML file not found in ZIP — skipping chapter');
      continue;
    }

    try {
      const xhtmlStr = xhtmlEntry.getData().toString('utf-8');

      // Sanitize XHTML via DOMPurify — strip scripts, iframes, objects, embeds
      const sanitized = DOMPurify.sanitize(xhtmlStr, {
        ALLOWED_TAGS: EPUB_ALLOWED_TAGS,
        ALLOWED_ATTR: [],
        ALLOW_DATA_ATTR: false,
      });

      // Extract chapter title
      const chapterTitle = extractChapterTitle(xhtmlStr, i);

      // Compute word count from sanitized content
      const plainText = sanitized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const wordCount = plainText ? plainText.split(/\s+/).length : 0;

      // Skip chapters with no textual content
      if (wordCount === 0) {
        logger.warn({ idref, index: i }, 'Skipping empty chapter');
        continue;
      }

      chapters.push({
        order: i * 100, // Gapped ordering: 0, 100, 200, ...
        title: chapterTitle,
        content: sanitized,
      });
    } catch (err) {
      logger.warn({ err, idref, index: i }, 'Failed to parse XHTML chapter — skipping');
    }
  }

  return chapters;
}

/**
 * Extract chapter title from XHTML: <title> tag → first <h1>/<h2> → fallback to "Chapter N".
 * @param {string} xhtmlStr — raw XHTML string
 * @param {number} index — zero-based spine index
 * @returns {string}
 */
function extractChapterTitle(xhtmlStr, index) {
  try {
    const dom = new JSDOM(xhtmlStr, { contentType: 'application/xhtml+xml' });
    const doc = dom.window.document;

    // Try <title> tag
    const titleEl = doc.querySelector('title');
    if (titleEl?.textContent?.trim()) {
      return titleEl.textContent.trim();
    }

    // Try first <h1>
    const h1 = doc.querySelector('h1');
    if (h1?.textContent?.trim()) {
      return h1.textContent.trim();
    }

    // Try first <h2>
    const h2 = doc.querySelector('h2');
    if (h2?.textContent?.trim()) {
      return h2.textContent.trim();
    }
  } catch (err) {
    logger.warn({ err, index }, 'Failed to extract chapter title from XHTML');
  }

  // Fallback
  return `Chapter ${index + 1}`;
}

/**
 * Extract cover image from EPUB if available.
 * Resolves <meta name="cover"> → manifest item → image in ZIP.
 *
 * @param {AdmZip} zip
 * @param {object} opfResult — output from parseOpf()
 * @param {string} opfPath — path to OPF within ZIP
 * @returns {{ buffer: Buffer, mimeType: string }|null}
 */
function extractCover(zip, opfResult, opfPath) {
  if (!opfResult.coverMetaId) return null;

  const coverManifest = opfResult.manifest[opfResult.coverMetaId];
  if (!coverManifest) {
    logger.warn({ coverMetaId: opfResult.coverMetaId }, 'Cover manifest item not found');
    return null;
  }

  const coverPath = resolveZipPath(opfResult.contentBasePath, coverManifest.href);
  const coverEntry = zip.getEntry(coverPath);
  if (!coverEntry) {
    logger.warn({ coverPath }, 'Cover image file not found in ZIP');
    return null;
  }

  const mimeType = coverManifest.mediaType || 'image/jpeg';
  return {
    buffer: coverEntry.getData(),
    mimeType,
  };
}

/**
 * Check if a media type is XHTML/HTML content.
 * @param {string} mediaType
 * @returns {boolean}
 */
function isXhtmlMediaType(mediaType) {
  return mediaType.includes('xhtml') || mediaType.includes('html');
}

/**
 * Resolve a relative href against a base path within the ZIP.
 * Handles OPF-relative paths like "Text/chapter1.xhtml" with base "OEBPS".
 *
 * @param {string} basePath — directory containing the OPF
 * @param {string} href — relative path from manifest
 * @returns {string} — full path within ZIP
 */
function resolveZipPath(basePath, href) {
  if (!basePath) return href;
  // Handle fragment identifiers (e.g., "chapter.html#section1")
  const cleanHref = href.split('#')[0];
  return `${basePath}/${cleanHref}`;
}

export { EPUB_ALLOWED_TAGS };