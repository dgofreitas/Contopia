// Contopia — usePagination Hook Tests (STORY-030)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePagination from '../hooks/usePagination';
import useReaderStore from '../stores/reader-store';

function createMockContainer(clientWidth = 800, scrollWidth = 2400) {
  return {
    current: {
      clientWidth,
      scrollWidth,
    },
  };
}

describe('usePagination', () => {
  beforeEach(() => {
    useReaderStore.setState({
      currentPageIndex: 0,
      totalPagesInChapter: 1,
      totalPagesInBook: 0,
      isPageAnimating: false,
      currentPageOffsetInBook: 0,
    });
  });

  // ── Initial state ─────────────────────────────────────────────

  describe('initial state', () => {
    it('returns default values when container ref is empty', () => {
      const { result } = renderHook(() => usePagination({ current: null }));
      expect(result.current.currentPageIndex).toBe(0);
      expect(result.current.totalPages).toBe(1);
    });

    it('returns store values', () => {
      useReaderStore.setState({ currentPageIndex: 3, totalPagesInChapter: 10 });
      const { result } = renderHook(() => usePagination({ current: null }));
      expect(result.current.currentPageIndex).toBe(3);
      expect(result.current.totalPages).toBe(10);
    });
  });

  // ── nextPage ──────────────────────────────────────────────────

  describe('nextPage', () => {
    it('increments currentPageIndex when not at chapter end', () => {
      useReaderStore.setState({ currentPageIndex: 0, totalPagesInChapter: 5, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      let atEnd;
      act(() => { atEnd = result.current.nextPage(); });

      expect(result.current.currentPageIndex).toBe(1);
      expect(atEnd).toBe(false);
    });

    it('sets isPageAnimating to true when navigating', () => {
      useReaderStore.setState({ currentPageIndex: 0, totalPagesInChapter: 5, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.nextPage(); });

      expect(useReaderStore.getState().isPageAnimating).toBe(true);
    });

    it('returns true when at the last page of the chapter', () => {
      useReaderStore.setState({ currentPageIndex: 4, totalPagesInChapter: 5, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      let atEnd;
      act(() => { atEnd = result.current.nextPage(); });

      expect(atEnd).toBe(true);
      expect(result.current.currentPageIndex).toBe(4); // unchanged
    });

    it('returns false when isPageAnimating is true', () => {
      useReaderStore.setState({ currentPageIndex: 0, totalPagesInChapter: 5, isPageAnimating: true });
      const { result } = renderHook(() => usePagination({ current: null }));

      let atEnd;
      act(() => { atEnd = result.current.nextPage(); });

      expect(atEnd).toBe(false);
      expect(result.current.currentPageIndex).toBe(0); // unchanged
    });

    it('navigates from first page to last page across multiples', () => {
      useReaderStore.setState({ currentPageIndex: 0, totalPagesInChapter: 3, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.nextPage(); });
      expect(result.current.currentPageIndex).toBe(1);
      // Reset animation flag so next navigation works
      act(() => { useReaderStore.setState({ isPageAnimating: false }); });

      act(() => { result.current.nextPage(); });
      expect(result.current.currentPageIndex).toBe(2);
      act(() => { useReaderStore.setState({ isPageAnimating: false }); });

      let atEnd;
      act(() => { atEnd = result.current.nextPage(); });
      expect(atEnd).toBe(true); // now at chapter end
    });
  });

  // ── previousPage ──────────────────────────────────────────────

  describe('previousPage', () => {
    it('decrements currentPageIndex when not at chapter start', () => {
      useReaderStore.setState({ currentPageIndex: 3, totalPagesInChapter: 5, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      let atStart;
      act(() => { atStart = result.current.previousPage(); });

      expect(result.current.currentPageIndex).toBe(2);
      expect(atStart).toBe(false);
    });

    it('returns true when at the first page of the chapter', () => {
      useReaderStore.setState({ currentPageIndex: 0, totalPagesInChapter: 5, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      let atStart;
      act(() => { atStart = result.current.previousPage(); });

      expect(atStart).toBe(true);
      expect(result.current.currentPageIndex).toBe(0); // unchanged
    });

    it('returns false when isPageAnimating is true', () => {
      useReaderStore.setState({ currentPageIndex: 3, totalPagesInChapter: 5, isPageAnimating: true });
      const { result } = renderHook(() => usePagination({ current: null }));

      let atStart;
      act(() => { atStart = result.current.previousPage(); });

      expect(atStart).toBe(false);
      expect(result.current.currentPageIndex).toBe(3); // unchanged
    });

    it('navigates back across multiple pages', () => {
      useReaderStore.setState({ currentPageIndex: 3, totalPagesInChapter: 5, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.previousPage(); });
      expect(result.current.currentPageIndex).toBe(2);
      act(() => { useReaderStore.setState({ isPageAnimating: false }); });

      act(() => { result.current.previousPage(); });
      expect(result.current.currentPageIndex).toBe(1);
    });
  });

  // ── goToPage ──────────────────────────────────────────────────

  describe('goToPage', () => {
    it('navigates to a specific page', () => {
      useReaderStore.setState({ currentPageIndex: 0, totalPagesInChapter: 10, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.goToPage(5); });

      expect(result.current.currentPageIndex).toBe(5);
    });

    it('clamps to 0 when negative', () => {
      useReaderStore.setState({ currentPageIndex: 3, totalPagesInChapter: 10, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.goToPage(-5); });

      expect(result.current.currentPageIndex).toBe(0);
    });

    it('clamps to last page when exceeding total', () => {
      useReaderStore.setState({ currentPageIndex: 0, totalPagesInChapter: 10, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.goToPage(100); });

      expect(result.current.currentPageIndex).toBe(9); // totalPagesInChapter - 1
    });

    it('sets isPageAnimating to true', () => {
      useReaderStore.setState({ currentPageIndex: 0, totalPagesInChapter: 10, isPageAnimating: false });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.goToPage(3); });

      expect(useReaderStore.getState().isPageAnimating).toBe(true);
    });
  });

  // ── setTotalPages ─────────────────────────────────────────────

  describe('setTotalPages', () => {
    it('sets totalPagesInChapter to a new value', () => {
      useReaderStore.setState({ totalPagesInChapter: 5 });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.setTotalPages(12); });

      expect(useReaderStore.getState().totalPagesInChapter).toBe(12);
      expect(result.current.totalPages).toBe(12);
    });
  });

  // ── recalculate ───────────────────────────────────────────────

  describe('recalculate', () => {
    it('calculates total pages from container dimensions', () => {
      const containerRef = createMockContainer(800, 3200);
      useReaderStore.setState({ totalPagesInChapter: 1 });
      const { result } = renderHook(() => usePagination(containerRef));

      act(() => { result.current.recalculate(); });

      expect(useReaderStore.getState().totalPagesInChapter).toBe(4);
    });

    it('uses Math.round for fractional pages', () => {
      const containerRef = createMockContainer(800, 2000);
      useReaderStore.setState({ totalPagesInChapter: 1 });
      const { result } = renderHook(() => usePagination(containerRef));

      act(() => { result.current.recalculate(); });

      // Math.round(2000/800) = Math.round(2.5) = 3
      expect(useReaderStore.getState().totalPagesInChapter).toBe(3);
    });

    it('returns at least 1 page', () => {
      const containerRef = createMockContainer(800, 100);
      useReaderStore.setState({ totalPagesInChapter: 1 });
      const { result } = renderHook(() => usePagination(containerRef));

      act(() => { result.current.recalculate(); });

      // Math.max(1, Math.round(100/800)) = 1
      expect(useReaderStore.getState().totalPagesInChapter).toBe(1);
    });

    it('does nothing when container is null', () => {
      const containerRef = { current: null };
      useReaderStore.setState({ totalPagesInChapter: 5 });
      const { result } = renderHook(() => usePagination(containerRef));

      act(() => { result.current.recalculate(); });

      expect(useReaderStore.getState().totalPagesInChapter).toBe(5);
    });

    it('does nothing when containerWidth is 0', () => {
      const containerRef = createMockContainer(0, 2400);
      useReaderStore.setState({ totalPagesInChapter: 3 });
      const { result } = renderHook(() => usePagination(containerRef));

      act(() => { result.current.recalculate(); });

      expect(useReaderStore.getState().totalPagesInChapter).toBe(3);
    });
  });

  // ── preservePosition ──────────────────────────────────────────

  describe('preservePosition', () => {
    it('preserves proportional position when page count changes', () => {
      // Was on page 5 of 10 total → now have 20 total → should go to page 10
      useReaderStore.setState({ currentPageIndex: 5, totalPagesInChapter: 20 });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.preservePosition(10); });

      // Math.round(5/10 * 20) = 10
      expect(result.current.currentPageIndex).toBe(10);
    });

    it('clamps to last page when proportion exceeds new total', () => {
      useReaderStore.setState({ currentPageIndex: 9, totalPagesInChapter: 3 });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.preservePosition(10); });

      // Math.round(9/10 * 3) = Math.round(2.7) = 3, but clamped to 2 (3-1)
      expect(result.current.currentPageIndex).toBe(2);
    });

    it('does nothing when oldTotalPages is 0', () => {
      useReaderStore.setState({ currentPageIndex: 5, totalPagesInChapter: 20 });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.preservePosition(0); });

      expect(result.current.currentPageIndex).toBe(5);
    });

    it('does nothing when oldTotalPages equals current total', () => {
      useReaderStore.setState({ currentPageIndex: 3, totalPagesInChapter: 10 });
      const { result } = renderHook(() => usePagination({ current: null }));

      act(() => { result.current.preservePosition(10); });

      expect(result.current.currentPageIndex).toBe(3);
    });
  });

  // ── isPageAnimating / setIsPageAnimating ──────────────────────

  describe('animation state accessors', () => {
    it('returns isPageAnimating from store', () => {
      useReaderStore.setState({ isPageAnimating: true });
      const { result } = renderHook(() => usePagination({ current: null }));
      expect(result.current.isPageAnimating).toBe(true);
    });

    it('setIsPageAnimating updates the store', () => {
      const { result } = renderHook(() => usePagination({ current: null }));
      act(() => { result.current.setIsPageAnimating(true); });
      expect(useReaderStore.getState().isPageAnimating).toBe(true);
    });
  });
});
