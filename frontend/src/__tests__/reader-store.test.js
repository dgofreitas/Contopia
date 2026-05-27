// Contopia — Reader Store Tests (STORY-034)
import { describe, it, expect, beforeEach } from 'vitest';
import useReaderStore from '../stores/reader-store';

describe('reader-store', () => {
  beforeEach(() => {
    useReaderStore.setState({
      currentChapterIndex: 0,
      isChapterDrawerOpen: false,
    });
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
});