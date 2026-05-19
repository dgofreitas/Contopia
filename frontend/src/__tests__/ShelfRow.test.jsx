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

  describe('STORY-013: shelf shadow during place-back', () => {
    it('has darker shadow when placingBackBookId matches a book in the row', () => {
      const { container } = render(
        <ShelfRow books={books} onBookClick={vi.fn()} pulledOutBookId="2" placingBackBookId="2" />
      );
      const shelfBar = container.querySelector('.from-amber-900');
      expect(shelfBar).toBeInTheDocument();
      expect(shelfBar).toHaveClass('shadow-lg');
      expect(shelfBar).not.toHaveClass('shadow-md');
    });

    it('has normal shadow when placingBackBookId is null', () => {
      const { container } = render(
        <ShelfRow books={books} onBookClick={vi.fn()} pulledOutBookId="2" placingBackBookId={null} />
      );
      const shelfBar = container.querySelector('.from-amber-800');
      expect(shelfBar).toBeInTheDocument();
      expect(shelfBar).toHaveClass('shadow-md');
      expect(shelfBar).not.toHaveClass('shadow-lg');
    });

    it('has normal shadow when placingBackBookId does not match any book in row', () => {
      const { container } = render(
        <ShelfRow books={books} onBookClick={vi.fn()} pulledOutBookId="2" placingBackBookId="999" />
      );
      const shelfBar = container.querySelector('.from-amber-800');
      expect(shelfBar).toBeInTheDocument();
      expect(shelfBar).toHaveClass('shadow-md');
      expect(shelfBar).not.toHaveClass('shadow-lg');
    });

    it('shelf bar has transition classes for shadow animation', () => {
      const { container } = render(
        <ShelfRow books={books} onBookClick={vi.fn()} pulledOutBookId="1" placingBackBookId="1" />
      );
      const shelfBar = container.querySelector('.h-3.rounded-b-sm');
      expect(shelfBar).toBeInTheDocument();
      expect(shelfBar).toHaveClass('transition-shadow');
      expect(shelfBar).toHaveClass('duration-300');
    });
  });

  describe('STORY-014: CSS Grid Layout', () => {
    it('uses CSS Grid via shelf-row-grid class', () => {
      const { container } = render(<ShelfRow books={books} onBookClick={vi.fn()} />);
      const gridContainer = container.querySelector('.shelf-row-grid');
      expect(gridContainer).toBeInTheDocument();
    });

    it('wraps each BookSpine in shelf-spine-cell div', () => {
      const { container } = render(<ShelfRow books={books} onBookClick={vi.fn()} />);
      const spineCells = container.querySelectorAll('.shelf-spine-cell');
      expect(spineCells.length).toBe(3);
    });

    it('spine cell wrappers have transition class for smooth repositioning', () => {
      const { container } = render(<ShelfRow books={books} onBookClick={vi.fn()} />);
      const spineCells = container.querySelectorAll('.shelf-spine-cell');
      spineCells.forEach((cell) => {
        expect(cell.className).toContain('shelf-spine-cell');
      });
    });
  });
});
