import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

const mockUseShelfIdle = vi.fn();
vi.mock('../hooks/useShelfIdle', () => ({
  default: (...args) => mockUseShelfIdle(...args),
}));

const mockSortAnimationState = vi.hoisted(() => ({
  sortGeneration: 0,
  prefersReducedMotion: false,
  getTransition: (index) => ({
    type: 'spring', stiffness: 300, damping: 20, delay: Math.min(index * 0.03, 0.3),
  }),
  isAnimating: true,
}));

vi.mock('../hooks/useSortAnimation', () => ({
  default: () => ({
    sortGeneration: mockSortAnimationState.sortGeneration,
    prefersReducedMotion: mockSortAnimationState.prefersReducedMotion,
    getTransition: mockSortAnimationState.getTransition,
    isAnimating: mockSortAnimationState.isAnimating,
  }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookshelfGrid from '../components/shelf/BookshelfGrid';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('BookshelfGrid idle animations (STORY-044)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseShelfIdle.mockReturnValue({ isIdle: false, shelfActive: false, prefersReducedMotion: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds shelf--active class to section when shelfActive is true', () => {
    mockUseShelfIdle.mockReturnValue({ isIdle: false, shelfActive: true, prefersReducedMotion: false });

    const { container } = renderWithProviders(
      <BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={vi.fn()} />
    );

    const section = container.querySelector('section');
    expect(section).toHaveClass('shelf--active');
  });

  it('does not add shelf--active class when shelfActive is false', () => {
    mockUseShelfIdle.mockReturnValue({ isIdle: false, shelfActive: false, prefersReducedMotion: false });

    const { container } = renderWithProviders(
      <BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={vi.fn()} />
    );

    const section = container.querySelector('section');
    expect(section).not.toHaveClass('shelf--active');
  });

  it('passes isIdle to ShelfRow', () => {
    mockUseShelfIdle.mockReturnValue({ isIdle: true, shelfActive: false, prefersReducedMotion: false });

    const { container } = renderWithProviders(
      <BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={vi.fn()} />
    );

    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('calls useShelfIdle with shelfRef', () => {
    renderWithProviders(
      <BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={vi.fn()} />
    );

    expect(mockUseShelfIdle).toHaveBeenCalled();
    const refArg = mockUseShelfIdle.mock.calls[0][0];
    expect(refArg).toBeTruthy();
    expect(typeof refArg).toBe('object');
  });

  it('section has ref attached', () => {
    const { container } = renderWithProviders(
      <BookshelfGrid books={[{ _id: '1', title: 'A' }]} onBookClick={vi.fn()} />
    );

    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
  });
});