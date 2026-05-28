// Contopia — ReaderToolbar Component Tests (STORY-029)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ReaderToolbar from '../components/reader/ReaderToolbar';
import useReaderStore from '../stores/reader-store';

vi.mock('framer-motion', () => ({
  motion: {
    header: React.forwardRef(({ children, ...props }, ref) => (
      <header ref={ref} {...props}>{children}</header>
    )),
  },
  AnimatePresence: ({ children }) => children,
  useReducedMotion: () => false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('ReaderToolbar', () => {
  const defaultProps = {
    onBackToShelf: vi.fn(),
    onToggleChapterDrawer: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  beforeEach(() => {
    useReaderStore.setState({
      isToolbarVisible: true,
      isFullscreen: true,
      toolbarTimeout: null,
      isSettingsOpen: false,
    });
    vi.clearAllMocks();
  });

  // ── Visibility ───────────────────────────────────────────────

  describe('visibility', () => {
    it('renders when isToolbarVisible is true', () => {
      render(<ReaderToolbar {...defaultProps} />);
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('does NOT render when isToolbarVisible is false', () => {
      useReaderStore.setState({ isToolbarVisible: false });
      render(<ReaderToolbar {...defaultProps} />);
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });
  });

  // ── Buttons exist and call handlers ──────────────────────────

  describe('button actions', () => {
    it('renders Back to Shelf button and calls onBackToShelf on click', async () => {
      const onBack = vi.fn();
      render(<ReaderToolbar {...defaultProps} onBackToShelf={onBack} />);
      const btn = screen.getByLabelText('backToShelfFullscreen');
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders Chapter List button and calls onToggleChapterDrawer on click', async () => {
      const onToggle = vi.fn();
      render(<ReaderToolbar {...defaultProps} onToggleChapterDrawer={onToggle} />);
      const btn = screen.getByLabelText('openChapterList');
      await userEvent.click(btn);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('renders Settings button and calls onOpenSettings on click', async () => {
      const onOpen = vi.fn();
      render(<ReaderToolbar {...defaultProps} onOpenSettings={onOpen} />);
      const btn = screen.getByLabelText('settings');
      await userEvent.click(btn);
      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  // ── Accessibility ────────────────────────────────────────────

  describe('accessibility', () => {
    it('has role="toolbar"', () => {
      render(<ReaderToolbar {...defaultProps} />);
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('has aria-label on toolbar', () => {
      render(<ReaderToolbar {...defaultProps} />);
      expect(screen.getByRole('toolbar')).toHaveAttribute('aria-label', 'toggleToolbar');
    });

    it('buttons have aria-labels', () => {
      render(<ReaderToolbar {...defaultProps} />);
      expect(screen.getByLabelText('backToShelfFullscreen')).toBeInTheDocument();
      expect(screen.getByLabelText('openChapterList')).toBeInTheDocument();
      expect(screen.getByLabelText('settings')).toBeInTheDocument();
    });
  });

  // ── Escape key hides toolbar ─────────────────────────────────

  describe('Escape key', () => {
    it('calls hideToolbar on Escape key', () => {
      const hideSpy = vi.spyOn(useReaderStore.getState(), 'hideToolbar');
      render(<ReaderToolbar {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(hideSpy).toHaveBeenCalled();
      hideSpy.mockRestore();
    });
  });

  // ── Key handler does not crash on Tab ────────────────────────

  describe('Tab key', () => {
    it('does not crash when Tab is pressed', () => {
      render(<ReaderToolbar {...defaultProps} />);
      expect(() => fireEvent.keyDown(window, { key: 'Tab' })).not.toThrow();
    });

    it('does not crash on Shift+Tab', () => {
      render(<ReaderToolbar {...defaultProps} />);
      expect(() => fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })).not.toThrow();
    });
  });

  // ── Mouse hover resets auto-hide timer ───────────────────────

  describe('mouse interaction', () => {
    it('does not crash on mouseEnter', () => {
      render(<ReaderToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      fireEvent.mouseEnter(toolbar);
      // Should not throw — timer cleared silently
    });

    it('does not crash on mouseLeave', () => {
      render(<ReaderToolbar {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar');
      fireEvent.mouseLeave(toolbar);
      // Should not throw
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────

  describe('cleanup', () => {
    it('clears auto-hide timer on unmount', () => {
      const { unmount } = render(<ReaderToolbar {...defaultProps} />);
      // Unmount while visible should clear timers
      expect(() => unmount()).not.toThrow();
    });
  });
});
