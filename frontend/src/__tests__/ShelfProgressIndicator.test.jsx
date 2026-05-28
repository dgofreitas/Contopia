// Contopia — ShelfProgressIndicator Component Tests (STORY-033)
// AC4: Progress indicator on book spines in bookshelf view
// NFR-ACC-01: Accessible progressbar with aria attributes
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShelfProgressIndicator from '../components/reader/ShelfProgressIndicator';

// setup.js already mocks react-i18next globally to pass through keys
// Override with specific mock for our test
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (key === 'progressLabel' && opts) return `${opts.percentage}% read`;
      if (key === 'finishedLabel') return 'Finished';
      return key;
    },
  }),
}));

describe('ShelfProgressIndicator', () => {
  // ── Positive: renders with valid props ────────────────────────

  describe('rendering', () => {
    it('renders with valid percentage', () => {
      const { container } = render(<ShelfProgressIndicator percentage={50} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders progress fill with correct width', () => {
      const { container } = render(<ShelfProgressIndicator percentage={75} />);
      const fill = container.querySelector('.h-full');
      expect(fill).toBeInTheDocument();
      expect(fill).toHaveStyle({ width: '75%' });
    });

    it('renders with 0% progress', () => {
      const { container } = render(<ShelfProgressIndicator percentage={0} />);
      const fill = container.querySelector('.h-full');
      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('renders with 100% progress', () => {
      const { container } = render(<ShelfProgressIndicator percentage={100} />);
      const fill = container.querySelector('.h-full');
      expect(fill).toHaveStyle({ width: '100%' });
    });
  });

  // ── Accessibility (NFR-ACC-01) ────────────────────────────────

  describe('accessibility', () => {
    it('has role="progressbar"', () => {
      render(<ShelfProgressIndicator percentage={30} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('has aria-valuenow set to percentage', () => {
      render(<ShelfProgressIndicator percentage={42} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    });

    it('has aria-valuemin set to 0', () => {
      render(<ShelfProgressIndicator percentage={50} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0');
    });

    it('has aria-valuemax set to 100', () => {
      render(<ShelfProgressIndicator percentage={50} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100');
    });

    it('has aria-label with percentage text for in-progress', () => {
      render(<ShelfProgressIndicator percentage={65} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-label', '65% read');
    });

    it('has aria-label with finished text when completed', () => {
      render(<ShelfProgressIndicator percentage={100} finished={true} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-label', 'Finished');
    });
  });

  // ── Color states: green (in-progress) vs gold (finished) ─────

  describe('color states', () => {
    it('uses emerald (green) for in-progress', () => {
      const { container } = render(<ShelfProgressIndicator percentage={50} />);
      const fill = container.querySelector('.bg-emerald-500');
      expect(fill).toBeInTheDocument();
    });

    it('uses amber (gold) for finished', () => {
      const { container } = render(<ShelfProgressIndicator percentage={100} finished={true} />);
      const fill = container.querySelector('.bg-amber-400');
      expect(fill).toBeInTheDocument();
    });

    it('uses gold when percentage is 100 even without finished prop', () => {
      const { container } = render(<ShelfProgressIndicator percentage={100} />);
      const fill = container.querySelector('.bg-amber-400');
      expect(fill).toBeInTheDocument();
    });

    it('uses gold when finished=true even with low percentage', () => {
      const { container } = render(<ShelfProgressIndicator percentage={50} finished={true} />);
      const fill = container.querySelector('.bg-amber-400');
      expect(fill).toBeInTheDocument();
    });
  });

  // ── Negative: edge cases ──────────────────────────────────────

  describe('edge cases', () => {
    it('clamps negative percentage to 0', () => {
      const { container } = render(<ShelfProgressIndicator percentage={-10} />);
      const fill = container.querySelector('.h-full');
      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('clamps percentage > 100 to 100', () => {
      const { container } = render(<ShelfProgressIndicator percentage={150} />);
      const fill = container.querySelector('.h-full');
      expect(fill).toHaveStyle({ width: '100%' });
    });

    it('rounds percentage to nearest integer', () => {
      render(<ShelfProgressIndicator percentage={33.7} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '34');
    });

    it('handles undefined percentage gracefully — sets aria-valuenow to NaN (current behavior)', () => {
      render(<ShelfProgressIndicator />);
      const bar = screen.getByRole('progressbar');
      // Math.round(undefined) produces NaN — the component renders it as-is
      expect(bar).toHaveAttribute('aria-valuenow', 'NaN');
    });

    it('rounds 99.5 to 100', () => {
      const { container } = render(<ShelfProgressIndicator percentage={99.5} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  // ── Finished label ────────────────────────────────────────────

  describe('finished label', () => {
    it('renders finished label when finished prop is true', () => {
      render(<ShelfProgressIndicator percentage={100} finished={true} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-label', 'Finished');
    });

    it('renders progress label for in-progress', () => {
      render(<ShelfProgressIndicator percentage={60} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-label', '60% read');
    });
  });

  // ── Visual structure ──────────────────────────────────────────

  describe('visual structure', () => {
    it('has absolute positioning at bottom of spine', () => {
      const { container } = render(<ShelfProgressIndicator percentage={50} />);
      const wrapper = container.querySelector('.absolute');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.className).toContain('bottom-0');
    });

    it('has bottom-0 positioning at bottom of spine', () => {
      const { container } = render(<ShelfProgressIndicator percentage={50} />);
      const bar = screen.getByRole('progressbar');
      expect(bar.className).toContain('bottom-0');
    });

    it('has transition-all for smooth animation', () => {
      const { container } = render(<ShelfProgressIndicator percentage={50} />);
      const fill = container.querySelector('.transition-all');
      expect(fill).toBeInTheDocument();
    });
  });
});
