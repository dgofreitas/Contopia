import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookshelfGrid from '../components/shelf/BookshelfGrid';

// setup.js already mocks react-i18next to pass through keys

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
});
