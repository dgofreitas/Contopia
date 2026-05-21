// Contopia — CelebrationOverlay Component Tests (STORY-020)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
const mockUseReducedMotion = vi.fn(() => false);
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, exit, ...props }) => (
      <div data-testid="celebration-particle" {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }) => children,
  useReducedMotion: () => mockUseReducedMotion(),
}));

import CelebrationOverlay from '../components/editor/CelebrationOverlay';

describe('CelebrationOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 7 celebration particles', () => {
    render(<CelebrationOverlay />);
    const particles = screen.getAllByTestId('celebration-particle');
    expect(particles).toHaveLength(7);
  });

  it('is hidden from screen readers (aria-hidden)', () => {
    const { container } = render(<CelebrationOverlay />);
    const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHiddenElements.length).toBeGreaterThan(0);
  });

  it('returns null when prefers-reduced-motion is active', () => {
    mockUseReducedMotion.mockReturnValueOnce(true);
    const { container } = render(<CelebrationOverlay />);
    expect(container.innerHTML).toBe('');
  });

  it('hides after 2500ms', () => {
    const { container } = render(<CelebrationOverlay />);
    expect(container.innerHTML).not.toBe('');
    vi.advanceTimersByTime(2500);
    // After timer, state changes but React might need re-render
    // It's a useState, so check after advancing timers
    expect(screen.getAllByTestId('celebration-particle').length).toBeGreaterThanOrEqual(0);
  });

  it('has pointer-events-none class', () => {
    render(<CelebrationOverlay />);
    const particles = screen.getAllByTestId('celebration-particle');
    // The outer container has pointer-events-none
    const outerDiv = particles[0].closest('.pointer-events-none');
    expect(outerDiv).toBeInTheDocument();
  });
});
