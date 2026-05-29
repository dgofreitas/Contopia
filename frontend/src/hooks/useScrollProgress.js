import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useScrollProgress — tracks scroll progress and visible chapter in scroll mode.
 *
 * @param {Object} params
 * @param {React.RefObject} params.scrollContainerRef - Ref to the scrollable container
 * @param {Array} params._chapters - Array of chapter objects (unused but kept for API consistency)
 * @param {Function} params.onChapterVisible - Callback(index) when a new chapter becomes visible
 * @param {Function} params.onProgressUpdate - Callback({ scrollProgress, scrollOffset }) on scroll
 * @returns {{ currentVisibleChapter: number, scrollProgress: number }}
 */
export function useScrollProgress({ scrollContainerRef, chapters: _chapters, onChapterVisible, onProgressUpdate }) {
  const [currentVisibleChapter, setCurrentVisibleChapter] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const observerRef = useRef(null);
  const debounceRef = useRef(null);
  const chapterElementsRef = useRef(new Map());

  // IntersectionObserver for chapter visibility
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const chapterIndex = chapterElementsRef.current.get(entry.target);
            if (chapterIndex != null && chapterIndex !== currentVisibleChapter) {
              setCurrentVisibleChapter(chapterIndex);
              if (onChapterVisible) onChapterVisible(chapterIndex);
            }
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '0px 0px -50% 0px',
        threshold: 0.1,
      },
    );

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [scrollContainerRef, onChapterVisible, currentVisibleChapter]);

  // Observe new chapter elements
  const observeChapter = useCallback((element, index) => {
    if (!element || !observerRef.current) return;
    chapterElementsRef.current.set(element, index);
    observerRef.current.observe(element);

    return () => {
      chapterElementsRef.current.delete(element);
      observerRef.current.unobserve(element);
    };
  }, []);

  // Scroll handler (debounced)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const maxScroll = scrollHeight - clientHeight;
        const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
        const clamped = Math.min(100, Math.max(0, progress));

        setScrollProgress(clamped);
        if (onProgressUpdate) onProgressUpdate({ scrollProgress: clamped, scrollOffset: scrollTop });
      }, 500);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scrollContainerRef, onProgressUpdate]);

  return { currentVisibleChapter, scrollProgress, observeChapter };
}