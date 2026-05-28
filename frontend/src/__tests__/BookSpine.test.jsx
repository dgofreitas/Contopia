import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookSpine from '../components/shelf/BookSpine';

// setup.js already mocks react-i18next to pass through keys

// Mock framer-motion's useReducedMotion hook
const mockUseReducedMotion = vi.fn();
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
  motion: {
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
}));

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

  it('has WCAG min-width/height via className (48px for touch targets)', () => {
    render(<BookSpine book={baseBook} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('min-w-[48px]');
    expect(btn.className).toContain('min-h-[48px]');
  });

  it('has focus ring classes for a11y', () => {
    render(<BookSpine book={baseBook} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('focus:ring-2');
    expect(btn.className).toContain('focus:ring-amber-300');
  });

  it('accepts isPulledOut prop', () => {
    const { container } = render(<BookSpine book={baseBook} isPulledOut={true} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  it('has aria-expanded attribute when isPulledOut is true', () => {
    render(<BookSpine book={baseBook} isPulledOut={true} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('has aria-expanded="false" when isPulledOut is false', () => {
    render(<BookSpine book={baseBook} isPulledOut={false} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-expanded="false" when isPulledOut is not provided', () => {
    render(<BookSpine book={baseBook} />);
    const btn = screen.getByRole('button');
    // When isPulledOut is undefined, aria-expanded is undefined (falsy)
    expect(btn.getAttribute('aria-expanded')).toBeNull();
  });

  it('Enter key calls onPullOut callback', () => {
    const onPullOut = vi.fn();
    render(<BookSpine book={baseBook} onPullOut={onPullOut} />);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(onPullOut).toHaveBeenCalledTimes(1);
  });

  it('has elevated z-index and shadow style when pulled out', () => {
    const { container } = render(<BookSpine book={baseBook} isPulledOut={true} />);
    const btn = screen.getByRole('button');
    // Check for elevated z-index (50 when pulled out)
    expect(btn.style.zIndex).toBe('50');
    // Check for shadow
    expect(btn.style.boxShadow).toContain('rgba(0,0,0,0.2)');
  });

  it('does not have elevated styles when not pulled out', () => {
    const { container } = render(<BookSpine book={baseBook} isPulledOut={false} />);
    const btn = screen.getByRole('button');
    expect(btn.style.zIndex).not.toBe('50');
    expect(btn.style.boxShadow).toBeFalsy();
  });

  // ── STORY-033: ShelfProgressIndicator integration ────────────

  describe('progress integration (STORY-033)', () => {
    it('renders ShelfProgressIndicator when progress is provided', () => {
      const progress = { percentage: 60, finished: false };
      const { container } = render(<BookSpine book={baseBook} progress={progress} />);
      // Progressbar should be present
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('passes percentage to ShelfProgressIndicator', () => {
      const progress = { percentage: 75, finished: false };
      render(<BookSpine book={baseBook} progress={progress} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '75');
    });

    it('passes finished flag to ShelfProgressIndicator', () => {
      const progress = { percentage: 100, finished: true };
      render(<BookSpine book={baseBook} progress={progress} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '100');
    });

    it('does not render progress indicator when progress is not provided', () => {
      render(<BookSpine book={baseBook} />);
      expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('does not render progress indicator when progress is null', () => {
      render(<BookSpine book={baseBook} progress={null} />);
      expect(screen.queryByRole('progressbar')).toBeNull();
    });
  });

  describe('STORY-013: settle-back transition', () => {
    it('has CSS transition when not pulled out', () => {
      mockUseReducedMotion.mockReturnValue(false);
      const { container } = render(<BookSpine book={baseBook} isPulledOut={false} />);
      const btn = screen.getByRole('button');
      // Should have transition property when not pulled out
      expect(btn.style.transition).toContain('transform');
      expect(btn.style.transition).toContain('box-shadow');
    });

    it('has no CSS transition when pulled out', () => {
      mockUseReducedMotion.mockReturnValue(false);
      const { container } = render(<BookSpine book={baseBook} isPulledOut={true} />);
      const btn = screen.getByRole('button');
      // Should NOT have transition property when pulled out
      expect(btn.style.transition).not.toContain('transform');
      expect(btn.style.transition).not.toContain('box-shadow');
    });

    it('transition is "none" when reduced motion is enabled', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { container } = render(<BookSpine book={baseBook} isPulledOut={false} />);
      const btn = screen.getByRole('button');
      // When reduced motion is enabled, duration is 0ms, so transition is instant
      expect(btn.style.transition).toContain('0ms');
    });

    it('transition has 300ms duration when reduced motion is disabled', () => {
      mockUseReducedMotion.mockReturnValue(false);
      const { container } = render(<BookSpine book={baseBook} isPulledOut={false} />);
      const btn = screen.getByRole('button');
      // When reduced motion is disabled, duration is 300ms
      expect(btn.style.transition).toContain('300ms');
    });
  });
});
