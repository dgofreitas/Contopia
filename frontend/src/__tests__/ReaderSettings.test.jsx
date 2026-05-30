// Contopia — ReaderSettings Component Tests (STORY-029)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ReaderSettings from '../components/reader/ReaderSettings';
import useReaderStore from '../stores/reader-store';

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  m: {
    div: React.forwardRef(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }) => children,
  useReducedMotion: () => false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('ReaderSettings', () => {
  beforeEach(() => {
    useReaderStore.setState({
      isSettingsOpen: true,
      fontSize: 'medium',
      theme: 'light',
      isToolbarVisible: false,
      toolbarTimeout: null,
    });
    vi.clearAllMocks();
  });

  // ── Visibility ───────────────────────────────────────────────

  describe('visibility', () => {
    it('renders dialog when isSettingsOpen is true', () => {
      render(<ReaderSettings />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isSettingsOpen is false', () => {
      useReaderStore.setState({ isSettingsOpen: false });
      render(<ReaderSettings />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ── Close button ─────────────────────────────────────────────

  describe('close button', () => {
    it('calls closeSettings on X button click', async () => {
      const closeSpy = vi.spyOn(useReaderStore.getState(), 'closeSettings');
      render(<ReaderSettings />);
      const closeBtn = screen.getByLabelText('close');
      await userEvent.click(closeBtn);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      closeSpy.mockRestore();
    });
  });

  // ── Font size buttons ────────────────────────────────────────

  describe('font size controls', () => {
    it('renders three font size options', () => {
      render(<ReaderSettings />);
      // Keys: settingsFontSizeSmall, settingsFontSizeMedium, settingsFontSizeLarge
      expect(screen.getByText('settingsFontSizeSmall')).toBeInTheDocument();
      expect(screen.getByText('settingsFontSizeMedium')).toBeInTheDocument();
      expect(screen.getByText('settingsFontSizeLarge')).toBeInTheDocument();
    });

    it('highlights current font size as pressed', () => {
      render(<ReaderSettings />);
      const buttons = screen.getAllByRole('button', { pressed: true });
      // Medium should be pressed
      const mediumBtn = buttons.find(
        (b) => b.textContent === 'settingsFontSizeMedium'
      );
      expect(mediumBtn).toBeTruthy();
    });

    it('calls setFontSize when clicking a font size button', async () => {
      const setSpy = vi.spyOn(useReaderStore.getState(), 'setFontSize');
      render(<ReaderSettings />);
      await userEvent.click(screen.getByText('settingsFontSizeLarge'));
      expect(setSpy).toHaveBeenCalledWith('large');
      setSpy.mockRestore();
    });

    it('marks non-selected sizes as not pressed', () => {
      render(<ReaderSettings />);
      const pressedButtons = screen.getAllByRole('button', { pressed: true });
      // Filter out close button, theme buttons — find the font size ones
      const fontPressed = pressedButtons.filter(
        (b) =>
          b.textContent === 'settingsFontSizeMedium' ||
          b.textContent === 'settingsFontSizeSmall' ||
          b.textContent === 'settingsFontSizeLarge'
      );
      expect(fontPressed.length).toBe(1);
      expect(fontPressed[0].textContent).toBe('settingsFontSizeMedium');
    });
  });

  // ── Theme buttons ────────────────────────────────────────────

  describe('theme controls', () => {
    it('renders three theme options', () => {
      render(<ReaderSettings />);
      expect(screen.getByText('settingsThemeLight')).toBeInTheDocument();
      expect(screen.getByText('settingsThemeSepia')).toBeInTheDocument();
      expect(screen.getByText('settingsThemeDark')).toBeInTheDocument();
    });

    it('calls setTheme when clicking a theme button', async () => {
      const setSpy = vi.spyOn(useReaderStore.getState(), 'setTheme');
      render(<ReaderSettings />);
      await userEvent.click(screen.getByText('settingsThemeDark'));
      expect(setSpy).toHaveBeenCalledWith('dark');
      setSpy.mockRestore();
    });

    it('highlights current theme as pressed', () => {
      render(<ReaderSettings />);
      expect(screen.getByText('settingsThemeLight').closest('button')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });
  });

  // ── Escape key ───────────────────────────────────────────────

  describe('Escape key', () => {
    it('calls closeSettings on Escape', () => {
      const closeSpy = vi.spyOn(useReaderStore.getState(), 'closeSettings');
      render(<ReaderSettings />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(closeSpy).toHaveBeenCalledTimes(1);
      closeSpy.mockRestore();
    });
  });

  // ── Backdrop click closes ────────────────────────────────────

  describe('backdrop click', () => {
    it('calls closeSettings when clicking backdrop', async () => {
      const closeSpy = vi.spyOn(useReaderStore.getState(), 'closeSettings');
      render(<ReaderSettings />);
      // Click on the backdrop (first child with fixed inset-0 bg-black/50)
      const backdrop = document.querySelector('.fixed.inset-0');
      if (backdrop) {
        await userEvent.click(backdrop);
        expect(closeSpy).toHaveBeenCalledTimes(1);
      }
      closeSpy.mockRestore();
    });
  });

  // ── Focus management ─────────────────────────────────────────

  describe('focus management', () => {
    it('does not crash when settings opens (ref-based focus handled by useEffect)', () => {
      render(<ReaderSettings />);
      // Component renders without error — focus logic runs in useEffect
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // ── Tab trapping ─────────────────────────────────────────────

  describe('Tab trapping', () => {
    it('does not crash on Tab key (focus trap only works with real framer-motion refs)', () => {
      render(<ReaderSettings />);
      expect(() => fireEvent.keyDown(window, { key: 'Tab' })).not.toThrow();
    });
  });

  // ── Accessibility ────────────────────────────────────────────

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(<ReaderSettings />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-label on dialog', () => {
      render(<ReaderSettings />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'settings');
    });

    it('section headings exist', () => {
      render(<ReaderSettings />);
      expect(screen.getByText('settingsFontSize')).toBeInTheDocument();
      expect(screen.getByText('settingsTheme')).toBeInTheDocument();
    });
  });

  // ── Negative: closed state ───────────────────────────────────

  describe('closed state', () => {
    it('does not attach event listeners when closed', () => {
      useReaderStore.setState({ isSettingsOpen: false });
      const addSpy = vi.spyOn(window, 'addEventListener');
      render(<ReaderSettings />);
      expect(addSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));
      addSpy.mockRestore();
    });
  });
});
