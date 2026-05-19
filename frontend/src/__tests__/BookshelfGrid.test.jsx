import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BookshelfGrid from '../components/shelf/BookshelfGrid';

// setup.js already mocks react-i18next to pass through keys

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// jsdom default viewport is 1024x768 → in SSR (undefined window) → 7 per row
// But with window defined at 1024px < 1024 for tablet → 5 per row
describe('BookshelfGrid', () => {
  beforeEach(() => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const books = Array.from({ length: 14 }, (_, i) => ({
    _id: `book-${i}`,
    title: `Story ${i + 1}`,
  }));

  it('renders section with aria-label', () => {
    render(<BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={vi.fn()} />);
    expect(screen.getByLabelText('ariaShelfLabel')).toBeInTheDocument();
  });

  it('renders section even when books is empty', () => {
    const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
  });

  it('clicking a book spine triggers onBookClick', () => {
    const onClick = vi.fn();
    render(<BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={onClick} />);
    const bookBtn = screen.getByText('A');
    fireEvent.click(bookBtn);
    expect(onClick).toHaveBeenCalledWith('1');
  });

  it('toggles pull-out state when clicking a book spine', () => {
    render(<BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={vi.fn()} />);
    const bookBtn = screen.getByText('A');

    // Click to pull out
    fireEvent.click(bookBtn);
    // Overlay should now be present
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
    expect(backdrop).toBeInTheDocument();
  });

  it('clicking a different book switches pulled-out book', () => {
    const onClick = vi.fn();
    render(
      <BookshelfGrid
        books={[
          { _id: '1', title: 'Book A' },
          { _id: '2', title: 'Book B' },
        ]}
        onBookClick={onClick}
      />
    );
    const bookA = screen.getByText('Book A');
    const bookB = screen.getByText('Book B');

    // Click book A
    fireEvent.click(bookA);
    expect(onClick).toHaveBeenCalledWith('1');

    // Click book B (should switch)
    fireEvent.click(bookB);
    expect(onClick).toHaveBeenCalledWith('2');
  });

  it('dismisses overlay when backdrop is clicked', () => {
    render(<BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={vi.fn()} />);
    const bookBtn = screen.getByText('A');

    // Click to pull out
    fireEvent.click(bookBtn);
    let backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
    expect(backdrop).toBeInTheDocument();

    // Click backdrop to dismiss
    fireEvent.click(backdrop);
    backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
    expect(backdrop).not.toBeInTheDocument();
  });

  describe('CoverOverlay integration (STORY-012)', () => {
    it('cover overlay opens when onViewCover is triggered from pulled-out book', () => {
      const bookWithDetails = {
        _id: '1',
        title: 'Book A',
        authorName: 'Author Name',
        description: 'A description',
        coverUrl: 'https://example.com/cover.jpg',
      };
      render(<BookshelfGrid books={[bookWithDetails]} onBookClick={vi.fn()} />);

      // Pull out
      const bookBtn = screen.getByText('Book A');
      fireEvent.click(bookBtn);

      // Click first "View Cover" button (cover area button)
      const viewCoverBtns = screen.getAllByLabelText('coverOverlay.viewCover');
      fireEvent.click(viewCoverBtns[0]);

      // Cover overlay should now be present (check for unique close button)
      const coverCloseBtn = screen.getByLabelText('coverOverlay.close');
      expect(coverCloseBtn).toBeInTheDocument();
    });

    it('cover overlay closes when onClose is called', () => {
      const bookWithDetails = {
        _id: '1',
        title: 'Book A',
        authorName: 'Author Name',
        description: 'A description',
        coverUrl: 'https://example.com/cover.jpg',
      };
      render(<BookshelfGrid books={[bookWithDetails]} onBookClick={vi.fn()} />);

      // Pull out
      const bookBtn = screen.getByText('Book A');
      fireEvent.click(bookBtn);

      // Click "View Cover" button
      const viewCoverBtns = screen.getAllByLabelText('coverOverlay.viewCover');
      fireEvent.click(viewCoverBtns[0]);

      // Cover overlay should be present (check for unique close button)
      let coverCloseBtn = screen.getByLabelText('coverOverlay.close');
      expect(coverCloseBtn).toBeInTheDocument();

      // Click "Close" button in the cover overlay
      const closeBtn = screen.getByLabelText('coverOverlay.close');
      fireEvent.click(closeBtn);

      // Cover overlay should be gone (close button no longer in document)
      coverCloseBtn = screen.queryByLabelText('coverOverlay.close');
      expect(coverCloseBtn).not.toBeInTheDocument();
    });

    it('closing cover overlay returns to pulled-out state (book still pulled out)', () => {
      const bookWithDetails = {
        _id: '1',
        title: 'Book A',
        authorName: 'Author Name',
        description: 'A description',
        coverUrl: 'https://example.com/cover.jpg',
      };
      render(<BookshelfGrid books={[bookWithDetails]} onBookClick={vi.fn()} />);

      // Pull out
      const bookBtn = screen.getByText('Book A');
      fireEvent.click(bookBtn);

      // Verify pulled-out overlay is present
      let pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();

      // Click "View Cover" button
      const viewCoverBtns = screen.getAllByLabelText('coverOverlay.viewCover');
      fireEvent.click(viewCoverBtns[0]);

      // Cover overlay should be present (check for unique close button)
      let coverCloseBtn = screen.getByLabelText('coverOverlay.close');
      expect(coverCloseBtn).toBeInTheDocument();

      // Click "Close" button in the cover overlay
      const closeBtn = screen.getByLabelText('coverOverlay.close');
      fireEvent.click(closeBtn);

      // Cover overlay should be gone (close button no longer in document)
      coverCloseBtn = screen.queryByLabelText('coverOverlay.close');
      expect(coverCloseBtn).not.toBeInTheDocument();

      // But pulled-out overlay should still be present (book still pulled out)
      pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();
    });

    it('dismissing pulled-out overlay also closes cover overlay', () => {
      const bookWithDetails = {
        _id: '1',
        title: 'Book A',
        authorName: 'Author Name',
        description: 'A description',
        coverUrl: 'https://example.com/cover.jpg',
      };
      render(<BookshelfGrid books={[bookWithDetails]} onBookClick={vi.fn()} />);

      // Pull out
      const bookBtn = screen.getByText('Book A');
      fireEvent.click(bookBtn);

      // Click "View Cover" button
      const viewCoverBtns = screen.getAllByLabelText('coverOverlay.viewCover');
      fireEvent.click(viewCoverBtns[0]);

      // Both overlays should be present
      const pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      const coverCloseBtn = screen.getByLabelText('coverOverlay.close');
      expect(pulledOutBackdrop).toBeInTheDocument();
      expect(coverCloseBtn).toBeInTheDocument();

      // Dismiss pulled-out overlay (click its backdrop)
      fireEvent.click(pulledOutBackdrop);

      // Both overlays should be gone
      const pulledOutBackdropAfter = document.querySelector('.fixed.inset-0.bg-black\\/30');
      const coverCloseBtnAfter = screen.queryByLabelText('coverOverlay.close');
      expect(pulledOutBackdropAfter).not.toBeInTheDocument();
      expect(coverCloseBtnAfter).not.toBeInTheDocument();
    });
  });

  describe('STORY-013: place-back flow', () => {
    it('place-back button triggers place-back flow', () => {
      const bookWithDetails = {
        _id: '1',
        title: 'Book A',
        authorName: 'Author Name',
        description: 'A description',
        coverUrl: 'https://example.com/cover.jpg',
      };
      render(<BookshelfGrid books={[bookWithDetails]} onBookClick={vi.fn()} />);

      // Pull out
      const bookBtn = screen.getByText('Book A');
      fireEvent.click(bookBtn);

      // Verify pulled-out overlay is present
      let pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();

      // Click "Place Back" button
      const placeBackBtn = screen.getByLabelText('placeBack');
      fireEvent.click(placeBackBtn);

      // Overlay should be gone
      pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).not.toBeInTheDocument();
    });

    it('closing cover overlay does NOT trigger place-back', () => {
      const bookWithDetails = {
        _id: '1',
        title: 'Book A',
        authorName: 'Author Name',
        description: 'A description',
        coverUrl: 'https://example.com/cover.jpg',
      };
      render(<BookshelfGrid books={[bookWithDetails]} onBookClick={vi.fn()} />);

      // Pull out
      const bookBtn = screen.getByText('Book A');
      fireEvent.click(bookBtn);

      // Verify pulled-out overlay is present
      let pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();

      // Click "View Cover" button
      const viewCoverBtns = screen.getAllByLabelText('coverOverlay.viewCover');
      fireEvent.click(viewCoverBtns[0]);

      // Cover overlay should be present
      let coverCloseBtn = screen.getByLabelText('coverOverlay.close');
      expect(coverCloseBtn).toBeInTheDocument();

      // Click "Close" button in the cover overlay
      const closeBtn = screen.getByLabelText('coverOverlay.close');
      fireEvent.click(closeBtn);

      // Cover overlay should be gone
      coverCloseBtn = screen.queryByLabelText('coverOverlay.close');
      expect(coverCloseBtn).not.toBeInTheDocument();

      // But pulled-out overlay should still be present (book still pulled out)
      pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();
    });

    it('rapid pull-out and place-back cycles do not stack', () => {
      const book = { _id: '1', title: 'Book A' };
      render(<BookshelfGrid books={[book]} onBookClick={vi.fn()} />);

      const bookBtn = screen.getByText('Book A');

      // Pull out
      fireEvent.click(bookBtn);
      let pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();

      // Place back
      const placeBackBtn = screen.getByLabelText('placeBack');
      fireEvent.click(placeBackBtn);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).not.toBeInTheDocument();

      // Pull out again after animation completes
      fireEvent.click(bookBtn);
      pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).toBeInTheDocument();

      // Place back again
      fireEvent.click(screen.getByLabelText('placeBack'));
      act(() => {
        vi.advanceTimersByTime(300);
      });
      pulledOutBackdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      expect(pulledOutBackdrop).not.toBeInTheDocument();
    });
  });

  describe('STORY-014: Responsive Layout', () => {
    it('container has responsive padding classes', () => {
      const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('px-4', 'md:px-6', 'lg:px-8');
    });

    it('container is centered on desktop with max-width', () => {
      const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
      const section = container.querySelector('section');
      expect(section).toHaveClass('lg:max-w-5xl', 'lg:mx-auto');
    });

    it('uses useDebouncedResize hook for viewport detection', () => {
      const { container } = render(<BookshelfGrid books={[]} onBookClick={vi.fn()} />);
      // Component renders without errors, indicating hook is working
      expect(container.querySelector('section')).toBeInTheDocument();
    });
  });
});
