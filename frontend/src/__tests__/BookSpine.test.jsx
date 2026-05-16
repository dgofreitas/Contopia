import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookSpine from '../components/shelf/BookSpine';

// setup.js already mocks react-i18next to pass through keys

const baseBook = { _id: 'abc123', title: 'My Little Pony', spineColor: '#4ECDC4' };

describe('BookSpine', () => {
  it('renders the book title', () => {
    render(<BookSpine book={baseBook} />);
    expect(screen.getByText('My Little Pony')).toBeInTheDocument();
  });

  it('has aria-label via i18n', () => {
    render(<BookSpine book={baseBook} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label');
  });

  it('sets backgroundColor from spineColor prop', () => {
    render(<BookSpine book={baseBook} />);
    const btn = screen.getByRole('button');
    expect(btn.style.backgroundColor).toBe('rgb(78, 205, 196)');
  });

  it('falls back to computed color when spineColor is missing', () => {
    const book = { _id: 'xyz789', title: 'No color' };
    render(<BookSpine book={book} />);
    const btn = screen.getByRole('button');
    expect(btn.style.backgroundColor).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<BookSpine book={baseBook} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has WCAG min-width/height via className', () => {
    render(<BookSpine book={baseBook} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('min-w-[44px]');
    expect(btn.className).toContain('min-h-[44px]');
  });

  it('has focus ring classes for a11y', () => {
    render(<BookSpine book={baseBook} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('focus:ring-2');
    expect(btn.className).toContain('focus:ring-amber-300');
  });
});
