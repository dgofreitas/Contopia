import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AnimationDemo from '../AnimationDemo';

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, variants, animate, whileHover, whileTap, transition, initial, style, ...rest }, ref) => (
      <div
        ref={ref}
        data-variants={JSON.stringify(variants)}
        data-animate={typeof animate === 'string' ? animate : JSON.stringify(animate)}
        data-while-hover={whileHover ? JSON.stringify(whileHover) : undefined}
        data-while-tap={whileTap ? JSON.stringify(whileTap) : undefined}
        data-initial={initial}
        style={style}
        {...rest}
      >
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children }) => <div data-testid="animate-presence">{children}</div>,
  useReducedMotion: vi.fn(() => false),
}));

describe('AnimationDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AnimationDemo />);
    expect(screen.getByTestId('animation-demo')).toBeInTheDocument();
  });

  it('renders all three animation demos', () => {
    render(<AnimationDemo />);
    expect(screen.getByTestId('demo-pull-out')).toBeInTheDocument();
    expect(screen.getByTestId('demo-page-turn')).toBeInTheDocument();
    expect(screen.getByTestId('demo-idle')).toBeInTheDocument();
  });

  it('renders pull-out spine with book title', () => {
    render(<AnimationDemo />);
    expect(screen.getByTestId('pull-out-spine')).toBeInTheDocument();
    expect(screen.getByText('Book Title')).toBeInTheDocument();
  });

  it('renders page-turn card with front and back faces', () => {
    render(<AnimationDemo />);
    expect(screen.getByTestId('page-turn-card')).toBeInTheDocument();
    expect(screen.getByTestId('page-front')).toBeInTheDocument();
    expect(screen.getByTestId('page-back')).toBeInTheDocument();
  });

  it('renders idle floating element', () => {
    render(<AnimationDemo />);
    expect(screen.getByTestId('idle-element')).toBeInTheDocument();
    expect(screen.getByText('Floating')).toBeInTheDocument();
  });

  it('renders reduced motion toggle button', () => {
    render(<AnimationDemo />);
    const toggle = screen.getByTestId('reduced-motion-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle.textContent).toContain('Reduced Motion: OFF');
  });

  it('toggles reduced motion on button click', () => {
    render(<AnimationDemo />);
    const toggle = screen.getByTestId('reduced-motion-toggle');
    expect(toggle.textContent).toContain('Reduced Motion: OFF');
    fireEvent.click(toggle);
    expect(toggle.textContent).toContain('Reduced Motion: ON');
  });

  it('disables pull-out hover/tap when reduced motion is on', () => {
    render(<AnimationDemo />);
    const toggle = screen.getByTestId('reduced-motion-toggle');
    fireEvent.click(toggle);
    const spine = screen.getByTestId('pull-out-spine');
    expect(spine.getAttribute('data-while-hover')).toBeNull();
    expect(spine.getAttribute('data-while-tap')).toBeNull();
  });

  it('pull-out spine has hover/tap when reduced motion is off', () => {
    render(<AnimationDemo />);
    const spine = screen.getByTestId('pull-out-spine');
    expect(spine.getAttribute('data-while-hover')).toBeDefined();
    expect(spine.getAttribute('data-while-tap')).toBeDefined();
  });

  it('idle element uses paused variant when reduced motion is on', () => {
    render(<AnimationDemo />);
    const toggle = screen.getByTestId('reduced-motion-toggle');
    fireEvent.click(toggle);
    const idleEl = screen.getByTestId('idle-element');
    expect(idleEl.getAttribute('data-animate')).toBe('paused');
  });

  it('idle element uses float variant when reduced motion is off', () => {
    render(<AnimationDemo />);
    const idleEl = screen.getByTestId('idle-element');
    expect(idleEl.getAttribute('data-animate')).toBe('float');
  });

  it('page-turn card animate stays front when reduced motion is on', () => {
    render(<AnimationDemo />);
    const toggle = screen.getByTestId('reduced-motion-toggle');
    fireEvent.click(toggle);
    const card = screen.getByTestId('page-turn-card');
    expect(card.getAttribute('data-animate')).toBe('front');
  });

  it('page-turn toggles flip on click', () => {
    render(<AnimationDemo />);
    const card = screen.getByTestId('page-turn-card');
    expect(card.getAttribute('data-animate')).toBe('front');
    fireEvent.click(card);
    expect(card.getAttribute('data-animate')).toBe('back');
    fireEvent.click(card);
    expect(card.getAttribute('data-animate')).toBe('front');
  });

  it('respects system prefers-reduced-motion', async () => {
    const framerMotion = await import('framer-motion');
    framerMotion.useReducedMotion.mockReturnValue(true);
    render(<AnimationDemo />);
    const toggle = screen.getByTestId('reduced-motion-toggle');
    expect(toggle.textContent).toContain('Reduced Motion: ON');
  });

  it('renders AnimatePresence wrapper', () => {
    render(<AnimationDemo />);
    expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
  });

  it('renders heading with spike label', () => {
    render(<AnimationDemo />);
    expect(screen.getByText(/Animation Demo.*STORY-038/i)).toBeInTheDocument();
  });
});