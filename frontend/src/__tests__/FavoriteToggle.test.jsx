// Contopia — FavoriteToggle Component Tests (STORY-036)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FavoriteToggle from '../components/shelf/FavoriteToggle';

// setup.js mocks react-i18next globally

// Framer Motion is complex in JSDOM — mock motion.button to plain button
vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
  motion: {
    button: ({ children, whileTap, transition, initial, animate, key, ...props }) => (
      <button {...props} data-motion="true">{children}</button>
    ),
  },
  m: {
    button: ({ children, whileTap, transition, initial, animate, key, ...props }) => (
      <button {...props} data-motion="true">{children}</button>
    ),
  },
}));

describe('FavoriteToggle', () => {
  // ── Basic render ────────────────────────────────────────────────

  it('renders as a button with role="checkbox"', () => {
    render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('checkbox');
    expect(btn).toBeInTheDocument();
  });

  it('has aria-checked="false" when not favorited', () => {
    render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('has aria-checked="true" when favorited', () => {
    render(<FavoriteToggle isFavorited={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('has aria-label via i18n', () => {
    render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('checkbox');
    expect(btn).toHaveAttribute('aria-label', 'favorite.add');
  });

  it('shows "favorite.remove" label when favorited', () => {
    render(<FavoriteToggle isFavorited={true} onToggle={vi.fn()} />);
    const btn = screen.getByRole('checkbox');
    expect(btn).toHaveAttribute('aria-label', 'favorite.remove');
  });

  it('has title attribute matching label', () => {
    render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('title', 'favorite.add');
  });

  // ── SVG rendering ───────────────────────────────────────────────

  it('renders SVG heart icon', () => {
    const { container } = render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has filled heart when isFavorited=true', () => {
    const { container } = render(<FavoriteToggle isFavorited={true} onToggle={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', '#FF6B6B');
    expect(svg).toHaveAttribute('stroke', '#FF6B6B');
  });

  it('has outlined heart when isFavorited=false', () => {
    const { container } = render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', '#9CA3AF');
  });

  it('SVG has aria-hidden="true"', () => {
    const { container } = render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  // ── Interaction ─────────────────────────────────────────────────

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<FavoriteToggle isFavorited={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle when clicking filled heart (unfavorite)', () => {
    const onToggle = vi.fn();
    render(<FavoriteToggle isFavorited={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  // ── A11y & Touch targets ────────────────────────────────────────

  it('has minimum touch target (min-w-[48px] min-h-[48px])', () => {
    render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('checkbox');
    expect(btn.className).toContain('min-w-[48px]');
    expect(btn.className).toContain('min-h-[48px]');
  });

  it('has focus ring classes for a11y', () => {
    render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('checkbox');
    expect(btn.className).toContain('focus:ring-2');
    expect(btn.className).toContain('focus:ring-amber-300');
  });

  it('is an accessible button type', () => {
    render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('type', 'button');
  });

  // ── Animation / Motion ──────────────────────────────────────────

  it('renders as a motion (framer-motion) button', () => {
    render(<FavoriteToggle isFavorited={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('checkbox');
    expect(btn).toHaveAttribute('data-motion', 'true');
  });

  // ── Negative: missing props ─────────────────────────────────────

  it('does not crash when isFavorited is undefined', () => {
    const { container } = render(<FavoriteToggle onToggle={vi.fn()} />);
    const btn = screen.getByRole('checkbox');
    expect(btn).toBeInTheDocument();
  });

  it('does not crash when onToggle is undefined', () => {
    const { container } = render(<FavoriteToggle isFavorited={false} />);
    const btn = screen.getByRole('checkbox');
    expect(btn).toBeInTheDocument();
  });
});
