// Contopia — Reader Store Persistence Tests (STORY-032)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useReaderStore from '../stores/reader-store';

describe('reader-store — persistence (STORY-032)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store to initial defaults (clears persisted state too)
    useReaderStore.setState({
      currentChapterIndex: 0,
      isChapterDrawerOpen: false,
      isFullscreen: false,
      isToolbarVisible: false,
      toolbarTimeout: null,
      isSettingsOpen: false,
      fontSize: 'medium',
      theme: 'light',
      hasManualThemeSelection: false,
      localProgress: null,
      syncStatus: 'idle',
      currentPageIndex: 0,
      totalPagesInChapter: 1,
      totalPagesInBook: 0,
      isPageAnimating: false,
      currentPageOffsetInBook: 0,
      readingMode: 'paginated',
      scrollPosition: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up localStorage after each test
    localStorage.removeItem('contopia-reader-prefs');
  });

  describe('persist middleware', () => {
    it('persists fontSize, theme, readingMode, and hasManualThemeSelection to localStorage', () => {
      useReaderStore.getState().setFontSize('large');
      useReaderStore.getState().setTheme('dark');
      useReaderStore.getState().setReadingMode('scroll');

      // Zustand persist writes to localStorage synchronously via createJSONStorage
      const stored = localStorage.getItem('contopia-reader-prefs');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored);
      expect(parsed.state.fontSize).toBe('large');
      expect(parsed.state.theme).toBe('dark');
      expect(parsed.state.readingMode).toBe('scroll');
      expect(parsed.state.hasManualThemeSelection).toBe(true);
    });

    it('does not persist non-preference state (e.g., isFullscreen)', () => {
      useReaderStore.getState().enterFullscreen();

      const stored = localStorage.getItem('contopia-reader-prefs');
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.isFullscreen).toBeUndefined();
        expect(parsed.state.toolbarTimeout).toBeUndefined();
      }
    });

    it('uses the key "contopia-reader-prefs" in localStorage', () => {
      useReaderStore.getState().setFontSize('small');

      const stored = localStorage.getItem('contopia-reader-prefs');
      expect(stored).not.toBeNull();
    });

    it('hasManualThemeSelection is persisted when setTheme is called', () => {
      useReaderStore.getState().setTheme('sepia');

      expect(useReaderStore.getState().hasManualThemeSelection).toBe(true);

      const stored = localStorage.getItem('contopia-reader-prefs');
      const parsed = JSON.parse(stored);
      expect(parsed.state.hasManualThemeSelection).toBe(true);
    });

    it('setHasManualThemeSelection directly sets the flag', () => {
      useReaderStore.getState().setHasManualThemeSelection(true);
      expect(useReaderStore.getState().hasManualThemeSelection).toBe(true);

      useReaderStore.getState().setHasManualThemeSelection(false);
      expect(useReaderStore.getState().hasManualThemeSelection).toBe(false);
    });

    it('partialize only includes persisted keys', () => {
      useReaderStore.getState().setFontSize('large');
      useReaderStore.getState().setTheme('dark');
      useReaderStore.getState().setReadingMode('scroll');

      const stored = localStorage.getItem('contopia-reader-prefs');
      const parsed = JSON.parse(stored);
      const stateKeys = Object.keys(parsed.state);

      // Only the 4 persisted keys should be stored
      expect(stateKeys).toEqual(
        expect.arrayContaining(['fontSize', 'theme', 'readingMode', 'hasManualThemeSelection']),
      );
      // Non-persisted keys should not be stored
      expect(stateKeys).not.toContain('isFullscreen');
      expect(stateKeys).not.toContain('toolbarTimeout');
      expect(stateKeys).not.toContain('currentPageIndex');
    });

    it('store persists data correctly across state changes', () => {
      useReaderStore.getState().setFontSize('small');
      useReaderStore.getState().setTheme('sepia');
      useReaderStore.getState().setReadingMode('scroll');

      const stored = localStorage.getItem('contopia-reader-prefs');
      const parsed = JSON.parse(stored);
      expect(parsed.state.fontSize).toBe('small');
      expect(parsed.state.theme).toBe('sepia');
      expect(parsed.state.readingMode).toBe('scroll');
    });
  });

  describe('setTheme marks hasManualThemeSelection', () => {
    it('setTheme sets hasManualThemeSelection to true', () => {
      expect(useReaderStore.getState().hasManualThemeSelection).toBe(false);
      useReaderStore.getState().setTheme('dark');
      expect(useReaderStore.getState().hasManualThemeSelection).toBe(true);
    });

    it('subsequent setTheme calls keep hasManualThemeSelection true', () => {
      useReaderStore.getState().setTheme('sepia');
      expect(useReaderStore.getState().hasManualThemeSelection).toBe(true);
      useReaderStore.getState().setTheme('light');
      expect(useReaderStore.getState().hasManualThemeSelection).toBe(true);
    });
  });

  describe('setFontSize persistence', () => {
    it('persists fontSize changes to localStorage', () => {
      useReaderStore.getState().setFontSize('large');
      const stored = localStorage.getItem('contopia-reader-prefs');
      const parsed = JSON.parse(stored);
      expect(parsed.state.fontSize).toBe('large');
    });

    it('reads persisted fontSize correctly', () => {
      useReaderStore.getState().setFontSize('small');
      expect(useReaderStore.getState().fontSize).toBe('small');
    });
  });

  describe('setReadingMode persistence', () => {
    it('persists readingMode changes to localStorage', () => {
      useReaderStore.getState().setReadingMode('scroll');
      const stored = localStorage.getItem('contopia-reader-prefs');
      const parsed = JSON.parse(stored);
      expect(parsed.state.readingMode).toBe('scroll');
    });
  });
});