// Contopia — PDF Parser Unit Tests
import { describe, it, expect, vi } from 'vitest';

// ── Mock canvas before importing pdf-parser ────────────────────────────────
vi.mock('canvas', () => ({
  createCanvas: vi.fn(() => ({
    getContext: vi.fn(() => ({})),
    toBuffer: vi.fn(() => Buffer.from('fake-png-data')),
  })),
}));

vi.mock('pino', () => ({
  default: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// ── Mock pdfjs-dist ──────────────────────────────────────────────────────
// Factory function returns the mock object — gets hoisted by Vitest.
const mockGetTextContent = vi.fn();
const mockGetPage = vi.fn();
const mockGetMetadata = vi.fn();
const mockDestroy = vi.fn();
const mockRender = vi.fn(() => ({ promise: Promise.resolve() }));
const mockGetViewport = vi.fn(({ scale = 1 } = {}) => ({
  width: 595 * scale,
  height: 842 * scale,
}));

vi.mock('pdfjs-dist/legacy/build/pdf.js', () => {
  const getDocument = vi.fn();
  return { getDocument };
});

// ── Import after mock setup ──────────────────────────────────────────────
import { extractPdfContent, renderPdfThumbnail } from '../pdf-parser.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';

// ── Helper: set up a mock PDF document ────────────────────────────────────
function setupMockDoc(options = {}) {
  const {
    numPages = 1,
    textItems = [{ str: 'Hello world from PDF document with enough text to exceed the threshold limit' }],
    title = null,
    author = null,
  } = options;

  mockGetTextContent.mockResolvedValue({ items: textItems });
  mockGetMetadata.mockResolvedValue({ info: { Title: title, Author: author } });
  mockGetPage.mockResolvedValue({
    getTextContent: mockGetTextContent,
    getViewport: mockGetViewport,
    render: mockRender,
  });

  getDocument.mockReturnValue({
    promise: Promise.resolve({
      numPages,
      getPage: mockGetPage,
      getMetadata: mockGetMetadata,
      destroy: mockDestroy,
    }),
  });
}

function makePdfBuffer(content = 'fake pdf content') {
  return Buffer.from(`%PDF-1.4\n${content}`);
}

describe('PDF Parser', () => {
  // ── extractPdfContent ──────────────────────────────────────────────────

  describe('extractPdfContent', () => {
    // ── 1. Text-based PDF → text extracted, isScanned: false ────────
    it('should extract text from a text-based PDF', async () => {
      setupMockDoc({
        textItems: [{ str: 'Hello world from PDF document with enough text to exceed the threshold limit' }],
      });

      const result = await extractPdfContent(makePdfBuffer());

      expect(result.text).toContain('Hello world from PDF document with enough text to exceed the threshold limit');
      expect(result.isScanned).toBe(false);
    });

    // ── 2. Scanned PDF (very little text) → isScanned: true, text: '' ──
    it('should classify PDF with very little text as scanned', async () => {
      setupMockDoc({
        textItems: [{ str: 'ab' }], // Only 2 chars, below 50-char threshold
      });

      const result = await extractPdfContent(makePdfBuffer());

      expect(result.isScanned).toBe(true);
      expect(result.text).toBe('');
    });

    // ── 3. PDF with metadata → title and author extracted ───────────
    it('should extract title and author from PDF metadata', async () => {
      setupMockDoc({
        textItems: [{ str: 'Some text content here that is long enough to exceed threshold' }],
        title: 'My Book Title',
        author: 'Jane Doe',
      });

      const result = await extractPdfContent(makePdfBuffer());

      expect(result.title).toBe('My Book Title');
      expect(result.author).toBe('Jane Doe');
    });

    // ── 4. PDF without metadata → title/author null ──────────────────
    it('should return null title and author when PDF has no metadata', async () => {
      setupMockDoc({
        textItems: [{ str: 'Some text content here that is long enough to exceed threshold' }],
        title: null,
        author: null,
      });

      const result = await extractPdfContent(makePdfBuffer());

      expect(result.title).toBeNull();
      expect(result.author).toBeNull();
    });

    // ── 5. Multi-page PDF → all pages text ───────────────────────────
    it('should concatenate text from all pages', async () => {
      setupMockDoc({ numPages: 2 });
      // Override getPage to return different text per page
      mockGetPage.mockImplementation((pageNum) => {
        const texts = [{ str: 'Page one content here that is long enough to exceed the threshold' }, { str: 'Page two content here that is also long enough to exceed the threshold' }];
        return Promise.resolve({
          getTextContent: vi.fn().mockResolvedValue({ items: [texts[pageNum - 1]] }),
          getViewport: mockGetViewport,
        });
      });

      const result = await extractPdfContent(makePdfBuffer());

      expect(result.text).toContain('Page one content here');
      expect(result.text).toContain('Page two content here');
      expect(result.numPages).toBe(2);
    });

    // ── 6. Corrupt PDF → throws CORRUPT_PDF error ────────────────────
    it('should throw CORRUPT_PDF error for invalid PDF', async () => {
      getDocument.mockReturnValue({
        promise: Promise.reject(new Error('Invalid PDF structure')),
      });

      await expect(extractPdfContent(Buffer.from('not a pdf'))).rejects.toMatchObject({
        code: 'CORRUPT_PDF',
        status: 400,
      });
    });

    // ── 7. Security: disableJavaScript: true passed to getDocument ──────
    it('should pass disableJavaScript and disableAutoFetch to getDocument', async () => {
      setupMockDoc({});

      await extractPdfContent(makePdfBuffer());

      expect(getDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          disableJavaScript: true,
          disableAutoFetch: true,
        }),
      );
    });
  });

  // ── renderPdfThumbnail ──────────────────────────────────────────────

  describe('renderPdfThumbnail', () => {
    // ── 8. Thumbnail renders → returns PNG buffer with dimensions ──────
    it('should render first page as PNG thumbnail', async () => {
      setupMockDoc({});
      // Override getViewport for rendering — return fixed dimensions
      mockGetViewport.mockReturnValue({ width: 595, height: 842 });

      const result = await renderPdfThumbnail(makePdfBuffer());

      expect(result.buffer).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    // ── 9. Custom dimensions ──────────────────────────────────────────
    it('should accept custom thumbnail dimensions', async () => {
      setupMockDoc({});
      mockGetViewport.mockImplementation(({ scale = 1 }) => ({
        width: Math.ceil(595 * scale),
        height: Math.ceil(842 * scale),
      }));

      const result = await renderPdfThumbnail(makePdfBuffer(), { width: 100, height: 140 });

      expect(result).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
    });

    // ── 10. Corrupt PDF for thumbnail → throws CORRUPT_PDF ────────────
    it('should throw CORRUPT_PDF error for invalid PDF when rendering thumbnail', async () => {
      getDocument.mockReturnValue({
        promise: Promise.reject(new Error('Invalid PDF structure')),
      });

      await expect(renderPdfThumbnail(Buffer.from('not a pdf'))).rejects.toMatchObject({
        code: 'CORRUPT_PDF',
        status: 400,
      });
    });
  });
});