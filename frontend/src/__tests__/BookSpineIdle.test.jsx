import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

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
      scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 },
    },
  },
  PULL_OUT_VARIANTS_REDUCED: {
    rest: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: 1, transition: { duration: 0 } },
    pulled: { scale: 1.05, y: -8, boxShadow: '0 8px 16px rgba(0,0,0,0.2)', opacity: 1, transition: { duration: 0.15 } },
    reversing: { scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: 1, transition: { duration: 0 } },
    placeBack: {
      scale: 1, y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', opacity: 1,
      transition: { duration: 0, opacity: { duration: 0.15 } },
    },
  },
}));

import BookSpine from '../components/shelf/BookSpine';

const baseBook = { _id: 'abc123', title: 'My Book', spineColor: '#4ECDC4' };

describe('BookSpine idle animations (STORY-044)', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('adds spine-heart--idle class when book.isFavorited=true and isIdle=true', () => {
    const book = { ...baseBook, isFavorited: true };
    const { container } = render(<BookSpine book={book} isIdle={true} />);
    const svg = container.querySelector('svg[fill="#FF6B6B"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('class')).toContain('spine-heart--idle');
  });

  it('does not add spine-heart--idle class when isIdle is false', () => {
    const book = { ...baseBook, isFavorited: true };
    const { container } = render(<BookSpine book={book} isIdle={false} />);
    const svg = container.querySelector('svg[fill="#FF6B6B"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('class')).not.toContain('spine-heart--idle');
  });

  it('does not add spine-heart--idle class when book.isFavorited is false', () => {
    const book = { ...baseBook, isFavorited: false };
    const { container } = render(<BookSpine book={book} isIdle={true} />);
    const heart = container.querySelector('svg[fill="#FF6B6B"]');
    expect(heart).toBeFalsy();
  });

  it('adds animation-delay style when idle and favorited', () => {
    const book = { ...baseBook, isFavorited: true };
    const { container } = render(<BookSpine book={book} isIdle={true} />);
    const svg = container.querySelector('svg[fill="#FF6B6B"]');
    expect(svg.style.animationDelay).toBeTruthy();
  });

  it('animation-delay is deterministic per book._id', () => {
    const book1 = { _id: 'book-aaa', title: 'A', spineColor: '#4ECDC4', isFavorited: true };
    const book2 = { _id: 'book-bbb', title: 'B', spineColor: '#4ECDC4', isFavorited: true };

    const { container: c1 } = render(<BookSpine book={book1} isIdle={true} />);
    const svg1 = c1.querySelector('svg[fill="#FF6B6B"]');
    const delay1 = svg1.style.animationDelay;

    const { container: c2 } = render(<BookSpine book={book2} isIdle={true} />);
    const svg2 = c2.querySelector('svg[fill="#FF6B6B"]');
    const delay2 = svg2.style.animationDelay;

    expect(delay1).toBeTruthy();
    expect(delay2).toBeTruthy();

    const { container: c1b } = render(<BookSpine book={book1} isIdle={true} />);
    const svg1b = c1b.querySelector('svg[fill="#FF6B6B"]');
    expect(svg1b.style.animationDelay).toBe(delay1);
  });

  it('does not add animation-delay when not idle', () => {
    const book = { ...baseBook, isFavorited: true };
    const { container } = render(<BookSpine book={book} isIdle={false} />);
    const svg = container.querySelector('svg[fill="#FF6B6B"]');
    expect(svg.style.animationDelay).toBeFalsy();
  });
});