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

  it('passes isPulledOut=true only to the matching book', () => {
    const { container } = render(
      <ShelfRow books={books} onBookClick={vi.fn()} pulledOutBookId="2" />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    // Only book 2 should have aria-expanded="true"
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'false');
  });

  it('passes onBookClick to each BookSpine', () => {
    const onClick = vi.fn();
    render(<ShelfRow books={books} onBookClick={onClick} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClick).toHaveBeenCalledWith('1');
    fireEvent.click(buttons[1]);
    expect(onClick).toHaveBeenCalledWith('2');
    fireEvent.click(buttons[2]);
    expect(onClick).toHaveBeenCalledWith('3');
  });

  it('only one book is pulled out at a time', () => {
    const { container, rerender } = render(
      <ShelfRow books={books} onBookClick={vi.fn()} pulledOutBookId="1" />
    );
    let buttons = container.querySelectorAll('button');
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'false');

    // Switch to book 2
    rerender(<ShelfRow books={books} onBookClick={vi.fn()} pulledOutBookId="2" />);
    buttons = container.querySelectorAll('button');
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'false');
  });
});
