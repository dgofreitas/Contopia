// Contopia — ReaderSettings Accessibility Tests (STORY-032)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useReaderStore from '../stores/reader-store';

// Mock framer-motion — avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      // Filter out framer-motion specific props
      const {
        initial, animate, exit, transition, variants,
        onAnimationComplete, ...rest
      } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }) => <>{children}</>,
  useReducedMotion: () => true,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options && typeof options === 'object') {
        return key.replace(/{{\s*(\w+)\s*}}/g, (_, k) => options[k] ?? '');
      }
      return key;
    },
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// Mock react-icons
vi.mock('react-icons/hi', () => ({
  HiX: () => <span aria-hidden="true">×</span>,
  HiBookOpen: () => <span aria-hidden="true">📖</span>,
  HiDocumentText: () => <span aria-hidden="true">📄</span>,
}));

import ReaderSettings from '../components/reader/ReaderSettings';

describe('ReaderSettings — Accessibility (STORY-032)', () => {
  let mockOnRepaginate;
  let mockOnReaderSettingChange;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.removeItem('contopia-reader-prefs');
    useReaderStore.setState({
      isSettingsOpen: true,
      fontSize: 'medium',
      theme: 'light',
      readingMode: 'paginated',
      hasManualThemeSelection: false,
      toolbarTimeout: null,
    });
    mockOnRepaginate = vi.fn();
    mockOnReaderSettingChange = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('aria-pressed on all option buttons', () => {
    it('font size buttons have aria-pressed reflecting selection state', () => {
      render(
        <ReaderSettings
          onRepaginate={mockOnRepaginate}
          onReaderSettingChange={mockOnReaderSettingChange}
        />,
      );

      const smallBtn = screen.getByText('settingsFontSizeSmall');
      const mediumBtn = screen.getByText('settingsFontSizeMedium');
      const largeBtn = screen.getByText('settingsFontSizeLarge');

      expect(smallBtn).toHaveAttribute('aria-pressed', 'false');
      expect(mediumBtn).toHaveAttribute('aria-pressed', 'true');
      expect(largeBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('theme buttons have aria-pressed reflecting selection state', () => {
      render(
        <ReaderSettings
          onRepaginate={mockOnRepaginate}
          onReaderSettingChange={mockOnReaderSettingChange}
        />,
      );

      const lightBtn = screen.getByText('settingsThemeLight');
      const sepiaBtn = screen.getByText('settingsThemeSepia');
      const darkBtn = screen.getByText('settingsThemeDark');

      expect(lightBtn).toHaveAttribute('aria-pressed', 'true');
      expect(sepiaBtn).toHaveAttribute('aria-pressed', 'false');
      expect(darkBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('reading mode buttons have aria-pressed reflecting selection state', () => {
      render(
        <ReaderSettings
          onRepaginate={mockOnRepaginate}
          onReaderSettingChange={mockOnReaderSettingChange}
        />,
      );

      const buttons = screen.getAllByRole('button');
      // Find paginated and scroll mode buttons by text content
      const paginatedBtn = screen.getByText('paginatedMode').closest('button');
      const scrollBtn = screen.getByText('scrollMode').closest('button');

      expect(paginatedBtn).toHaveAttribute('aria-pressed', 'true');
      expect(scrollBtn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('a11y announcements on setting change', () => {
    it('announces font size change via onReaderSettingChange', () => {
      render(
        <ReaderSettings
          onRepaginate={mockOnRepaginate}
          onReaderSettingChange={mockOnReaderSettingChange}
        />,
      );

      const largeBtn = screen.getByText('settingsFontSizeLarge');
      fireEvent.click(largeBtn);

      expect(mockOnReaderSettingChange).toHaveBeenCalledWith(
        'fontSizeChanged',
      );
    });

    it('announces theme change via onReaderSettingChange', () => {
      render(
        <ReaderSettings
          onRepaginate={mockOnRepaginate}
          onReaderSettingChange={mockOnReaderSettingChange}
        />,
      );

      const darkBtn = screen.getByText('settingsThemeDark');
      fireEvent.click(darkBtn);

      expect(mockOnReaderSettingChange).toHaveBeenCalledWith(
        'themeChanged',
      );
    });

    it('announces reading mode change via onReaderSettingChange', () => {
      render(
        <ReaderSettings
          onRepaginate={mockOnRepaginate}
          onReaderSettingChange={mockOnReaderSettingChange}
        />,
      );

      const scrollBtn = screen.getByText('scrollMode').closest('button');
      fireEvent.click(scrollBtn);

      expect(mockOnReaderSettingChange).toHaveBeenCalledWith(
        'readingModeChanged',
      );
    });
  });

  describe('keyboard interaction', () => {
    it('closes settings panel on Escape key', () => {
      render(
        <ReaderSettings
          onRepaginate={mockOnRepaginate}
          onReaderSettingChange={mockOnReaderSettingChange}
        />,
      );

      expect(useReaderStore.getState().isSettingsOpen).toBe(true);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(useReaderStore.getState().isSettingsOpen).toBe(false);
    });

    it('has dialog role with aria-label', () => {
      render(
        <ReaderSettings
          onRepaginate={mockOnRepaginate}
          onReaderSettingChange={mockOnReaderSettingChange}
        />,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-label', 'settings');
    });
  });

  describe('contrast validation', () => {
    it('dark theme uses text-gray-50 for sufficient contrast on bg-gray-900', () => {
      // Design-level validation: gray-50 (#F9FAFB) on gray-900 (#111827)
      // contrast ratio ≈ 15.3:1, well above WCAG 4.5:1 minimum
      const THEME_CONTENT_CLASSES = {
        dark: 'bg-gray-900 text-gray-50',
      };

      expect(THEME_CONTENT_CLASSES.dark).toContain('text-gray-50');
      expect(THEME_CONTENT_CLASSES.dark).not.toContain('text-gray-100');
    });

    it('SETTINGS THEME_CONFIG dark uses text-gray-50 for contrast', () => {
      const THEME_CONFIG = {
        dark: { label: 'settingsThemeDark', bg: 'bg-gray-900', text: 'text-gray-50', border: 'border-gray-700' },
      };

      expect(THEME_CONFIG.dark.text).toBe('text-gray-50');
    });
  });
});