// Contopia — PageTurnAnimation Component Tests (STORY-043)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PageTurnAnimation from '../components/reader/PageTurnAnimation';

// Framer Motion mock that supports motion.div, m.div, AnimatePresence, and useReducedMotion
const mockUseReducedMotion = vi.fn(() => false);

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }, ref) => (
      <div ref={ref} data-testid="motion-div" {...props}>{children}</div>
    )),
  },
  m: {
    div: React.forwardRef(({ children, initial, animate, exit, transition, ...rest }, ref) => (
      <div
        ref={ref}
        data-testid="motion-div"
        data-initial={initial ? JSON.stringify(initial) : undefined}
        data-animate={animate ? JSON.stringify(animate) : undefined}
        data-exit={exit ? JSON.stringify(exit) : undefined}
        data-transition={transition ? JSON.stringify(transition) : undefined}
        {...rest}
      >
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children, onExitComplete, mode }) => (
    <div data-testid="animate-presence" data-mode={mode} data-on-exit-complete={onExitComplete ? 'true' : undefined}>
      {children}
    </div>
  ),
  useReducedMotion: () => mockUseReducedMotion(),
}));

describe('PageTurnAnimation', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

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

    it('renders AnimatePresence with mode="wait"', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Test</span>
        </PageTurnAnimation>
      );
      const presence = screen.getByTestId('animate-presence');
      expect(presence).toBeInTheDocument();
      expect(presence).toHaveAttribute('data-mode', 'wait');
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

    it('sets initial x=100% for direction=1 (forward)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Forward</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const initial = JSON.parse(motionDiv.dataset.initial);
      expect(initial.x).toBe('100%');
      expect(initial.opacity).toBe(0);
    });

    it('sets initial x=-100% for direction=-1 (backward)', () => {
      render(
        <PageTurnAnimation direction={-1} pageKey="ch1-0">
          <span>Backward</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const initial = JSON.parse(motionDiv.dataset.initial);
      expect(initial.x).toBe('-100%');
      expect(initial.opacity).toBe(0);
    });

    it('sets exit x=-100% for direction=1 (forward)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Forward</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const exit = JSON.parse(motionDiv.dataset.exit);
      expect(exit.x).toBe('-100%');
      expect(exit.opacity).toBe(0);
    });

    it('sets exit x=100% for direction=-1 (backward)', () => {
      render(
        <PageTurnAnimation direction={-1} pageKey="ch1-0">
          <span>Backward</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const exit = JSON.parse(motionDiv.dataset.exit);
      expect(exit.x).toBe('100%');
      expect(exit.opacity).toBe(0);
    });
  });

  // ── Opacity cross-fade ────────────────────────────────────────

  describe('opacity cross-fade', () => {
    it('animates opacity from 0 to 1 (cross-fade in)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Fade In</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const animate = JSON.parse(motionDiv.dataset.animate);
      expect(animate.opacity).toBe(1);
    });

    it('initial opacity is 0 (cross-fade in starts transparent)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Start</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const initial = JSON.parse(motionDiv.dataset.initial);
      expect(initial.opacity).toBe(0);
    });

    it('exit opacity is 0 (cross-fade out)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Exit</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const exit = JSON.parse(motionDiv.dataset.exit);
      expect(exit.opacity).toBe(0);
    });
  });

  // ── Duration and easing ───────────────────────────────────────

  describe('transition timing', () => {
    it('uses 250ms duration by default (0.25s)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Timing</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const transition = JSON.parse(motionDiv.dataset.transition);
      expect(transition.duration).toBe(0.25);
    });

    it('uses Material ease-out [0.4, 0, 0.2, 1]', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Easing</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const transition = JSON.parse(motionDiv.dataset.transition);
      expect(transition.ease).toEqual([0.4, 0, 0.2, 1]);
    });
  });

  // ── accelerateDuration prop ───────────────────────────────────

  describe('accelerateDuration prop', () => {
    it('uses accelerateDuration when provided (in ms)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0" accelerateDuration={100}>
          <span>Accelerated</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const transition = JSON.parse(motionDiv.dataset.transition);
      expect(transition.duration).toBe(0.1); // 100ms = 0.1s
    });

    it('uses default 250ms when accelerateDuration is null', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0" accelerateDuration={null}>
          <span>Normal</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const transition = JSON.parse(motionDiv.dataset.transition);
      expect(transition.duration).toBe(0.25);
    });

    it('uses default 250ms when accelerateDuration is undefined', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Default</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const transition = JSON.parse(motionDiv.dataset.transition);
      expect(transition.duration).toBe(0.25);
    });

    it('uses accelerateDuration of 50ms', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0" accelerateDuration={50}>
          <span>Fast</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const transition = JSON.parse(motionDiv.dataset.transition);
      expect(transition.duration).toBe(0.05);
    });
  });

  // ── Reduced motion ────────────────────────────────────────────

  describe('reduced motion', () => {
    it('renders AnimatePresence with opacity-only fade when prefersReducedMotion is true', () => {
      mockUseReducedMotion.mockReturnValue(true);

      const { container } = render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Reduced Motion</span>
        </PageTurnAnimation>
      );

      // Reduced motion should render within AnimatePresence (opacity-only fade, 150ms)
      const presence = screen.getByTestId('animate-presence');
      expect(presence).toBeInTheDocument();

      // The motion-div should have opacity-only transitions (no translateX)
      const motionDiv = screen.getByTestId('motion-div');
      const initial = JSON.parse(motionDiv.dataset.initial);
      expect(initial).toEqual({ opacity: 0 });
      const animate = JSON.parse(motionDiv.dataset.animate);
      expect(animate).toEqual({ opacity: 1 });
      const exit = JSON.parse(motionDiv.dataset.exit);
      expect(exit).toEqual({ opacity: 0 });
      const transition = JSON.parse(motionDiv.dataset.transition);
      expect(transition.duration).toBe(0.15); // 150ms

      // Should NOT have x/translateX properties
      expect(initial.x).toBeUndefined();
      expect(initial).not.toHaveProperty('x');
    });

    it('uses 150ms duration for reduced motion', () => {
      mockUseReducedMotion.mockReturnValue(true);

      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Slow Motion</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      const transition = JSON.parse(motionDiv.dataset.transition);
      expect(transition.duration).toBe(0.15);
    });

    it('reduced motion fade still renders children', () => {
      mockUseReducedMotion.mockReturnValue(true);

      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Fade Content</span>
        </PageTurnAnimation>
      );
      expect(screen.getByText('Fade Content')).toBeInTheDocument();
    });
  });

  // ── isEnabled prop ────────────────────────────────────────────

  describe('isEnabled prop', () => {
    it('renders without animation when isEnabled is false', () => {
      const { container } = render(
        <PageTurnAnimation direction={1} pageKey="ch1-0" isEnabled={false}>
          <span>No Animation</span>
        </PageTurnAnimation>
      );

      // Should render a plain div (no AnimatePresence, no motion-div)
      const wrapper = container.querySelector('.page-turn-container');
      expect(wrapper).toBeInTheDocument();
      expect(screen.queryByTestId('motion-div')).not.toBeInTheDocument();
      expect(screen.queryByTestId('animate-presence')).not.toBeInTheDocument();
      expect(screen.getByText('No Animation')).toBeInTheDocument();
    });

    it('renders with animation when isEnabled is true (default)', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Animated</span>
        </PageTurnAnimation>
      );
      expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
      expect(screen.getByTestId('motion-div')).toBeInTheDocument();
    });
  });

  // ── onAnimationComplete ───────────────────────────────────────

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

    it('AnimatePresence receives onExitComplete callback', () => {
      const onComplete = vi.fn();
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0" onAnimationComplete={onComplete}>
          <span>Test</span>
        </PageTurnAnimation>
      );
      const presence = screen.getByTestId('animate-presence');
      expect(presence).toHaveAttribute('data-on-exit-complete', 'true');
    });
  });

  // ── Styling ───────────────────────────────────────────────────

  describe('styling', () => {
    it('adds will-change-transform class when animation is enabled', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Styled</span>
        </PageTurnAnimation>
      );

      const pageTurnContainer = screen.getByText('Styled').closest('.page-turn-container');
      expect(pageTurnContainer).toBeInTheDocument();
      expect(pageTurnContainer.classList.contains('will-change-transform')).toBe(true);
    });

    it('has will-change: transform inline style', () => {
      render(
        <PageTurnAnimation direction={1} pageKey="ch1-0">
          <span>Will Change</span>
        </PageTurnAnimation>
      );
      const motionDiv = screen.getByTestId('motion-div');
      expect(motionDiv.style.willChange).toBe('transform');
    });
  });

  // ── pageKey ───────────────────────────────────────────────────

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