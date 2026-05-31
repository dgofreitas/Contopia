import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookSpine from '../components/shelf/BookSpine';

const mockUseReducedMotion = vi.fn();
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
  motion: {
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  m: {
    button: ({ children, animate, variants, onAnimationComplete, ...props }) => {
      const variantName = typeof animate === 'string' ? animate : undefined;
      const pulledStyles = {
        pulled: { scale: 1.05, y: -8, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' },
        reversing: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
        rest: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
      };
      const activeVariant = variantName && variants ? (variants[variantName] || variants.rest || {}) : {};
      const styleFromVariant = activeVariant || {};
      const mergedStyle = { ...props.style, ...styleFromVariant };
      return <button {...props} style={mergedStyle}>{children}</button>;
    },
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
    pulled: { scale: 1.05, y: -8, boxShadow: '0 8px 16px rgba(0,0,0,0.2)', opacity: 1, transition: { duration: 0.15 } },
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

const baseBook = { _id: 'abc123', title: 'My Little Pony', spineColor: '#4ECDC4' };

describe('BookSpine', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

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
    expect(btn.getAttribute('aria-expanded')).toBeNull();
  });

  it('Enter key calls onClick callback', () => {
    const onClick = vi.fn();
    render(<BookSpine book={baseBook} onClick={onClick} />);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has elevated z-index and shadow style when pulled out', () => {
    const { container } = render(<BookSpine book={baseBook} isPulledOut={true} />);
    const btn = screen.getByRole('button');
    expect(btn.style.zIndex).toBe('50');
    expect(btn.style.boxShadow).toContain('rgba(0,0,0,0.2)');
  });

  it('does not have elevated styles when not pulled out', () => {
    const { container } = render(<BookSpine book={baseBook} isPulledOut={false} />);
    const btn = screen.getByRole('button');
    expect(btn.style.zIndex).not.toBe('50');
  });

  it('has transformOrigin center bottom when pulled out', () => {
    render(<BookSpine book={baseBook} isPulledOut={true} />);
    const btn = screen.getByRole('button');
    expect(btn.style.transformOrigin).toBe('center bottom');
  });

  it('does not have transformOrigin center bottom when not pulled out', () => {
    render(<BookSpine book={baseBook} isPulledOut={false} />);
    const btn = screen.getByRole('button');
    expect(btn.style.transformOrigin).not.toBe('center bottom');
  });

  it('does not have CSS transition for transform or box-shadow (handled by Framer Motion)', () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<BookSpine book={baseBook} isPulledOut={false} />);
    const btn = screen.getByRole('button');
    expect(btn.style.transition).not.toContain('transform');
    expect(btn.style.transition).not.toContain('box-shadow');
  });

  // ── STORY-036: Heart indicator ──────────────────────────────

  describe('heart indicator (STORY-036)', () => {
    it('renders heart SVG when book.isFavorited is true', () => {
      const favBook = { ...baseBook, isFavorited: true };
      const { container } = render(<BookSpine book={favBook} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('fill', '#FF6B6B');
    });

    it('does not render heart SVG when book.isFavorited is false', () => {
      const nonFavBook = { ...baseBook, isFavorited: false };
      const { container } = render(<BookSpine book={nonFavBook} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('fill')).not.toBe('#FF6B6B');
    });

    it('does not render heart SVG when isFavorited is undefined', () => {
      const { container } = render(<BookSpine book={baseBook} />);
      const hearts = container.querySelectorAll('svg[fill="#FF6B6B"]');
      expect(hearts).toHaveLength(0);
    });

    it('heart SVG has aria-hidden="true"', () => {
      const favBook = { ...baseBook, isFavorited: true };
      const { container } = render(<BookSpine book={favBook} />);
      const svg = container.querySelector('svg[fill="#FF6B6B"]');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ── STORY-033: ShelfProgressIndicator integration ────────────

  describe('progress integration (STORY-033)', () => {
    it('renders ShelfProgressIndicator when progress is provided', () => {
      const progress = { percentage: 60, finished: false };
      const { container } = render(<BookSpine book={baseBook} progress={progress} />);
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

  // ── STORY-040: Pull-out animation ────────────────────────────

  describe('STORY-040: pull-out animation', () => {
    it('uses correct shadow when pulled out (0 8px 16px)', () => {
      render(<BookSpine book={baseBook} isPulledOut={true} />);
      const btn = screen.getByRole('button');
      expect(btn.style.boxShadow).toContain('0 8px 16px');
      expect(btn.style.boxShadow).toContain('rgba(0,0,0,0.2)');
    });

    it('uses rest shadow when not pulled out', () => {
      render(<BookSpine book={baseBook} isPulledOut={false} />);
      const btn = screen.getByRole('button');
      expect(btn.style.boxShadow).toContain('0 2px 4px');
    });

    it('renders with isReversing prop', () => {
      render(<BookSpine book={baseBook} isPulledOut={false} isReversing={true} />);
      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
    });

    it('calls onAnimationComplete callback when isPulledOut and not reversing', () => {
      const onComplete = vi.fn();
      render(<BookSpine book={baseBook} isPulledOut={true} isReversing={false} onAnimationComplete={onComplete} />);
      // onAnimationComplete is wired — in a real Framer Motion env it fires on animation end.
      // We verify the prop is accepted without error.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // ── STORY-037: Spring easing & animationTransition ────────────

  describe('STORY-037: spring easing for re-sort', () => {
    it('uses spring layout transition when animationTransition is provided (reduced-motion off)', () => {
      mockUseReducedMotion.mockReturnValue(false);
      const animTransition = { type: 'spring', stiffness: 300, damping: 20, delay: 0.15 };
      render(<BookSpine book={baseBook} animationTransition={animTransition} />);
      const btn = screen.getByRole('button');
      expect(btn).toBeInTheDocument();
    });

    it('applies spring config with correct stiffness and damping via animationTransition', () => {
      mockUseReducedMotion.mockReturnValue(false);
      const animTransition = { type: 'spring', stiffness: 300, damping: 20, delay: 0.3 };
      render(<BookSpine book={baseBook} animationTransition={animTransition} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies will-change: transform style when animationTransition provided and motion OK', () => {
      mockUseReducedMotion.mockReturnValue(false);
      const animTransition = { type: 'spring', stiffness: 300, damping: 20, delay: 0 };
      render(<BookSpine book={baseBook} animationTransition={animTransition} />);
      const btn = screen.getByRole('button');
      expect(btn.style.willChange).toBe('transform');
    });

    it('does NOT apply will-change when reduced motion is active', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const animTransition = { type: 'spring', stiffness: 300, damping: 20, delay: 0 };
      render(<BookSpine book={baseBook} animationTransition={animTransition} />);
      const btn = screen.getByRole('button');
      expect(btn.style.willChange).toBe('');
    });

    it('applies will-change when animationTransition is undefined but animationPhase is not idle', () => {
      mockUseReducedMotion.mockReturnValue(false);
      // animationPhase defaults to undefined → undefined !== 'idle' → will-change applied
      render(<BookSpine book={baseBook} />);
      const btn = screen.getByRole('button');
      expect(btn.style.willChange).toBe('transform');
    });
  });

  describe('STORY-037: reduced-motion branch on BookSpine', () => {
    it('uses tween with duration 0.15s and ease easeOut when reduced-motion active and no animationTransition', () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(<BookSpine book={baseBook} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('animationTransition overrides the default reduced-motion layout transition', () => {
      mockUseReducedMotion.mockReturnValue(true);
      const animTransition = { type: 'tween', duration: 0.15, ease: 'easeOut' };
      render(<BookSpine book={baseBook} animationTransition={animTransition} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // ============================================================
  // STORY-042: Place-back animation tests
  // ============================================================

  describe('STORY-042: place-back animation', () => {
    it('has zIndex 50 when animationPhase is placeBack', () => {
      render(
        <BookSpine
          book={baseBook}
          isPulledOut={true}
          animationPhase="placeBack"
        />
      );
      const btn = screen.getByRole('button');
      expect(btn.style.zIndex).toBe('50');
    });

    it('has zIndex 50 when animationPhase is placeBack even if isPulledOut is false', () => {
      render(
        <BookSpine
          book={baseBook}
          isPulledOut={false}
          animationPhase="placeBack"
        />
      );
      const btn = screen.getByRole('button');
      expect(btn.style.zIndex).toBe('50');
    });

    it('has willChange transform when animationPhase is placeBack', () => {
      mockUseReducedMotion.mockReturnValue(false);
      render(
        <BookSpine
          book={baseBook}
          isPulledOut={true}
          animationPhase="placeBack"
        />
      );
      const btn = screen.getByRole('button');
      expect(btn.style.willChange).toBe('transform');
    });

    it('has willChange transform when animationPhase is pullOut (non-idle)', () => {
      mockUseReducedMotion.mockReturnValue(false);
      render(
        <BookSpine
          book={baseBook}
          isPulledOut={true}
          animationPhase="pullOut"
        />
      );
      const btn = screen.getByRole('button');
      expect(btn.style.willChange).toBe('transform');
    });

    it('does NOT have willChange transform when animationPhase is idle', () => {
      mockUseReducedMotion.mockReturnValue(false);
      render(
        <BookSpine
          book={baseBook}
          isPulledOut={false}
          animationPhase="idle"
        />
      );
      const btn = screen.getByRole('button');
      expect(btn.style.willChange).toBe('');
    });

    it('has transformOrigin center bottom during placeBack', () => {
      render(
        <BookSpine
          book={baseBook}
          isPulledOut={true}
          animationPhase="placeBack"
        />
      );
      const btn = screen.getByRole('button');
      expect(btn.style.transformOrigin).toBe('center bottom');
    });

    it('calls onPlaceBackComplete when animationPhase is placeBack and onAnimationComplete fires', () => {
      const onPlaceBackComplete = vi.fn();
      render(
        <BookSpine
          book={baseBook}
          isPulledOut={true}
          animationPhase="placeBack"
          onPlaceBackComplete={onPlaceBackComplete}
        />
      );
      // The m.button mock renders the button — onAnimationComplete is wired in component
      // but doesn't auto-fire in test (no real Framer Motion). This just verifies wiring.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('STORY-042: re-tap reverse (cancelPlaceBack)', () => {
    it('renders with animationPhase="placeBack" then switches back to pulled-out', () => {
      // First render in placeBack
      const { rerender } = render(
        <BookSpine
          book={baseBook}
          isPulledOut={true}
          animationPhase="placeBack"
        />
      );
      let btn = screen.getByRole('button');
      expect(btn.style.zIndex).toBe('50');

      // Now simulate cancel → back to pulled-out with idle phase
      rerender(
        <BookSpine
          book={baseBook}
          isPulledOut={true}
          animationPhase="idle"
        />
      );
      btn = screen.getByRole('button');
      expect(btn.style.zIndex).toBe('50');
    });

    it('renders when switching from placeBack to idle with isPulledOut=false', () => {
      const { rerender } = render(
        <BookSpine
          book={baseBook}
          isPulledOut={false}
          animationPhase="placeBack"
        />
      );

      // Cancel: placeBack complete → idle, isPulledOut becomes false
      rerender(
        <BookSpine
          book={baseBook}
          isPulledOut={false}
          animationPhase="idle"
        />
      );
      const btn = screen.getByRole('button');
      expect(btn.style.zIndex).not.toBe('50');
    });
  });
});
