import { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from 'flowbite-react';
import { HiBookOpen, HiViewList, HiArrowsExpand } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import useReaderStore from '../../stores/reader-store';
import useChaptersQuery from '../../hooks/useChaptersQuery';
import useReadingProgressQuery from '../../hooks/useReadingProgressQuery';
import useFullscreen from '../../hooks/useFullscreen';
import ChapterDrawer from '../../components/reader/ChapterDrawer';
import NextChapterButton from '../../components/reader/NextChapterButton';
import ReaderToolbar from '../../components/reader/ReaderToolbar';
import ReaderProgressBar from '../../components/reader/ReaderProgressBar';
import ReaderTapZones from '../../components/reader/ReaderTapZones';
import ReaderSettings from '../../components/reader/ReaderSettings';
import A11yAnnouncer from '../../components/common/A11yAnnouncer';

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

  const currentChapterIndex = useReaderStore((s) => s.currentChapterIndex);
  const setCurrentChapterIndex = useReaderStore((s) => s.setCurrentChapterIndex);
  const toggleChapterDrawer = useReaderStore((s) => s.toggleChapterDrawer);
  const openChapterDrawer = useReaderStore((s) => s.openChapterDrawer);
  const storeIsFullscreen = useReaderStore((s) => s.isFullscreen);
  const storeEnterFullscreen = useReaderStore((s) => s.enterFullscreen);
  const storeExitFullscreen = useReaderStore((s) => s.exitFullscreen);
  const showToolbar = useReaderStore((s) => s.showToolbar);
  const openSettings = useReaderStore((s) => s.openSettings);
  const fontSize = useReaderStore((s) => s.fontSize);
  const theme = useReaderStore((s) => s.theme);

  const { data: chapters = [], isLoading: chaptersLoading } = useChaptersQuery(bookId);
  const { data: progress } = useReadingProgressQuery(bookId);

  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const chapterParam = searchParams.get('chapter');
    if (chapters.length === 0) return;

    if (chapterParam) {
      const idx = chapters.findIndex((c) => c._id === chapterParam);
      if (idx >= 0) {
        setCurrentChapterIndex(idx);
        return;
      }
    }

    if (progress?.lastChapterId) {
      const idx = chapters.findIndex((c) => c._id === progress.lastChapterId);
      if (idx >= 0) {
        setCurrentChapterIndex(idx);
        return;
      }
    }

    setCurrentChapterIndex(0);
  }, [chapters, progress, searchParams, setCurrentChapterIndex]);

  useEffect(() => {
    if (isFullscreen !== storeIsFullscreen) {
      if (isFullscreen) {
        storeEnterFullscreen();
      } else {
        storeExitFullscreen();
      }
    }
  }, [isFullscreen, storeIsFullscreen, storeEnterFullscreen, storeExitFullscreen]);

  useEffect(() => {
    const currentChapter = chapters[currentChapterIndex];
    if (currentChapter && storeIsFullscreen) {
      setAnnouncement(t('readingAnnouncement', { bookTitle: '', chapterTitle: currentChapter.title }));
    }
  }, [currentChapterIndex, chapters, storeIsFullscreen, t]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentChapterIndex < chapters.length - 1) {
          const nextIdx = currentChapterIndex + 1;
          setCurrentChapterIndex(nextIdx);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentChapterIndex > 0) {
          const prevIdx = currentChapterIndex - 1;
          setCurrentChapterIndex(prevIdx);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [storeIsFullscreen, currentChapterIndex, chapters.length, toggleChapterDrawer, exitFullscreen, storeExitFullscreen, setCurrentChapterIndex]);

  const handleChapterSelect = useCallback(
    (chapter) => {
      const idx = chapters.findIndex((c) => c._id === chapter._id);
      if (idx >= 0) {
        setCurrentChapterIndex(idx);
        setAnnouncement(t('navigatedToChapter', { chapterTitle: chapter.title }));
      }
    },
    [chapters, setCurrentChapterIndex, t],
  );

  const handleNextChapter = useCallback(() => {
    if (currentChapterIndex < chapters.length - 1) {
      const nextIdx = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIdx);
      setAnnouncement(t('navigatedToChapter', { chapterTitle: chapters[nextIdx].title }));
    }
  }, [currentChapterIndex, chapters, setCurrentChapterIndex, t]);

  const handlePreviousChapter = useCallback(() => {
    if (currentChapterIndex > 0) {
      const prevIdx = currentChapterIndex - 1;
      setCurrentChapterIndex(prevIdx);
      setAnnouncement(t('navigatedToChapter', { chapterTitle: chapters[prevIdx].title }));
    }
  }, [currentChapterIndex, chapters, setCurrentChapterIndex, t]);

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

  const currentChapter = chapters[currentChapterIndex];

  const contentFontClass = FONT_SIZE_CLASSES[fontSize] || 'text-base';
  const themeContentClass = THEME_CONTENT_CLASSES[theme] || THEME_CONTENT_CLASSES.light;
  const themeProseClass = THEME_PROSE_CLASSES[theme] || THEME_PROSE_CLASSES.light;

  if (chaptersLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50">
        <div className="animate-pulse text-gray-400 text-lg">{t('subtitle')}</div>
      </main>
    );
  }

  if (storeIsFullscreen) {
    return (
      <div
        className={`reader-fullscreen-container fixed inset-0 z-50 flex flex-col overscroll-contain ${themeContentClass}`}
        style={{ overscrollBehavior: 'contain' }}
      >
        <A11yAnnouncer message={announcement} />

        <ReaderToolbar
          onBackToShelf={handleBackToShelf}
          onToggleChapterDrawer={handleToggleChapterDrawer}
          onOpenSettings={handleOpenSettings}
        />

        <div className="flex-1 overflow-y-auto px-4 py-8 max-w-2xl mx-auto w-full relative">
          <ReaderTapZones
            onPreviousChapter={handlePreviousChapter}
            onNextChapter={handleNextChapter}
          />
          {currentChapter ? (
            <motion.article
              key={currentChapter._id}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              className={`prose prose-lg max-w-none ${contentFontClass} ${themeProseClass}`}
            >
              <h2 className="text-2xl font-bold mb-6">{currentChapter.title}</h2>
              <div
                className="leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: currentChapter.content || '' }}
              />
            </motion.article>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <HiBookOpen className="w-16 h-16 text-purple-400" aria-hidden="true" />
              <p className="text-lg opacity-70">{t('subtitle')}</p>
            </div>
          )}
        </div>

        <ReaderProgressBar
          currentChapterIndex={currentChapterIndex}
          totalChapters={chapters.length}
        />

        <ChapterDrawer
          chapters={chapters}
          progress={progress}
          onChapterSelect={handleChapterSelect}
        />

        <ReaderSettings />
      </div>
    );
  }

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
          <NextChapterButton chapters={chapters} onClick={handleNextChapter} />
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-8 max-w-2xl mx-auto w-full" aria-label={t('title')}>
        {currentChapter ? (
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
              dangerouslySetInnerHTML={{ __html: currentChapter.content || '' }}
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

      <ReaderSettings />
    </main>
  );
}