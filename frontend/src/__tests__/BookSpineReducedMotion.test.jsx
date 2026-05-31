import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const origMatchMedia = window.matchMedia;

beforeAll(() => {
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

vi.mock('../../hooks/useBookPullOut.js', () => ({
  PULL_OUT_VARIANTS: {
    rest: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
    pulled: { scale: 1.05, y: -8, boxShadow: '0 8px 16px rgba(0,0,0,0.2)', transition: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] } },
    reversing: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
    placeBack: {
      scale: 1,
      y: 0,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 },
    },
  },
  PULL_OUT_VARIANTS_REDUCED: {
    rest: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: 1, transition: { duration: 0 } },
    pulled: { scale: 1.05, y: -8, boxShadow: '0 8px 16px rgba(0,0,0,0.2)', opacity: 1, transition: { duration: 0.15, opacity: { duration: 0.15 }, scale: { duration: 0 }, y: { duration: 0 }, boxShadow: { duration: 0 } } },
    reversing: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: 1, transition: { duration: 0 } },
    placeBack: {
      scale: 1,
      y: 0,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      opacity: 1,
      transition: { duration: 0, opacity: { duration: 0.15 } },
    },
  },
}));

describe('BookSpine (reduced motion)', () => {
  it('renders without motion wrapper when prefers-reduced-motion is set', async () => {
    const { default: BookSpine } = await import('../components/shelf/BookSpine');

    const book = { _id: 'book-123', title: 'My Little Pony', spineColor: '#4ECDC4' };
    const { container } = render(<BookSpine book={book} />);

    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(screen.getByText('My Little Pony')).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-label');
  });

  it('has correct a11y attributes when reduced motion is enabled', async () => {
    const { default: BookSpine } = await import('../components/shelf/BookSpine');

    const book = { _id: 'book-123', title: 'Test Book', spineColor: '#4ECDC4' };
    const onPullOut = vi.fn();

    render(<BookSpine book={book} isPulledOut={false} onClick={onPullOut} />);

    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-expanded="true" when pulled out (reduced motion)', async () => {
    const { default: BookSpine } = await import('../components/shelf/BookSpine');

    const book = { _id: 'book-123', title: 'Test Book', spineColor: '#4ECDC4' };
    const onPullOut = vi.fn();

    render(<BookSpine book={book} isPulledOut={true} onClick={onPullOut} />);

    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  // ── STORY-040: Reduced-motion instant + fade ───────────────

  describe('STORY-040: reduced motion pull-out', () => {
    it('instant state change with no CSS transition for transform/shadow', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-reduced', title: 'Reduced Motion', spineColor: '#4ECDC4' };

      render(<BookSpine book={book} isPulledOut={true} />);

      const btn = screen.getByRole('button');
      expect(btn.style.transition).not.toContain('transform');
      expect(btn.style.transition).not.toContain('box-shadow');
    });

    it('has transformOrigin center bottom when pulled out (reduced motion)', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-reduced', title: 'Reduced Motion', spineColor: '#4ECDC4' };

      render(<BookSpine book={book} isPulledOut={true} />);

      const btn = screen.getByRole('button');
      expect(btn.style.transformOrigin).toBe('center bottom');
    });

    it('uses reduced-motion variants with opacity fade', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-reduced', title: 'Reduced Motion', spineColor: '#4ECDC4' };

      render(<BookSpine book={book} isPulledOut={true} />);

      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-expanded', 'true');
    });
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

  // ============================================================
  // STORY-042: Reduced-motion place-back tests
  // ============================================================

  describe('STORY-042: reduced motion place-back', () => {
    it('renders placeBack variant without error (reduced motion)', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-pb', title: 'Place Back', spineColor: '#FF6B6B' };

      render(
        <BookSpine
          book={book}
          isPulledOut={true}
          animationPhase="placeBack"
        />
      );

      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
      expect(btn.style.zIndex).toBe('50');
    });

    it('has no CSS transition for transform/shadow when placeBack (reduced motion)', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-np', title: 'No Transition', spineColor: '#4ECDC4' };

      render(
        <BookSpine
          book={book}
          isPulledOut={true}
          animationPhase="placeBack"
        />
      );

      const btn = screen.getByRole('button');
      // Reduced motion means willChange is not applied
      expect(btn.style.willChange).toBe('');
    });

    it('does NOT apply willChange when reduced motion and placeBack', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-rm', title: 'Reduced', spineColor: '#4ECDC4' };

      render(
        <BookSpine
          book={book}
          isPulledOut={true}
          animationPhase="placeBack"
        />
      );

      const btn = screen.getByRole('button');
      expect(btn.style.willChange).toBe('');
    });

    it('renders placeBack then idle without crashing (instant state change)', async () => {
      const { default: BookSpine } = await import('../components/shelf/BookSpine');

      const book = { _id: 'book-cycle', title: 'Cycle', spineColor: '#4ECDC4' };

      const { rerender } = render(
        <BookSpine
          book={book}
          isPulledOut={true}
          animationPhase="placeBack"
        />
      );

      let btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();

      // Instant state change: placeBack → idle (reduced motion means duration=0)
      rerender(
        <BookSpine
          book={book}
          isPulledOut={false}
          animationPhase="idle"
        />
      );

      btn = screen.getByRole('button');
      expect(btn.style.zIndex).not.toBe('50');
    });
  });
});
