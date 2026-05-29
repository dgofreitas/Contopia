import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from 'flowbite-react';
import { HiBookOpen, HiViewList, HiArrowsExpand } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import useReaderStore from '../../stores/reader-store';
import useChaptersQuery from '../../hooks/useChaptersQuery';
import useBookEditQuery from '../../hooks/useBookEditQuery';
import useReadingProgressQuery from '../../hooks/useReadingProgressQuery';
import useProgressSync from '../../hooks/useProgressSync';
import useFullscreen from '../../hooks/useFullscreen';
import ChapterDrawer from '../../components/reader/ChapterDrawer';
import NextChapterButton from '../../components/reader/NextChapterButton';
import ReaderToolbar from '../../components/reader/ReaderToolbar';
import ReaderProgressBar from '../../components/reader/ReaderProgressBar';
import ReaderTapZones from '../../components/reader/ReaderTapZones';
import ReaderSettings from '../../components/reader/ReaderSettings';
import PageTurnAnimation from '../../components/reader/PageTurnAnimation';
import ChapterTransitionCard from '../../components/reader/ChapterTransitionCard';
import ScrollChapterMarker from '../../components/reader/ScrollChapterMarker';
import A11yAnnouncer from '../../components/common/A11yAnnouncer';
import { sanitizeRichContent } from '../../lib/sanitize';
import { useScrollProgress } from '../../hooks/useScrollProgress';

const THEME_CONTENT_CLASSES = {
  light: 'bg-white text-gray-900',
  sepia: 'bg-amber-50 text-amber-900',
  dark: 'bg-gray-900 text-gray-100',
};

const FONT_SIZE_CLASSES = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

const THEME_PROSE_CLASSES = {
  light: 'prose-headings:text-gray-800 prose-p:text-gray-700',
  sepia: 'prose-headings:text-amber-800 prose-p:text-amber-800',
  dark: 'prose-headings:text-gray-100 prose-p:text-gray-200',
};

