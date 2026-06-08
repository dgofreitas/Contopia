import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityBookGrid from '../components/parent/ActivityBookGrid';

const mockBooks = [
  { bookId: 'b1', title: 'A Aventura da Julia', coverThumbnailUrl: '/cover1.png', status: 'published', updatedAt: '2026-06-05T10:00:00Z' },
  { bookId: 'b2', title: 'O Mistério do Gato', coverThumbnailUrl: null, status: 'draft', updatedAt: '2026-06-06T10:00:00Z' },
];

describe('ActivityBookGrid', () => {
  it('renders book cards with titles', () => {
    render(<ActivityBookGrid books={mockBooks} />);

    expect(screen.getByText('A Aventura da Julia')).toBeInTheDocument();
    expect(screen.getByText('O Mistério do Gato')).toBeInTheDocument();
  });

  it('renders status for each book', () => {
    render(<ActivityBookGrid books={mockBooks} />);

    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('renders image for book with cover thumbnail', () => {
    render(<ActivityBookGrid books={mockBooks} />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/cover1.png');
  });

  it('renders placeholder for book without cover thumbnail', () => {
    render(<ActivityBookGrid books={mockBooks} />);

    expect(screen.getByTestId('book-card-b2')).toBeInTheDocument();
  });

  it('returns null when books array is empty', () => {
    const { container } = render(<ActivityBookGrid books={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when books is null/undefined', () => {
    const { container } = render(<ActivityBookGrid books={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('does not render any book content or description', () => {
    const booksWithExtra = [
      { bookId: 'b1', title: 'Test Book', coverThumbnailUrl: '/cover.png', status: 'published', updatedAt: '2026-06-05T10:00:00Z' },
    ];
    render(<ActivityBookGrid books={booksWithExtra} />);

    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.queryByText(/chapter/i)).not.toBeInTheDocument();
  });
});