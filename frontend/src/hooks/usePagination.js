import { useCallback, useRef } from 'react';
import useReaderStore from '../stores/reader-store';

/**
 * CSS column-based pagination hook.
 *
 * Uses the browser's native CSS multi-column layout to paginate content.
 * Each column represents one "page" of the reading view.
 *
 * @param {React.RefObject} containerRef - Ref to the paginated content container
 * @returns {{ totalPages, currentPageIndex, nextPage, previousPage, goToPage, setTotalPages, recalculate }}
 */
export default function usePagination(containerRef) {
  const currentPageIndex = useReaderStore((s) => s.currentPageIndex);
  const totalPagesInChapter = useReaderStore((s) => s.totalPagesInChapter);
  const setCurrentPageIndex = useReaderStore((s) => s.setCurrentPageIndex);
  const setTotalPagesInChapter = useReaderStore((s) => s.setTotalPagesInChapter);
  const isPageAnimating = useReaderStore((s) => s.isPageAnimating);
  const setIsPageAnimating = useReaderStore((s) => s.setIsPageAnimating);

  // Track previous total pages for proportional position preservation
  const prevTotalPagesRef = useRef(totalPagesInChapter);

  /**
   * Recalculate total pages based on container dimensions.
   * Measures the scrollWidth of the column-based content vs container width.
   */
  const recalculate = useCallback(() => {
    const container = containerRef?.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const scrollWidth = container.scrollWidth;

    if (containerWidth <= 0) return;

    const totalPages = Math.max(1, Math.round(scrollWidth / containerWidth));
    setTotalPagesInChapter(totalPages);
  }, [containerRef, setTotalPagesInChapter]);

  /**
   * Preserve proportional position after repagination (e.g., font size change).
   * Called by ReaderSettings when font changes.
   */
  const preservePosition = useCallback(
    (oldTotalPages) => {
      if (oldTotalPages <= 0 || totalPagesInChapter <= 0) return;
      if (oldTotalPages === totalPagesInChapter) return;

      const proportionalPage = Math.round(
        (currentPageIndex / oldTotalPages) * totalPagesInChapter,
      );
      const clampedPage = Math.min(proportionalPage, totalPagesInChapter - 1);
      setCurrentPageIndex(Math.max(0, clampedPage));
    },
    [currentPageIndex, totalPagesInChapter, setCurrentPageIndex],
  );

  /**
   * Navigate to the next page.
   * If at the end of the chapter, returns true to signal chapter transition needed.
   */
  const nextPage = useCallback(() => {
    if (isPageAnimating) return false;

    if (currentPageIndex < totalPagesInChapter - 1) {
      setIsPageAnimating(true);
      setCurrentPageIndex(currentPageIndex + 1);
      return false;
    }

    // At the last page of the chapter — signal caller to handle chapter boundary
    return true;
  }, [currentPageIndex, totalPagesInChapter, isPageAnimating, setCurrentPageIndex, setIsPageAnimating]);

  /**
   * Navigate to the previous page.
   * If at the start of the chapter, returns true to signal previous chapter needed.
   */
  const previousPage = useCallback(() => {
    if (isPageAnimating) return false;

    if (currentPageIndex > 0) {
      setIsPageAnimating(true);
      setCurrentPageIndex(currentPageIndex - 1);
      return false;
    }

    // At the first page — signal caller to handle chapter boundary
    return true;
  }, [currentPageIndex, isPageAnimating, setCurrentPageIndex, setIsPageAnimating]);

  /** Go to a specific page index */
  const goToPage = useCallback(
    (pageIndex) => {
      const clamped = Math.max(0, Math.min(pageIndex, totalPagesInChapter - 1));
      setIsPageAnimating(true);
      setCurrentPageIndex(clamped);
    },
    [totalPagesInChapter, setCurrentPageIndex, setIsPageAnimating],
  );

  /** Set total pages externally (e.g., after container measurement) */
  const setTotalPages = useCallback(
    (total) => {
      prevTotalPagesRef.current = totalPagesInChapter;
      setTotalPagesInChapter(total);
    },
    [totalPagesInChapter, setTotalPagesInChapter],
  );

  return {
    totalPages: totalPagesInChapter,
    currentPageIndex,
    nextPage,
    previousPage,
    goToPage,
    setTotalPages,
    recalculate,
    preservePosition,
    isPageAnimating,
    setIsPageAnimating,
  };
}