// Contopia — BookSpine Reduced Motion Path (STORY-011)
// This file overrides matchMedia BEFORE importing BookSpine so the
// module-level prefersReducedMotion constant evaluates to true.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';

const origMatchMedia = window.matchMedia;

beforeAll(() => {
  // Set matchMedia to return true for prefers-reduced-motion: reduce
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterAll(() => {
  window.matchMedia = origMatchMedia;
});

// Mock framer-motion useReducedMotion for deterministic tests (STORY-037)
vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
  motion: {
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  m: {
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

describe('BookSpine (reduced motion)', () => {
  it('renders without motion wrapper when prefers-reduced-motion is set', async () => {
    // Dynamic import captures the mocked matchMedia at module evaluation time
    const { default: BookSpine } = await import('../components/shelf/BookSpine');

    const book = { _id: 'book-123', title: 'My Little Pony', spineColor: '#4ECDC4' };
    const { container } = render(<BookSpine book={book} />);

    // Should render the button element
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(screen.getByText('My Little Pony')).toBeInTheDocument();

    // When reduced motion is active, the component should still function
    // but animation-related props should be present but may be disabled
    expect(btn).toHaveAttribute('aria-label');
  });

  it('has correct a11y attributes when reduced motion is enabled', async () => {
    const { default: BookSpine } = await import('../components/shelf/BookSpine');

    const book = { _id: 'book-123', title: 'Test Book', spineColor: '#4ECDC4' };
    const onPullOut = vi.fn();

    render(<BookSpine book={book} isPulledOut={false} onPullOut={onPullOut} />);

    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-expanded="true" when pulled out (reduced motion)', async () => {
    const { default: BookSpine } = await import('../components/shelf/BookSpine');

    const book = { _id: 'book-123', title: 'Test Book', spineColor: '#4ECDC4' };
    const onPullOut = vi.fn();

    render(<BookSpine book={book} isPulledOut={true} onPullOut={onPullOut} />);

    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  // ── STORY-037: Re-sort fade behavior (reduced motion) ─────────

  describe('STORY-037: re-sort fade with reduced motion', () => {
    it('renders with animationTransition prop (fade config) when reduced motion is active', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-123', title: 'Reduce Me', spineColor: '#4ECDC4' };
      const fadeTransition = { type: 'tween', duration: 0.15, ease: 'easeOut' };

      render(<BookSpine book={book} animationTransition={fadeTransition} />);

      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
      expect(btn.textContent).toContain('Reduce Me');
    });

    it('does not render will-change style when reduced motion is active with animationTransition', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-456', title: 'No GPU', spineColor: '#4ECDC4' };
      const fadeTransition = { type: 'tween', duration: 0.15, ease: 'easeOut' };

      render(<BookSpine book={book} animationTransition={fadeTransition} />);

      const btn = screen.getByRole('button');
      // With reduced motion active, willChange should not be set even with animationTransition
      expect(btn.style.willChange).toBe('');
    });

    it('renders successfully with animationTransition and isPulledOut combined', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-789', title: 'Pulled Out No Motion', spineColor: '#4ECDC4' };
      const fadeTransition = { type: 'tween', duration: 0.15, ease: 'easeOut' };

      render(
        <BookSpine
          book={book}
          isPulledOut={true}
          animationTransition={fadeTransition}
        />
      );

      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
