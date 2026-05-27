import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from 'flowbite-react';
import { HiBookOpen, HiViewList } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import useReaderStore from '../../stores/reader-store';
import useChaptersQuery from '../../hooks/useChaptersQuery';
import useReadingProgressQuery from '../../hooks/useReadingProgressQuery';
import ChapterDrawer from '../../components/reader/ChapterDrawer';
import NextChapterButton from '../../components/reader/NextChapterButton';
import A11yAnnouncer from '../../components/common/A11yAnnouncer';

export default function ReaderPage() {
  const { t } = useTranslation('reader');
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const currentChapterIndex = useReaderStore((s) => s.currentChapterIndex);
  const setCurrentChapterIndex = useReaderStore((s) => s.setCurrentChapterIndex);
  const toggleChapterDrawer = useReaderStore((s) => s.toggleChapterDrawer);
  const openChapterDrawer = useReaderStore((s) => s.openChapterDrawer);

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
    const handleKeyDown = (e) => {
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        toggleChapterDrawer();
      }
      if (e.key === 'C' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        toggleChapterDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleChapterDrawer]);

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

  const currentChapter = chapters[currentChapterIndex];

  if (chaptersLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50">
        <div className="animate-pulse text-gray-400 text-lg">{t('subtitle')}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50 flex flex-col">
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
            className="prose prose-lg max-w-none"
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
    </main>
  );
}