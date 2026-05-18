import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
