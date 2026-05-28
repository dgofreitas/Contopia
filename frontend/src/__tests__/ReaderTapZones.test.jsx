// Contopia — ReaderTapZones Component Tests (STORY-029)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReaderTapZones from '../components/reader/ReaderTapZones';
import useReaderStore from '../stores/reader-store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('ReaderTapZones', () => {
  const defaultProps = {
    onPreviousChapter: vi.fn(),
    onNextChapter: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useReaderStore.setState({ isToolbarVisible: false, toolbarTimeout: null });
  });

  // ── Rendering ────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders three tap zone buttons (hidden: true)', () => {
      render(<ReaderTapZones {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      expect(buttons).toHaveLength(3);
    });

    it('has aria-hidden on the container', () => {
      const { container } = render(<ReaderTapZones {...defaultProps} />);
      const outer = container.firstChild;
      expect(outer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ── Zone: Left (previous chapter) ────────────────────────────

  describe('left zone', () => {
    it('calls onPreviousChapter on click', async () => {
      const onPrev = vi.fn();
      render(<ReaderTapZones {...defaultProps} onPreviousChapter={onPrev} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      await userEvent.click(buttons[0]);
      expect(onPrev).toHaveBeenCalledTimes(1);
    });

    it('has aria-label for left zone', () => {
      render(<ReaderTapZones {...defaultProps} />);
      expect(screen.getByLabelText('tapLeft')).toBeInTheDocument();
    });

    it('has tabIndex -1', () => {
      render(<ReaderTapZones {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      expect(buttons[0]).toHaveAttribute('tabindex', '-1');
    });
  });

  // ── Zone: Center (toggle toolbar) ────────────────────────────

  describe('center zone', () => {
    it('calls toggleToolbar on click', async () => {
      const toggleSpy = vi.spyOn(useReaderStore.getState(), 'toggleToolbar');
      render(<ReaderTapZones {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      await userEvent.click(buttons[1]);
      expect(toggleSpy).toHaveBeenCalledTimes(1);
      toggleSpy.mockRestore();
    });

    it('has aria-label for center zone', () => {
      render(<ReaderTapZones {...defaultProps} />);
      expect(screen.getByLabelText('tapCenter')).toBeInTheDocument();
    });
  });

  // ── Zone: Right (next chapter) ───────────────────────────────

  describe('right zone', () => {
    it('calls onNextChapter on click', async () => {
      const onNext = vi.fn();
      render(<ReaderTapZones {...defaultProps} onNextChapter={onNext} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      await userEvent.click(buttons[2]);
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('has aria-label for right zone', () => {
      render(<ReaderTapZones {...defaultProps} />);
      expect(screen.getByLabelText('tapRight')).toBeInTheDocument();
    });
  });

  // ── CSS classes ──────────────────────────────────────────────

  describe('styling', () => {
    it('left zone has 15% width', () => {
      render(<ReaderTapZones {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      expect(buttons[0].className).toContain('w-[15%]');
    });

    it('center zone has 70% width', () => {
      render(<ReaderTapZones {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      expect(buttons[1].className).toContain('w-[70%]');
    });

    it('right zone has 15% width', () => {
      render(<ReaderTapZones {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      expect(buttons[2].className).toContain('w-[15%]');
    });
  });

  // ── Multiple interactions ────────────────────────────────────

  describe('multiple interactions', () => {
    it('left zone can be clicked multiple times', async () => {
      const onPrev = vi.fn();
      render(<ReaderTapZones {...defaultProps} onPreviousChapter={onPrev} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      await userEvent.click(buttons[0]);
      await userEvent.click(buttons[0]);
      await userEvent.click(buttons[0]);
      expect(onPrev).toHaveBeenCalledTimes(3);
    });

    it('center zone toggleToolbar called each time', async () => {
      const toggleSpy = vi.spyOn(useReaderStore.getState(), 'toggleToolbar');
      render(<ReaderTapZones {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { hidden: true });
      await userEvent.click(buttons[1]);
      await userEvent.click(buttons[1]);
      expect(toggleSpy).toHaveBeenCalledTimes(2);
      toggleSpy.mockRestore();
    });
  });
});
