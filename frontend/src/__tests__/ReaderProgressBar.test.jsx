// Contopia — ReaderProgressBar Component Tests (STORY-029)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReaderProgressBar from '../components/reader/ReaderProgressBar';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('ReaderProgressBar', () => {
  // ── Positive: renders with valid props ───────────────────────

  describe('rendering', () => {
    it('renders with valid chapter index and total', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={10} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays correct progress for first chapter', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={4} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '25');
    });

    it('displays correct progress for midpoint', () => {
      render(<ReaderProgressBar currentChapterIndex={4} totalChapters={10} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '50');
    });

    it('displays 100% for last chapter', () => {
      render(<ReaderProgressBar currentChapterIndex={9} totalChapters={10} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  // ── Accessibility ────────────────────────────────────────────

  describe('accessibility', () => {
    it('has role="progressbar"', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={5} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('has aria-valuemin and aria-valuemax', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={5} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has aria-label', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={5} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'progressLabel');
    });
  });

  // ── STORY-033: percentage prop ──────────────────────────────

  describe('percentage prop (STORY-033)', () => {
    it('uses percentage prop when provided instead of chapter-based calculation', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={10} percentage={65} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '65');
    });

    it('clamps percentage above 100 to 100', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={10} percentage={150} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '100');
    });

    it('clamps percentage below 0 to 0', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={10} percentage={-10} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '0');
    });

    it('falls back to chapter-based calculation when percentage is null', () => {
      render(<ReaderProgressBar currentChapterIndex={4} totalChapters={10} percentage={null} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '50');
    });

    it('uses percentage=0 when explicitly set to 0', () => {
      render(<ReaderProgressBar currentChapterIndex={5} totalChapters={10} percentage={0} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  // ── Negative: edge cases ─────────────────────────────────────

  describe('edge cases', () => {
    it('returns null when totalChapters is 0', () => {
      const { container } = render(<ReaderProgressBar currentChapterIndex={0} totalChapters={0} />);
      expect(container.innerHTML).toBe('');
    });

    it('returns null when totalChapters is negative', () => {
      const { container } = render(<ReaderProgressBar currentChapterIndex={0} totalChapters={-1} />);
      expect(container.innerHTML).toBe('');
    });

    it('handles negative currentChapterIndex gracefully', () => {
      render(<ReaderProgressBar currentChapterIndex={-1} totalChapters={10} />);
      const bar = screen.getByRole('progressbar');
      // (-1+1)/10*100 = 0
      expect(bar).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles single chapter', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={1} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '100');
    });

    it('rounds progress to nearest integer', () => {
      render(<ReaderProgressBar currentChapterIndex={0} totalChapters={3} />);
      const bar = screen.getByRole('progressbar');
      // (1/3)*100 = 33.33 -> Math.round = 33
      expect(bar).toHaveAttribute('aria-valuenow', '33');
    });
  });
});
