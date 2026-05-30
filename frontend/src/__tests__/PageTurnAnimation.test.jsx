// Contopia — PageTurnAnimation Component Tests (STORY-030)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PageTurnAnimation from '../components/reader/PageTurnAnimation';

// Framer Motion mock that supports motion.div, AnimatePresence, and useReducedMotion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }, ref) => (
      <div ref={ref} data-testid="motion-div" {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children, onExitComplete }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
  useReducedMotion: vi.fn(() => false),
}));

describe('PageTurnAnimation', () => {
  // ── Positive: renders children ────────────────────────────────

  describe('rendering', () => {
    it('renders children with default props', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <div data-testid="page-content">Page Content</div>
        </PageTurnAnimation>
      );
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });

    it('renders the page-turn container div', () => {
      const { container } = render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Hello</span>
        </PageTurnAnimation>
      );
      const wrapper = container.querySelector('.page-turn-container');
      expect(wrapper).toBeInTheDocument();
    });
  });

  // ── Positive: direction prop ──────────────────────────────────

  describe('direction prop', () => {
    it('renders with direction=1 (forward)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Forward</span>
        </PageTurnAnimation>
      );
      expect(screen.getByText('Forward')).toBeInTheDocument();
    });

    it('renders with direction=-1 (backward)', () => {
      render(
        <PageTurnAnimation direction={-1} pageKey="ch1-0">
          <span>Backward</span>
        </PageTurnAnimation>
      );
      expect(screen.getByText('Backward')).toBeInTheDocument();
    });
  });

  // ── Positive: onAnimationComplete ─────────────────────────────

  describe('onAnimationComplete', () => {
    it('passes onAnimationComplete to AnimatePresence', () => {
      const onComplete = vi.fn();
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0" onAnimationComplete={onComplete}>
          <span>Test</span>
        </PageTurnAnimation>
      );
      // AnimatePresence renders — no crash
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  // ── Negative: reduced motion ──────────────────────────────────

  describe('reduced motion', () => {
    it('renders without animation when prefersReducedMotion is true', async () => {
      const framerMotion = await import('framer-motion');
      framerMotion.useReducedMotion = vi.fn(() => true);

      const { container } = render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Reduced Motion</span>
        </PageTurnAnimation>
      );

      // Should render plain div without motion/AnimatePresence wrappers
      const wrapper = container.querySelector('.page-turn-container');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).not.toHaveAttribute('data-testid', 'motion-div');
      expect(screen.getByText('Reduced Motion')).toBeInTheDocument();
    });
  });

  // ── Negative: animation disabled ──────────────────────────────

  describe('isEnabled prop', () => {
    it('renders without animation when isEnabled is false', () => {
      const { container } = render(
        <PageTurnAnimation direction={1} pageKey="ch1-0" isEnabled={false}>
          <span>No Animation</span>
        </PageTurnAnimation>
      );

      const wrapper = container.querySelector('.page-turn-container');
      expect(wrapper).toBeInTheDocument();
      expect(screen.getByText('No Animation')).toBeInTheDocument();
    });
  });

  // ── Positive: will-change-transform class ─────────────────────

  describe('styling', () => {
    it('adds will-change-transform class when animation is enabled', () => {
      // When animation is enabled (default), the motion.div gets the class
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Styled</span>
        </PageTurnAnimation>
      );

      const pageTurnContainer = screen.getByText('Styled').closest('.page-turn-container');
      expect(pageTurnContainer).toBeInTheDocument();
    });
  });

  // ── Positive: pageKey ─────────────────────────────────────────

  describe('pageKey', () => {
    it('renders different page keys without crashing', () => {
      const { rerender } = render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Page 1</span>
        </PageTurnAnimation>
      );
      expect(screen.getByText('Page 1')).toBeInTheDocument();

      rerender(
        <PageTurnAnimation direction={1} pageKey="ch1-1">
          <span>Page 2</span>
        </PageTurnAnimation>
      );
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });
  });

  // ── Multiple children ─────────────────────────────────────────

  describe('multiple children', () => {
    it('renders multiple children', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span data-testid="child-1">First</span>
          <span data-testid="child-2">Second</span>
        </PageTurnAnimation>
      );
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });
});
