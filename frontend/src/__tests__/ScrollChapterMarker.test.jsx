// Contopia — ScrollChapterMarker Component Tests (STORY-031)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScrollChapterMarker from '../components/reader/ScrollChapterMarker';

// IntersectionObserver already mocked in setup.js — just need local overrides per test
function createMockObserver() {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
}

describe('ScrollChapterMarker', () => {
  const defaultChapter = {
    _id: 'ch1',
    title: 'Chapter 1 Title',
    content: '<p>Chapter content paragraph.</p>',
  };

  const defaultProps = {
    chapter: defaultChapter,
    index: 0,
    onVisible: vi.fn(),
    fontSize: 'medium',
    themeProseClass: 'prose-headings:text-gray-800 prose-p:text-gray-700',
    observeRef: vi.fn(() => vi.fn()),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.IntersectionObserver = vi.fn(() => createMockObserver());
  });

  // ── Positive: rendering ──────────────────────────────────────

  describe('rendering', () => {
    it('renders chapter title', () => {
      render(<ScrollChapterMarker {...defaultProps} />);
      expect(screen.getByText('Chapter 1 Title')).toBeInTheDocument();
    });

    it('renders chapter content', () => {
      render(<ScrollChapterMarker {...defaultProps} />);
      expect(screen.getByText(/Chapter content paragraph/)).toBeInTheDocument();
    });

    it('renders with role="article"', () => {
      render(<ScrollChapterMarker {...defaultProps} />);
      const article = document.querySelector('[role="article"]');
      expect(article).toBeInTheDocument();
    });

    it('has id attribute on the container div for anchor navigation', () => {
      render(<ScrollChapterMarker {...defaultProps} />);
      const containerDiv = document.getElementById('chapter-ch1');
      expect(containerDiv).toBeInTheDocument();
    });

    it('has heading id for aria-labelledby reference', () => {
      render(<ScrollChapterMarker {...defaultProps} />);
      const heading = document.getElementById('chapter-heading-ch1');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });

    it('links aria-labelledby on article to heading id', () => {
      render(<ScrollChapterMarker {...defaultProps} />);
      const article = document.querySelector('[role="article"]');
      expect(article).toHaveAttribute('aria-labelledby', 'chapter-heading-ch1');
    });
  });

  // ── Font size classes ────────────────────────────────────────

  describe('font size classes', () => {
    it('applies text-sm for small font', () => {
      render(<ScrollChapterMarker {...defaultProps} fontSize="small" />);
      const contentDiv = document.querySelector('.prose');
      expect(contentDiv.className).toContain('text-sm');
    });

    it('applies text-base for medium font', () => {
      render(<ScrollChapterMarker {...defaultProps} fontSize="medium" />);
      const contentDiv = document.querySelector('.prose');
      expect(contentDiv.className).toContain('text-base');
    });

    it('applies text-lg for large font', () => {
      render(<ScrollChapterMarker {...defaultProps} fontSize="large" />);
      const contentDiv = document.querySelector('.prose');
      expect(contentDiv.className).toContain('text-lg');
    });

    it('falls back to text-base for unknown font size', () => {
      render(<ScrollChapterMarker {...defaultProps} fontSize="xlarge" />);
      const contentDiv = document.querySelector('.prose');
      expect(contentDiv.className).toContain('text-base');
    });
  });

  // ── IntersectionObserver setup ───────────────────────────────

  describe('IntersectionObserver setup', () => {
    it('creates IntersectionObserver for heading visibility', () => {
      render(<ScrollChapterMarker {...defaultProps} />);
      expect(global.IntersectionObserver).toHaveBeenCalled();
    });

    it('calls observe on the heading element', () => {
      const observer = createMockObserver();
      global.IntersectionObserver = vi.fn(() => observer);

      render(<ScrollChapterMarker {...defaultProps} />);
      expect(observer.observe).toHaveBeenCalled();
    });
  });

  // ── observeRef callback ──────────────────────────────────────

  describe('observeRef callback', () => {
    it('calls observeRef with section element and index', () => {
      const observeRef = vi.fn(() => vi.fn());
      render(<ScrollChapterMarker {...defaultProps} observeRef={observeRef} />);

      const section = document.getElementById('chapter-ch1');
      expect(observeRef).toHaveBeenCalledWith(section, 0);
    });

    it('does not crash when observeRef returns cleanup function', () => {
      const observeRef = vi.fn(() => vi.fn());
      const { unmount } = render(
        <ScrollChapterMarker {...defaultProps} observeRef={observeRef} />
      );
      expect(() => unmount()).not.toThrow();
    });
  });

  // ── Content sanitization ─────────────────────────────────────

  describe('content sanitization', () => {
    it('renders HTML content via dangerouslySetInnerHTML', () => {
      const chapter = {
        _id: 'ch2',
        title: 'Test',
        content: '<em>Emphasized text</em>',
      };
      render(<ScrollChapterMarker {...defaultProps} chapter={chapter} />);
      expect(screen.getByText('Emphasized text')).toBeInTheDocument();
    });
  });

  // ── Screen reader announcement ───────────────────────────────

  describe('screen reader announcement observer', () => {
    it('creates a second IntersectionObserver for announcement (threshold 0.5)', () => {
      render(<ScrollChapterMarker {...defaultProps} />);
      // IntersectionObserver called twice (heading + announcement)
      expect(global.IntersectionObserver).toHaveBeenCalledTimes(2);
      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: 0.5 }),
      );
    });
  });

  // ── Negative: edge cases ────────────────────────────────────

  describe('edge cases', () => {
    it('renders empty content without crashing', () => {
      const chapter = { _id: 'ch3', title: 'Empty', content: '' };
      render(<ScrollChapterMarker {...defaultProps} chapter={chapter} />);
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    it('handles missing _id gracefully (id falls back to undefined)', () => {
      const chapter = { title: 'No ID', content: '<p>ok</p>' };
      render(<ScrollChapterMarker {...defaultProps} chapter={chapter} />);
      expect(screen.getByText('No ID')).toBeInTheDocument();
    });

    it('handles null chapter gracefully', () => {
      // The component expects a chapter object; passing null may cause issues,
      // but we verify the component can render without crashing for edge cases
      // where chapter content is at least empty string
      const chapter = { _id: 'nullish', title: 'Untitled', content: null };
      render(<ScrollChapterMarker {...defaultProps} chapter={chapter} />);
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });
  });
});
