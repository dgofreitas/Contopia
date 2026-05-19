import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookshelfGrid from '../components/shelf/BookshelfGrid';

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('STORY-014: Responsive Breakpoint Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const books = Array.from({ length: 14 }, (_, i) => ({
    _id: `book-${i}`,
    title: `Story ${i + 1}`,
  }));

  describe('mobile viewport (375px)', () => {
    beforeEach(() => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    });

    it('renders without errors on mobile viewport', () => {
      render(<BookshelfGrid books={books} onBookClick={vi.fn()} />);
      expect(screen.getByLabelText('ariaShelfLabel')).toBeInTheDocument();
    });

    it('has mobile padding (px-4)', () => {
      const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('px-4');
    });

    it('no horizontal overflow on mobile', () => {
      const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
      // Should render cleanly without overflow
      expect(section).not.toHaveClass('overflow-x-auto');
    });
  });

  describe('tablet viewport (768px)', () => {
    beforeEach(() => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(768);
    });

    it('renders without errors on tablet viewport', () => {
      render(<BookshelfGrid books={books} onBookClick={vi.fn()} />);
      expect(screen.getByLabelText('ariaShelfLabel')).toBeInTheDocument();
    });

    it('has tablet padding (md:px-6)', () => {
      const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('md:px-6');
    });
  });

  describe('desktop viewport (1200px)', () => {
    beforeEach(() => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    });

    it('renders without errors on desktop viewport', () => {
      render(<BookshelfGrid books={books} onBookClick={vi.fn()} />);
      expect(screen.getByLabelText('ariaShelfLabel')).toBeInTheDocument();
    });

    it('has desktop padding and max-width (lg:px-8 lg:max-w-5xl lg:mx-auto)', () => {
      const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('lg:px-8', 'lg:max-w-5xl', 'lg:mx-auto');
    });

    it('is centered on desktop', () => {
      const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('lg:mx-auto');
    });
  });

  describe('orientation change handling', () => {
    it('renders books correctly after orientation change', () => {
      const { container, rerender } = render(<BookshelfGrid books={books} onBookClick={vi.fn()} />);

      // Initial mobile portrait
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
      rerender(<BookshelfGrid books={books} onBookClick={vi.fn()} />);
      expect(screen.getByLabelText('ariaShelfLabel')).toBeInTheDocument();

      // Switch to landscape (tablets are 1024px in landscape)
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
      rerender(<BookshelfGrid books={books} onBookClick={vi.fn()} />);
      expect(screen.getByLabelText('ariaShelfLabel')).toBeInTheDocument();
    });
  });
});
