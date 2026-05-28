// Contopia — Reader Store Tests (STORY-034, STORY-029)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useReaderStore from '../stores/reader-store';

describe('reader-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useReaderStore.setState({
      currentChapterIndex: 0,
      isChapterDrawerOpen: false,
      isFullscreen: false,
      isToolbarVisible: false,
      toolbarTimeout: null,
      isSettingsOpen: false,
      fontSize: 'medium',
      theme: 'light',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('has currentChapterIndex default of 0', () => {
      expect(useReaderStore.getState().currentChapterIndex).toBe(0);
    });

    it('has isChapterDrawerOpen default of false', () => {
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
    });
  });

  describe('setCurrentChapterIndex', () => {
    it('sets currentChapterIndex to a new value', () => {
      useReaderStore.getState().setCurrentChapterIndex(3);
      expect(useReaderStore.getState().currentChapterIndex).toBe(3);
    });

    it('sets currentChapterIndex to 0', () => {
      useReaderStore.getState().setCurrentChapterIndex(5);
      useReaderStore.getState().setCurrentChapterIndex(0);
      expect(useReaderStore.getState().currentChapterIndex).toBe(0);
    });

    it('does not affect isChapterDrawerOpen', () => {
      useReaderStore.getState().openChapterDrawer();
      useReaderStore.getState().setCurrentChapterIndex(2);
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(true);
    });

    it('updates currentChapterIndex multiple times', () => {
      useReaderStore.getState().setCurrentChapterIndex(1);
      expect(useReaderStore.getState().currentChapterIndex).toBe(1);
      useReaderStore.getState().setCurrentChapterIndex(5);
      expect(useReaderStore.getState().currentChapterIndex).toBe(5);
    });
  });

  describe('openChapterDrawer', () => {
    it('sets isChapterDrawerOpen to true', () => {
      useReaderStore.getState().openChapterDrawer();
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(true);
    });

    it('stays true when called multiple times', () => {
      useReaderStore.getState().openChapterDrawer();
      useReaderStore.getState().openChapterDrawer();
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(true);
    });

    it('does not affect currentChapterIndex', () => {
      useReaderStore.getState().setCurrentChapterIndex(4);
      useReaderStore.getState().openChapterDrawer();
      expect(useReaderStore.getState().currentChapterIndex).toBe(4);
    });
  });

  describe('closeChapterDrawer', () => {
    it('sets isChapterDrawerOpen to false', () => {
      useReaderStore.getState().openChapterDrawer();
      useReaderStore.getState().closeChapterDrawer();
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
    });

    it('stays false when called on already closed drawer', () => {
      useReaderStore.getState().closeChapterDrawer();
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
    });

    it('does not affect currentChapterIndex', () => {
      useReaderStore.getState().setCurrentChapterIndex(7);
      useReaderStore.getState().openChapterDrawer();
      useReaderStore.getState().closeChapterDrawer();
      expect(useReaderStore.getState().currentChapterIndex).toBe(7);
    });
  });

  describe('toggleChapterDrawer', () => {
    it('toggles from closed to open', () => {
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
      useReaderStore.getState().toggleChapterDrawer();
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(true);
    });

    it('toggles from open to closed', () => {
      useReaderStore.getState().openChapterDrawer();
      useReaderStore.getState().toggleChapterDrawer();
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
    });

    it('round-trips: closed → open → closed', () => {
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
      useReaderStore.getState().toggleChapterDrawer();
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(true);
      useReaderStore.getState().toggleChapterDrawer();
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
    });

    it('does not affect currentChapterIndex', () => {
      useReaderStore.getState().setCurrentChapterIndex(2);
      useReaderStore.getState().toggleChapterDrawer();
      expect(useReaderStore.getState().currentChapterIndex).toBe(2);
    });
  });

  // ── STORY-029: Fullscreen state ──────────────────────────────

  describe('initial state (STORY-029 additions)', () => {
    it('has isFullscreen default of false', () => {
      expect(useReaderStore.getState().isFullscreen).toBe(false);
    });

    it('has isToolbarVisible default of false', () => {
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
    });

    it('has toolbarTimeout default of null', () => {
      expect(useReaderStore.getState().toolbarTimeout).toBeNull();
    });

    it('has isSettingsOpen default of false', () => {
      expect(useReaderStore.getState().isSettingsOpen).toBe(false);
    });

    it('has fontSize default of medium', () => {
      expect(useReaderStore.getState().fontSize).toBe('medium');
    });

    it('has theme default of light', () => {
      expect(useReaderStore.getState().theme).toBe('light');
    });
  });

  describe('enterFullscreen', () => {
    it('sets isFullscreen to true', () => {
      useReaderStore.getState().enterFullscreen();
      expect(useReaderStore.getState().isFullscreen).toBe(true);
    });

    it('does not affect toolbar or settings state', () => {
      useReaderStore.getState().enterFullscreen();
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
      expect(useReaderStore.getState().isSettingsOpen).toBe(false);
    });
  });

  describe('exitFullscreen', () => {
    it('sets isFullscreen to false and resets toolbar/settings', () => {
      useReaderStore.getState().enterFullscreen();
      useReaderStore.getState().showToolbar();
      useReaderStore.getState().openSettings();
      useReaderStore.getState().exitFullscreen();

      expect(useReaderStore.getState().isFullscreen).toBe(false);
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
      expect(useReaderStore.getState().isSettingsOpen).toBe(false);
      expect(useReaderStore.getState().toolbarTimeout).toBeNull();
    });

    it('clears timeout if one is active', () => {
      useReaderStore.getState().enterFullscreen();
      useReaderStore.getState().showToolbar();
      useReaderStore.getState().exitFullscreen();
      // Verify timeout was cleared — no pending timer should fire
      vi.advanceTimersByTime(5000);
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
    });

    it('is idempotent when already exited', () => {
      useReaderStore.getState().exitFullscreen();
      expect(useReaderStore.getState().isFullscreen).toBe(false);
    });
  });

  describe('showToolbar', () => {
    it('sets isToolbarVisible to true', () => {
      useReaderStore.getState().showToolbar();
      expect(useReaderStore.getState().isToolbarVisible).toBe(true);
    });

    it('auto-hides toolbar after 2 seconds', () => {
      useReaderStore.getState().showToolbar();
      expect(useReaderStore.getState().isToolbarVisible).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
      expect(useReaderStore.getState().toolbarTimeout).toBeNull();
    });

    it('resets existing timeout when called again', () => {
      useReaderStore.getState().showToolbar();
      vi.advanceTimersByTime(1000);
      useReaderStore.getState().showToolbar();
      vi.advanceTimersByTime(1000);
      // Should still be visible — second call reset the 2s timer
      expect(useReaderStore.getState().isToolbarVisible).toBe(true);
      vi.advanceTimersByTime(1000);
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
    });
  });

  describe('hideToolbar', () => {
    it('sets isToolbarVisible to false', () => {
      useReaderStore.getState().showToolbar();
      useReaderStore.getState().hideToolbar();
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
    });

    it('clears toolbarTimeout', () => {
      useReaderStore.getState().showToolbar();
      useReaderStore.getState().hideToolbar();
      expect(useReaderStore.getState().toolbarTimeout).toBeNull();
    });

    it('does not affect other state', () => {
      useReaderStore.getState().enterFullscreen();
      useReaderStore.getState().showToolbar();
      useReaderStore.getState().hideToolbar();
      expect(useReaderStore.getState().isFullscreen).toBe(true);
      expect(useReaderStore.getState().isSettingsOpen).toBe(false);
    });
  });

  describe('toggleToolbar', () => {
    it('toggles from hidden to visible and starts auto-hide', () => {
      useReaderStore.getState().toggleToolbar();
      expect(useReaderStore.getState().isToolbarVisible).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
    });

    it('toggles from visible to hidden and clears timeout', () => {
      useReaderStore.getState().showToolbar();
      useReaderStore.getState().toggleToolbar();
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
      expect(useReaderStore.getState().toolbarTimeout).toBeNull();
    });

    it('round-trips: hidden → visible → hidden', () => {
      useReaderStore.getState().toggleToolbar();
      expect(useReaderStore.getState().isToolbarVisible).toBe(true);
      useReaderStore.getState().toggleToolbar();
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
    });
  });

  describe('openSettings / closeSettings', () => {
    it('openSettings hides toolbar and opens settings', () => {
      useReaderStore.getState().showToolbar();
      useReaderStore.getState().openSettings();

      expect(useReaderStore.getState().isSettingsOpen).toBe(true);
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
      expect(useReaderStore.getState().toolbarTimeout).toBeNull();
    });

    it('closeSettings closes settings panel', () => {
      useReaderStore.getState().openSettings();
      useReaderStore.getState().closeSettings();
      expect(useReaderStore.getState().isSettingsOpen).toBe(false);
    });

    it('openSettings clears toolbar auto-hide timer', () => {
      useReaderStore.getState().showToolbar();
      useReaderStore.getState().openSettings();
      vi.advanceTimersByTime(2000);
      // Toolbar should stay hidden; settings stays open
      expect(useReaderStore.getState().isSettingsOpen).toBe(true);
      expect(useReaderStore.getState().isToolbarVisible).toBe(false);
    });
  });

  describe('setFontSize', () => {
    it('sets fontSize to a valid value', () => {
      useReaderStore.getState().setFontSize('large');
      expect(useReaderStore.getState().fontSize).toBe('large');
    });

    it('sets fontSize to small', () => {
      useReaderStore.getState().setFontSize('small');
      expect(useReaderStore.getState().fontSize).toBe('small');
    });

    it('sets fontSize back to medium', () => {
      useReaderStore.getState().setFontSize('large');
      useReaderStore.getState().setFontSize('medium');
      expect(useReaderStore.getState().fontSize).toBe('medium');
    });

    it('accepts any string value', () => {
      useReaderStore.getState().setFontSize('xlarge');
      expect(useReaderStore.getState().fontSize).toBe('xlarge');
    });

    it('does not affect other state', () => {
      useReaderStore.getState().enterFullscreen();
      useReaderStore.getState().setFontSize('small');
      expect(useReaderStore.getState().isFullscreen).toBe(true);
      expect(useReaderStore.getState().theme).toBe('light');
    });
  });

  describe('setTheme', () => {
    it('sets theme to sepia', () => {
      useReaderStore.getState().setTheme('sepia');
      expect(useReaderStore.getState().theme).toBe('sepia');
    });

    it('sets theme to dark', () => {
      useReaderStore.getState().setTheme('dark');
      expect(useReaderStore.getState().theme).toBe('dark');
    });

    it('sets theme back to light', () => {
      useReaderStore.getState().setTheme('dark');
      useReaderStore.getState().setTheme('light');
      expect(useReaderStore.getState().theme).toBe('light');
    });

    it('accepts any string value', () => {
      useReaderStore.getState().setTheme('midnight');
      expect(useReaderStore.getState().theme).toBe('midnight');
    });

    it('does not affect other state', () => {
      useReaderStore.getState().setFontSize('large');
      useReaderStore.getState().setTheme('sepia');
      expect(useReaderStore.getState().fontSize).toBe('large');
    });
  });
});