export default function ReaderPage() {
  const { t } = useTranslation('reader');
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();

  // Store state
  const currentChapterIndex = useReaderStore((s) => s.currentChapterIndex);
  const setCurrentChapterIndex = useReaderStore((s) => s.setCurrentChapterIndex);
  const toggleChapterDrawer = useReaderStore((s) => s.toggleChapterDrawer);
  const storeIsFullscreen = useReaderStore((s) => s.isFullscreen);
  const storeEnterFullscreen = useReaderStore((s) => s.enterFullscreen);
  const storeExitFullscreen = useReaderStore((s) => s.exitFullscreen);
  const showToolbar = useReaderStore((s) => s.showToolbar);
  const openSettings = useReaderStore((s) => s.openSettings);
  const fontSize = useReaderStore((s) => s.fontSize);
  const theme = useReaderStore((s) => s.theme);
  const currentPageIndex = useReaderStore((s) => s.currentPageIndex);
  const totalPagesInChapter = useReaderStore((s) => s.totalPagesInChapter);
  const setTotalPagesInChapter = useReaderStore((s) => s.setTotalPagesInChapter);
  const setCurrentPageIndex = useReaderStore((s) => s.setCurrentPageIndex);
  const isPageAnimating = useReaderStore((s) => s.isPageAnimating);
  const setIsPageAnimating = useReaderStore((s) => s.setIsPageAnimating);
  const setTotalPagesInBook = useReaderStore((s) => s.setTotalPagesInBook);
  const setCurrentPageOffsetInBook = useReaderStore((s) => s.setCurrentPageOffsetInBook);
  const nextPage = useReaderStore((s) => s.nextPage);
  const previousPage = useReaderStore((s) => s.previousPage);
  const readingMode = useReaderStore((s) => s.readingMode);
  const setScrollPosition = useReaderStore((s) => s.setScrollPosition);

  // Data hooks
  const { data: chapters = [], isLoading: chaptersLoading } = useChaptersQuery(bookId);
  const { data: book } = useBookEditQuery(bookId);
  const { data: progress } = useReadingProgressQuery(bookId);
  const { saveProgress, localProgress: syncedProgress } = useProgressSync(bookId);

  // Local state
  const [announcement, setAnnouncement] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [pageDirection, setPageDirection] = useState(1); // 1 = forward, -1 = backward
  const [showChapterTransition, setShowChapterTransition] = useState(false);
  const [chapterTransitionTitle, setChapterTransitionTitle] = useState('');

  // Scroll mode state
  const [scrollFinished, setScrollFinished] = useState(false);
  const scrollContainerRef = useRef(null);
  const [currentVisibleChapter, setCurrentVisibleChapter] = useState(0);
  const [scrollProgressValue, setScrollProgressValue] = useState(0);

  // Refs
  const contentContainerRef = useRef(null);
  const contentInnerRef = useRef(null);
  const prevChapterIndexRef = useRef(currentChapterIndex);

  // Scroll progress hook (always called, conditionally used)
  const handleChapterVisible = useCallback((idx) => {
    setCurrentVisibleChapter(idx);
    setAnnouncement(t('chapterVisible', { title: chapters[idx]?.title || '' }));
  }, [chapters, t]);

  const handleProgressUpdate = useCallback(({ scrollProgress, scrollOffset }) => {
    setScrollProgressValue(scrollProgress);
    setScrollPosition(scrollOffset);
  }, [setScrollPosition]);

  const { observeChapter } = useScrollProgress({
    scrollContainerRef,
    chapters,
    onChapterVisible: handleChapterVisible,
    onProgressUpdate: handleProgressUpdate,
  });

  // Sentinel observer for "The End" detection
  const scrollEndSentinelRef = useRef(null);

  useEffect(() => {
    if (readingMode !== 'scroll' || !scrollEndSentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !scrollFinished) {
          setScrollFinished(true);
          setAnnouncement(t('endScrollMessage'));
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(scrollEndSentinelRef.current);
    return () => observer.disconnect();
  }, [readingMode, scrollFinished, t]);

  // Position preservation on mode switch
  const prevReadingModeRef = useRef(readingMode);

  useEffect(() => {
    // Skip on initial mount
    if (prevReadingModeRef.current === readingMode) return;

    // Paginated → Scroll: scroll to approximate position
    if (prevReadingModeRef.current === 'paginated' && readingMode === 'scroll') {
      // Delay to allow DOM rendering of scroll container
      const timer = setTimeout(() => {
        if (scrollContainerRef.current && chapters.length > 0) {
          const scrollOffset = (currentChapterIndex / chapters.length) * scrollContainerRef.current.scrollHeight;
          scrollContainerRef.current.scrollTo({ top: scrollOffset, behavior: 'instant' });
        }
      }, 100);
      prevReadingModeRef.current = readingMode;
      return () => clearTimeout(timer);
    }

    // Scroll → Paginated: use visible chapter from IntersectionObserver
    if (prevReadingModeRef.current === 'scroll' && readingMode === 'paginated') {
      setCurrentChapterIndex(currentVisibleChapter);
      setAnnouncement(t('navigatedToChapter', { chapterTitle: chapters[currentVisibleChapter]?.title || '' }));
    }

    prevReadingModeRef.current = readingMode;
  }, [readingMode, currentChapterIndex, chapters.length, currentVisibleChapter, setCurrentChapterIndex, t]);
  const effectiveProgress = syncedProgress || progress;
  const progressPercentage = effectiveProgress?.percentage != null
    ? effectiveProgress.percentage
    : null;

  // Current chapter
  const currentChapter = chapters[currentChapterIndex];
  const sanitizedContent = sanitizeRichContent(currentChapter?.content || '');

  // Content font/theme classes
  const contentFontClass = FONT_SIZE_CLASSES[fontSize] || 'text-base';
  const themeContentClass = THEME_CONTENT_CLASSES[theme] || THEME_CONTENT_CLASSES.light;
  const themeProseClass = THEME_PROSE_CLASSES[theme] || THEME_PROSE_CLASSES.light;

  // Calculate the unique page key for AnimatePresence
  const pageKey = `${currentChapter?.id || 'empty'}-${currentPageIndex}`;

  // Calculate total pages in book for progress bar
  // Simplified: totalPagesInChapter * totalChapters (until per-chapter measurement available)
  const totalPagesInBookValue = useMemo(() => {
    return totalPagesInChapter * chapters.length;
  }, [totalPagesInChapter, chapters.length]);

  // Current page offset in book: (currentChapterIndex * totalPagesInChapter) + currentPageIndex
  const currentPageOffsetInBookValue = useMemo(() => {
    return (currentChapterIndex * totalPagesInChapter) + currentPageIndex;
  }, [currentChapterIndex, totalPagesInChapter, currentPageIndex]);

  // Sync pages-in-book to store
  useEffect(() => {
    setTotalPagesInBook(totalPagesInBookValue);
  }, [totalPagesInBookValue, setTotalPagesInBook]);

  useEffect(() => {
    setCurrentPageOffsetInBook(currentPageOffsetInBookValue);
  }, [currentPageOffsetInBookValue, setCurrentPageOffsetInBook]);

  // Initialize chapter position from progress or URL
  useEffect(() => {
    const chapterParam = searchParams.get('chapter');
    if (chapters.length === 0) return;

    if (effectiveProgress?.finished) {
      setIsFinished(true);
    }

    if (chapterParam) {
      const idx = chapters.findIndex((c) => c._id === chapterParam);
      if (idx >= 0) {
        setCurrentChapterIndex(idx);
        return;
      }
    }

    if (effectiveProgress?.lastChapterId) {
      const idx = chapters.findIndex((c) => c._id === effectiveProgress.lastChapterId);
      if (idx >= 0) {
        setCurrentChapterIndex(idx);
        return;
      }
    }

    setCurrentChapterIndex(0);
  }, [chapters, effectiveProgress, searchParams, setCurrentChapterIndex]);

  // Sync fullscreen state
  useEffect(() => {
    if (isFullscreen !== storeIsFullscreen) {
      if (isFullscreen) {
        storeEnterFullscreen();
      } else {
        storeExitFullscreen();
      }
    }
  }, [isFullscreen, storeIsFullscreen, storeEnterFullscreen, storeExitFullscreen]);

  // Measure and update total pages after content renders
  useEffect(() => {
    if (!contentContainerRef.current || !contentInnerRef.current) return;

    const measurePages = () => {
      const container = contentContainerRef.current;
      const inner = contentInnerRef.current;
      if (!container || !inner) return;

      const containerWidth = container.clientWidth;
      const scrollWidth = inner.scrollWidth;

      if (containerWidth <= 0) return;

      const pages = Math.max(1, Math.round(scrollWidth / containerWidth));
      setTotalPagesInChapter(pages);
    };

    // Delay measurement to allow rendering and font application
    const timer = setTimeout(measurePages, 150);

    // Also measure on resize
    const resizeObserver = new ResizeObserver(() => {
      measurePages();
    });
    resizeObserver.observe(contentContainerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [currentChapter, sanitizedContent, fontSize, theme, setTotalPagesInChapter, storeIsFullscreen]);

  // Reset page index when chapter changes
  useEffect(() => {
    if (prevChapterIndexRef.current !== currentChapterIndex) {
      prevChapterIndexRef.current = currentChapterIndex;
      setCurrentPageIndex(0);
    }
  }, [currentChapterIndex, setCurrentPageIndex]);

  // Page animation completion handler
  const handleAnimationComplete = useCallback(() => {
    setIsPageAnimating(false);
  }, [setIsPageAnimating]);

  // Chapter transition dismiss
  const handleDismissTransition = useCallback(() => {
    setShowChapterTransition(false);
  }, []);

  // Page navigation — next page
  const handleNextPage = useCallback(() => {
    if (isPageAnimating) return;

    setPageDirection(1);
    const atChapterEnd = nextPage();

    if (atChapterEnd) {
      // At last page of last chapter → show "The End"
      if (currentChapterIndex >= chapters.length - 1) {
        setIsFinished(true);
        setAnnouncement(t('theEnd'));
      } else {
        // Transition to next chapter
        const nextIdx = currentChapterIndex + 1;
        setCurrentChapterIndex(nextIdx);
        setCurrentPageIndex(0);
        setChapterTransitionTitle(chapters[nextIdx].title);
        setShowChapterTransition(true);
        setAnnouncement(
          t('chapterTransition', { title: chapters[nextIdx].title }) + '. ' +
          t('pageOf', { current: 1, total: '{{total}}' }),
        );
      }
    } else {
      setAnnouncement(
        t('pageOf', { current: currentPageIndex + 2, total: totalPagesInChapter }),
      );
    }
  }, [isPageAnimating, nextPage, currentChapterIndex, chapters, setCurrentChapterIndex, setCurrentPageIndex, t, currentPageIndex, totalPagesInChapter]);

  // Page navigation — previous page
  const handlePreviousPage = useCallback(() => {
    if (isPageAnimating) return;

    setPageDirection(-1);
    const atChapterStart = previousPage();

    if (atChapterStart) {
      if (currentChapterIndex > 0) {
        // Transition to previous chapter — jump to last page
        const prevIdx = currentChapterIndex - 1;
        setCurrentChapterIndex(prevIdx);
        // We'll set page to last page after measurement
        setCurrentPageIndex(0);
      }
      // If at first page of first chapter, stay put
    } else {
      setAnnouncement(
        t('pageOf', { current: currentPageIndex, total: totalPagesInChapter }),
      );
    }
  }, [isPageAnimating, previousPage, currentChapterIndex, setCurrentChapterIndex, setCurrentPageIndex, t, currentPageIndex, totalPagesInChapter]);

  // Repagination handler — called when font size or theme changes
  const handleRepaginate = useCallback(() => {
    // Store the proportional position before repagination
    const oldTotalPages = totalPagesInChapter;
    const oldPageIndex = currentPageIndex;

    // After CSS reflows, remeasure
    const timer = setTimeout(() => {
      if (contentContainerRef.current && contentInnerRef.current) {
        const container = contentContainerRef.current;
        const inner = contentInnerRef.current;
        const containerWidth = container.clientWidth;
        const scrollWidth = inner.scrollWidth;

        if (containerWidth > 0) {
          const newTotalPages = Math.max(1, Math.round(scrollWidth / containerWidth));
          setTotalPagesInChapter(newTotalPages);

          // Preserve proportional position
          if (oldTotalPages > 0 && oldTotalPages !== newTotalPages) {
            const proportionalPage = Math.round((oldPageIndex / oldTotalPages) * newTotalPages);
            const clampedPage = Math.max(0, Math.min(proportionalPage, newTotalPages - 1));
            setCurrentPageIndex(clampedPage);
          }
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [totalPagesInChapter, currentPageIndex, setTotalPagesInChapter, setCurrentPageIndex]);

  // Save progress on chapter/page change
  useEffect(() => {
    if (chapters.length === 0 || !bookId || !currentChapter) return;

    // Skip initial mount
    if (prevChapterIndexRef.current === currentChapterIndex && currentPageIndex === 0 && !prevChapterIndexRef.current) {
      return;
    }

    const totalBookPages = totalPagesInChapter * chapters.length;
    const currentPageOffset = (currentChapterIndex * totalPagesInChapter) + currentPageIndex;
    const percentage = totalBookPages > 0
      ? (currentPageOffset / totalBookPages) * 100
      : ((currentChapterIndex + 1) / chapters.length) * 100;
    const isLastChapter = currentChapterIndex === chapters.length - 1;
    const finished = isLastChapter && currentPageIndex >= totalPagesInChapter - 1 && percentage >= 99;

    saveProgress({
      lastChapterId: currentChapter._id,
      lastPosition: currentPageIndex,
      percentage: Math.min(100, Math.round(percentage * 10) / 10),
      finished,
      _immediate: false,
    });

    if (finished) {
      setIsFinished(true);
    }
  }, [currentChapterIndex, currentPageIndex, chapters, bookId, saveProgress, currentChapter, totalPagesInChapter]);

  // Handle restart
  const handleRestart = useCallback(() => {
    setCurrentChapterIndex(0);
    setCurrentPageIndex(0);
    setIsFinished(false);
    setScrollFinished(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    saveProgress({
      lastChapterId: null,
      lastPosition: 0,
      percentage: 0,
      finished: false,
      _immediate: true,
    });
    setAnnouncement(t('navigatedToChapter', { chapterTitle: chapters[0]?.title || '' }));
  }, [chapters, setCurrentChapterIndex, setCurrentPageIndex, saveProgress, t]);

  // Initial reading announcement
  useEffect(() => {
    if (currentChapter && storeIsFullscreen) {
      setAnnouncement(
        t('readingAnnouncement', {
          bookTitle: book?.title || '',
          chapterTitle: currentChapter.title,
        }) + '. ' + t('pageOf', { current: currentPageIndex + 1, total: totalPagesInChapter }),
      );
    }
  }, [currentChapterIndex, chapters, storeIsFullscreen, t, currentChapter, book?.title, currentPageIndex, totalPagesInChapter]);

  // Keyboard navigation — page-based or scroll-based
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Chapter drawer toggle (unchanged)
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleChapterDrawer();
        return;
      }
      if (e.key === 'C' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        toggleChapterDrawer();
        return;
      }

      if (!storeIsFullscreen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        exitFullscreen();
        storeExitFullscreen();
        return;
      }

      // Scroll mode keyboard navigation
      if (readingMode === 'scroll') {
        if (e.key === 'Home') {
          e.preventDefault();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
          }
          return;
        }
        if (e.key === 'End') {
          e.preventDefault();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
          }
          return;
        }
        // PageDown/PageUp — native scroll handled by browser
        return;
      }

      // Paginated mode navigation
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousPage();
        return;
      }
      // Home = first page of current chapter
      if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPageIndex(0);
        setAnnouncement(t('pageOf', { current: 1, total: totalPagesInChapter }));
        return;
      }
      // End = last page of current chapter
      if (e.key === 'End') {
        e.preventDefault();
        setCurrentPageIndex(totalPagesInChapter - 1);
        setAnnouncement(t('pageOf', { current: totalPagesInChapter, total: totalPagesInChapter }));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [storeIsFullscreen, toggleChapterDrawer, exitFullscreen, storeExitFullscreen, handleNextPage, handlePreviousPage, setCurrentPageIndex, totalPagesInChapter, t, readingMode, prefersReducedMotion]);

  // Browser history / exit handling
  useEffect(() => {
    if (!storeIsFullscreen) return;

    const handlePopState = (e) => {
      if (window.confirm(t('exitConfirmation'))) {
        exitFullscreen();
        storeExitFullscreen();
        navigate('/shelf');
      } else {
        e.preventDefault();
        history.pushState({ reader: true }, '', window.location.href);
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = t('exitConfirmation');
    };

    history.pushState({ reader: true }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [storeIsFullscreen, t, exitFullscreen, storeExitFullscreen, navigate]);

  const handleChapterSelect = useCallback(
    (chapter) => {
      const idx = chapters.findIndex((c) => c._id === chapter._id);
      if (idx >= 0) {
        setCurrentChapterIndex(idx);
        setCurrentPageIndex(0);
        setChapterTransitionTitle(chapter.title);
        setShowChapterTransition(true);
        setAnnouncement(
          t('navigatedToChapter', { chapterTitle: chapter.title }) + '. ' +
          t('pageOf', { current: 1, total: '{{total}}' }),
        );
      }
    },
    [chapters, setCurrentChapterIndex, setCurrentPageIndex, t],
  );

  const handleBackToShelf = useCallback(() => {
    if (storeIsFullscreen) {
      exitFullscreen();
      storeExitFullscreen();
    }
    navigate('/shelf');
  }, [storeIsFullscreen, exitFullscreen, storeExitFullscreen, navigate]);

  const handleToggleChapterDrawer = useCallback(() => {
    toggleChapterDrawer();
  }, [toggleChapterDrawer]);

  const handleOpenSettings = useCallback(() => {
    openSettings();
  }, [openSettings]);

  const handleEnterFullscreen = useCallback(() => {
    enterFullscreen();
    storeEnterFullscreen();
    showToolbar();
  }, [enterFullscreen, storeEnterFullscreen, showToolbar]);

  // Compute the CSS transform for paginated content
  const contentTransform = `translateX(calc(-${currentPageIndex * 100}%))`;

  if (chaptersLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50">
        <div className="animate-pulse text-gray-400 text-lg">{t('subtitle')}</div>
      </main>
    );
  }

  // Fullscreen view — paginated or scroll mode
  if (storeIsFullscreen) {
    // Shared fullscreen structure
    const fullscreenShell = (contentArea) => (
      <div
        className={`reader-fullscreen-container fixed inset-0 z-50 flex flex-col overscroll-contain ${themeContentClass}`}
        style={{ overscrollBehavior: 'contain' }}
      >
        <A11yAnnouncer message={announcement} />

        <ReaderToolbar
          bookTitle={book?.title || ''}
          onBackToShelf={handleBackToShelf}
          onToggleChapterDrawer={handleToggleChapterDrawer}
          onOpenSettings={handleOpenSettings}
        />

        {contentArea}

        <ReaderProgressBar
          currentPageOffsetInBook={currentPageOffsetInBookValue}
          totalPagesInBook={totalPagesInBookValue}
          currentChapterIndex={readingMode === 'scroll' ? currentVisibleChapter : currentChapterIndex}
          totalChapters={chapters.length}
          percentage={progressPercentage}
          scrollProgress={readingMode === 'scroll' ? scrollProgressValue : undefined}
        />

        <ChapterDrawer
          chapters={chapters}
          progress={progress}
          onChapterSelect={handleChapterSelect}
        />

        <ReaderSettings onRepaginate={handleRepaginate} />
      </div>
    );

    // Scroll mode
    if (readingMode === 'scroll') {
      return fullscreenShell(
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-8 max-w-2xl mx-auto w-full scroll-smooth"
          style={{ overscrollBehavior: 'contain' }}
          ref={scrollContainerRef}
          tabIndex={0}
          role="document"
          aria-label={t('title')}
        >
          {chapters.length > 0 ? (
            <>
              {chapters.map((chapter, index) => (
                <ScrollChapterMarker
                  key={chapter._id}
                  chapter={chapter}
                  index={index}
                  onVisible={(idx) => {
                    setCurrentVisibleChapter(idx);
                  }}
                  fontSize={fontSize}
                  themeProseClass={themeProseClass}
                  observeRef={observeChapter}
                />
              ))}
              {/* End sentinel */}
              <div ref={scrollEndSentinelRef} className="h-1" aria-hidden="true" />
              {/* "The End" inline at bottom of scroll */}
              {(scrollFinished || isFinished) && (
                <div
                  className="flex flex-col items-center justify-center gap-6 py-20"
                  role="alert"
                  aria-live="assertive"
                >
                  <h2 className="text-3xl font-bold" aria-label={t('theEnd')}>
                    {t('theEnd')}
                  </h2>
                  <p className="text-lg opacity-80">{t('finishedMessage', { bookTitle: book?.title || '' })}</p>
                  <Button
                    onClick={handleRestart}
                    color="amber"
                    size="lg"
                    className="mt-4 focus:ring-2 focus:ring-amber-300"
                    aria-label={t('restartBook')}
                  >
                    {t('restartBook')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <HiBookOpen className="w-16 h-16 text-purple-400" aria-hidden="true" />
              <p className="text-lg opacity-70">{t('subtitle')}</p>
            </div>
          )}
        </div>
      );
    }

    // Paginated mode (existing behavior)
    return fullscreenShell(
      <>
        <div
          className="flex-1 overflow-hidden px-4 py-8 max-w-2xl mx-auto w-full relative"
          ref={contentContainerRef}
        >
          <ReaderTapZones
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />

          {isFinished ? (
            <div
              className="flex flex-col items-center justify-center gap-6 py-20"
              role="alert"
              aria-live="assertive"
            >
              <h2 className="text-3xl font-bold text-gray-800" aria-label={t('theEnd')}>
                {t('theEnd')}
              </h2>
              <p className="text-gray-600 text-lg">{t('finishedMessage', { bookTitle: book?.title || '' })}</p>
              <Button
                onClick={handleRestart}
                color="amber"
                size="lg"
                className="mt-4 focus:ring-2 focus:ring-amber-300"
                aria-label={t('restartBook')}
              >
                {t('restartBook')}
              </Button>
            </div>
          ) : currentChapter ? (
            <PageTurnAnimation
              direction={pageDirection}
              pageKey={pageKey}
              onAnimationComplete={handleAnimationComplete}
              isEnabled={!prefersReducedMotion}
            >
              <div
                className="reader-paginated-content"
                style={{
                  columnWidth: '100%',
                  columnGap: 0,
                  columnFill: 'auto',
                  height: '100%',
                  overflow: 'hidden',
                  transform: contentTransform,
                  willChange: 'transform',
                }}
                ref={contentInnerRef}
                role="article"
                aria-labelledby="chapter-title"
                aria-label={t('pageOf', { current: currentPageIndex + 1, total: totalPagesInChapter })}
              >
                <div className={`prose prose-lg max-w-none ${contentFontClass} ${themeProseClass}`}>
                  <h2 id="chapter-title" className="text-2xl font-bold mb-6">{currentChapter.title}</h2>
                  <div
                    className="leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    tabIndex={0}
                  />
                </div>
              </div>
            </PageTurnAnimation>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <HiBookOpen className="w-16 h-16 text-purple-400" aria-hidden="true" />
              <p className="text-lg opacity-70">{t('subtitle')}</p>
            </div>
          )}
        </div>

        <ChapterTransitionCard
          title={chapterTransitionTitle}
          visible={showChapterTransition}
          onDismiss={handleDismissTransition}
        />
      </>
    );
  }

  // Non-fullscreen view (scroll mode — keep existing behavior)
  return (
    <main className={`min-h-screen bg-gradient-to-br from-amber-50 to-teal-50 flex flex-col ${themeContentClass}`}>
      <A11yAnnouncer message={announcement} />

      <header className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm shadow-sm z-30 relative">
        <Button
          onClick={() => navigate('/shelf')}
          color="light"
          size="sm"
          className="border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-300"
          aria-label={t('backToShelf')}
        >
          {t('backToShelf')}
        </Button>

        <span className="text-sm font-semibold text-gray-700 truncate mx-4">
          {currentChapter?.title || t('title')}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEnterFullscreen}
            className="p-2 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-amber-300 focus:outline-none transition-colors text-gray-600"
            aria-label={t('enterFullscreen')}
            title={t('enterFullscreen')}
          >
            <HiArrowsExpand className="w-5 h-5" aria-hidden="true" />
          </button>
          {chapters.length > 1 && (
            <Button
              onClick={toggleChapterDrawer}
              color="light"
              size="sm"
              className="border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-amber-300"
              aria-label={t('openChapterList')}
            >
              <HiViewList className="w-5 h-5" aria-hidden="true" />
            </Button>
          )}
          <NextChapterButton chapters={chapters} onClick={() => {
            if (currentChapterIndex < chapters.length - 1) {
              const nextIdx = currentChapterIndex + 1;
              setCurrentChapterIndex(nextIdx);
              setCurrentPageIndex(0);
              setAnnouncement(t('navigatedToChapter', { chapterTitle: chapters[nextIdx].title }));
            }
          }} />
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-8 max-w-2xl mx-auto w-full" aria-label={t('title')}>
        {isFinished ? (
          <div
            className="flex flex-col items-center justify-center gap-6 py-20"
            role="alert"
            aria-live="assertive"
          >
            <h2 className="text-3xl font-bold text-gray-800" aria-label={t('theEnd')}>
              {t('theEnd')}
            </h2>
            <p className="text-gray-600 text-lg">{t('finishedMessage', { bookTitle: book?.title || '' })}</p>
            <Button
              onClick={handleRestart}
              color="amber"
              size="lg"
              className="mt-4 focus:ring-2 focus:ring-amber-300"
              aria-label={t('restartBook')}
            >
              {t('restartBook')}
            </Button>
          </div>
        ) : currentChapter ? (
          <motion.article
            key={currentChapter._id}
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className={`prose prose-lg max-w-none ${contentFontClass} ${themeProseClass}`}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{currentChapter.title}</h2>
            <div
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </motion.article>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <HiBookOpen className="w-16 h-16 text-purple-400" aria-hidden="true" />
            <p className="text-gray-500 text-lg">{t('subtitle')}</p>
          </div>
        )}
      </section>

      <ChapterDrawer
        chapters={chapters}
        progress={progress}
        onChapterSelect={handleChapterSelect}
      />

      <ReaderSettings onRepaginate={handleRepaginate} />
    </main>
  );
}