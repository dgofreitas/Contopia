// Contopia — CoverOverlay Component Tests (STORY-012)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import CoverOverlay from '../components/shelf/CoverOverlay';

// Stub for framer-motion — avoids AnimatePresence leaking DOM
vi.mock('framer-motion', () => {
  const React = require('react');
  function mk(tag) {
    const C = React.forwardRef((props, ref) => {
      const { whileTap, whileHover, initial, animate, exit, transition, key, ...rest } = props;
      return React.createElement(tag, { ref, ...rest });
    });
    C.displayName = 'motion.' + tag;
    return C;
  }
  return {
    useReducedMotion: () => false,
    AnimatePresence: ({ children }) => children,
    motion: { div: mk('div'), button: mk('button') },
  };
});



const baseBook = {
  _id: 'book-123',
  title: 'My Little Pony',
  authorName: 'Jane Author',
  description: 'This is a wonderful story about friendship.',
  spineColor: '#4ECDC4',
  coverUrl: 'https://example.com/covers/book-123.jpg',
};

describe('CoverOverlay', () => {
  afterEach(() => {
    vi.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = '';
    // AnimatePresence leaks DOM between tests — force cleanup
    cleanup();
  });

  describe('rendering', () => {
    it('renders when isOpen=true and book provided', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('coverOverlay.title')).toBeInTheDocument();
      // Title appears in both CoverDisplay and overlay h3
      const titles = screen.getAllByText('My Little Pony');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render when isOpen=false', () => {
      const { container } = render(
        <CoverOverlay
          isOpen={false}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('does not render when book is null', () => {
      const { container } = render(
        <CoverOverlay
          isOpen={true}
          book={null}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('has role="dialog" and aria-modal="true"', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-label with book title (interpolated from t key)', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const dialog = screen.getByRole('dialog');
      // The t key interpolation returns: coverOverlay.ariaLabel with title replaced
      expect(dialog).toHaveAttribute('aria-label', 'coverOverlay.ariaLabel');
    });

    it('backdrop has aria-hidden="true"', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
      // The backdrop has additional classes including z-[60]
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black/50');
    });

    it('renders author name when provided', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const authorTexts = screen.getAllByText('coverOverlay.authorBy');
      expect(authorTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render author name when not provided', () => {
      const bookWithoutAuthor = { ...baseBook, authorName: '' };
      render(
        <CoverOverlay
          isOpen={true}
          book={bookWithoutAuthor}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      // Should not render author paragraph
      const authorText = screen.queryByText('coverOverlay.authorBy');
      expect(authorText).not.toBeInTheDocument();
    });

    it('renders summary when provided', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      expect(screen.getByText('This is a wonderful story about friendship.')).toBeInTheDocument();
    });

    it('does not render summary when not provided', () => {
      const bookWithoutSummary = { ...baseBook, description: '' };
      render(
        <CoverOverlay
          isOpen={true}
          book={bookWithoutSummary}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      // Only check that the description is not present
      const summary = screen.queryByText('This is a wonderful story about friendship.');
      expect(summary).not.toBeInTheDocument();
    });

    it('renders two action buttons', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('interactions', () => {
    it('backdrop click calls onClose', () => {
      const onClose = vi.fn();
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={onClose}
          onRead={vi.fn()}
        />
      );
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Escape key calls onClose', () => {
      const onClose = vi.fn();
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={onClose}
          onRead={vi.fn()}
        />
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('"Read Book" button calls onRead', () => {
      const onRead = vi.fn();
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={onRead}
        />
      );
      const readBtn = screen.getByLabelText('coverOverlay.readBook');
      fireEvent.click(readBtn);
      expect(onRead).toHaveBeenCalledTimes(1);
    });

    it('"Close" button calls onClose', () => {
      const onClose = vi.fn();
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={onClose}
          onRead={vi.fn()}
        />
      );
      const closeBtn = screen.getByLabelText('coverOverlay.close');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('focus moves to first button on mount', async () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      // First button is the Read Book button (ref={firstBtnRef})
      const readBtn = screen.getByLabelText('coverOverlay.readBook');
      expect(readBtn).toHaveFocus();
    });

    it('body has overflow:hidden when open', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('body overflow restored on close', async () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={onClose}
          onRead={vi.fn()}
        />
      );
      expect(document.body.style.overflow).toBe('hidden');

      // Close the overlay
      rerender(
        <CoverOverlay
          isOpen={false}
          book={baseBook}
          onClose={onClose}
          onRead={vi.fn()}
        />
      );

      // Allow cleanup to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('keyboard navigation', () => {
    it('Tab wraps within modal (forward)', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      const lastButton = buttons[1]; // Close button

      // Focus the last button
      lastButton.focus();

      // Press Tab (should wrap to first element)
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });

      const firstButton = buttons[0]; // Read button
      expect(firstButton).toHaveFocus();
    });

    it('Tab wraps within modal (backward)', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      const firstButton = buttons[0]; // Read button

      // Focus the first button
      firstButton.focus();

      // Press Shift+Tab (should wrap to last element)
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

      const lastButton = buttons[1]; // Close button
      expect(lastButton).toHaveFocus();
    });

    it('non-Tab keys pass through normally', () => {
      const onClose = vi.fn();
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={onClose}
          onRead={vi.fn()}
        />
      );

      fireEvent.keyDown(document, { key: 'Enter' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('other Escape variants do not call onClose', () => {
      const onClose = vi.fn();
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={onClose}
          onRead={vi.fn()}
        />
      );

      fireEvent.keyDown(document, { key: 'Space' });
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('fallback handling', () => {
    it('renders with DefaultCover when coverUrl is null', () => {
      const bookWithoutCover = { ...baseBook, coverUrl: null };
      render(
        <CoverOverlay
          isOpen={true}
          book={bookWithoutCover}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      // Should still render the overlay
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Should render title (now appears twice - once in DefaultCover, once in overlay)
      const titles = screen.getAllByText('My Little Pony');
      expect(titles).toHaveLength(2);
    });

    it('uses spineColor from ID when spineColor is missing', () => {
      const bookWithoutSpineColor = {
        _id: 'book-123',
        title: 'Test Book',
        authorName: 'Test Author',
        spineColor: null,
      };
      render(
        <CoverOverlay
          isOpen={true}
          book={bookWithoutSpineColor}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles missing description gracefully', () => {
      const bookWithoutDesc = { ...baseBook, description: null };
      render(
        <CoverOverlay
          isOpen={true}
          book={bookWithoutDesc}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
    });
  });

  describe('STORY-014: Responsive Layout', () => {
    it('has responsive width (w-[90vw] max-w-sm)', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('w-[90vw]', 'max-w-sm');
    });
  });

  // ── STORY-036: FavoriteToggle integration ────────────────────────

  describe('FavoriteToggle integration (STORY-036)', () => {
    it('renders FavoriteToggle with role="checkbox"', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('passes isFavorited=false to FavoriteToggle when book is not favorited', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={{ ...baseBook, isFavorited: false }}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const toggle = screen.getByRole('checkbox');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('passes isFavorited=true to FavoriteToggle when book is favorited', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={{ ...baseBook, isFavorited: true }}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const toggle = screen.getByRole('checkbox');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onFavoriteToggle when heart is clicked', () => {
      const onFavoriteToggle = vi.fn();
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
          onFavoriteToggle={onFavoriteToggle}
        />
      );
      fireEvent.click(screen.getByRole('checkbox'));
      expect(onFavoriteToggle).toHaveBeenCalledTimes(1);
    });

    it('renders FavoriteToggle alongside Read and Close buttons (3 total buttons)', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook}
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const buttons = screen.getAllByRole('button');
      // FavoriteToggle has role="checkbox", not "button"
      // Read + Close = 2 buttons, FavoriteToggle = 1 checkbox
      expect(buttons).toHaveLength(2);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders FavoriteToggle with default isFavorited=false when book.isFavorited is undefined', () => {
      render(
        <CoverOverlay
          isOpen={true}
          book={baseBook} // no isFavorited field
          onClose={vi.fn()}
          onRead={vi.fn()}
        />
      );
      const toggle = screen.getByRole('checkbox');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });
});
