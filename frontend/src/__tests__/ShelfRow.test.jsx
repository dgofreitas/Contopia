import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShelfRow from '../components/shelf/ShelfRow';

const books = [
  { _id: '1', title: 'Book A', spineColor: '#FF6B6B' },
  { _id: '2', title: 'Book B', spineColor: '#4ECDC4' },
  { _id: '3', title: 'Book C', spineColor: '#45B7D1' },
];

describe('ShelfRow', () => {
  it('renders all book titles', () => {
    render(<ShelfRow books={books} onBookClick={vi.fn()} />);
    expect(screen.getByText('Book A')).toBeInTheDocument();
    expect(screen.getByText('Book B')).toBeInTheDocument();
    expect(screen.getByText('Book C')).toBeInTheDocument();
  });

  it('renders the wooden shelf bar', () => {
    const { container } = render(<ShelfRow books={books} onBookClick={vi.fn()} />);
    const shelfBars = container.querySelectorAll('.from-amber-800');
    expect(shelfBars.length).toBe(1);
  });

  it('clicks correct spine triggers onBookClick with its _id', () => {
    const onClick = vi.fn();
    render(<ShelfRow books={books} onBookClick={onClick} />);
    fireEvent.click(screen.getByText('Book A'));
    expect(onClick).toHaveBeenCalledWith('1');
  });

  it('renders nothing when no books', () => {
    const { container } = render(<ShelfRow books={[]} onBookClick={vi.fn()} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});
