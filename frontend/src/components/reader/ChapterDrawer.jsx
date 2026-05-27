import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import useReaderStore from '../../stores/reader-store';
import ChapterDrawerItem from './ChapterDrawerItem';

export default function ChapterDrawer({ chapters, progress, onChapterSelect }) {
  const { t } = useTranslation('reader');
  const prefersReducedMotion = useReducedMotion();
  const isChapterDrawerOpen = useReaderStore((s) => s.isChapterDrawerOpen);
  const closeChapterDrawer = useReaderStore((s) => s.closeChapterDrawer);
  const currentChapterIndex = useReaderStore((s) => s.currentChapterIndex);

  const lastChapterId = progress?.lastChapterId ?? null;
  const percentage = progress?.percentage ?? 0;

  const getChapterStatus = useCallback(
    (chapter) => {
      if (!lastChapterId) return 'unread';
      const lastChapter = chapters.find((c) => c._id === lastChapterId);
      if (chapter._id === lastChapterId) {
        const isLastChapter = chapters[chapters.length - 1]?._id === lastChapterId;
        if (percentage === 100 || (isLastChapter && percentage >= 95)) {
          return 'read';
        }
        return 'in-progress';
      }
      if (lastChapter && chapter.order < lastChapter.order) {
        return 'read';
      }
      return 'unread';
    },
    [lastChapterId, percentage, chapters],
  );

  const handleBackdropClick = useCallback(() => {
    closeChapterDrawer();
  }, [closeChapterDrawer]);

  const handleChapterClick = useCallback(
    (chapter) => {
      onChapterSelect(chapter);
      closeChapterDrawer();
    },
    [onChapterSelect, closeChapterDrawer],
  );

  useEffect(() => {
    if (!isChapterDrawerOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeChapterDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChapterDrawerOpen, closeChapterDrawer]);

  const slideVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { x: '-100%' },
        animate: { x: 0 },
        exit: { x: '-100%' },
      };

  const backdropVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  return (
    <AnimatePresence>
      {isChapterDrawerOpen && chapters.length > 1 && (
        <>
          <motion.div
            key="chapter-drawer-backdrop"
            initial={backdropVariants.initial}
            animate={backdropVariants.animate}
            exit={backdropVariants.exit}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/40 z-40 md:bg-black/40 bg-black/50"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
          <motion.nav
            key="chapter-drawer"
            role="dialog"
            aria-label={t('chapterList')}
            initial={slideVariants.initial}
            animate={slideVariants.animate}
            exit={slideVariants.exit}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:left-0 md:right-auto md:w-80 bg-white z-50 rounded-t-2xl md:rounded-none shadow-xl md:shadow-2xl flex flex-col max-h-[70vh] md:max-h-full"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{t('chapterList')}</h2>
              <button
                onClick={closeChapterDrawer}
                aria-label={t('close', { ns: 'reader' }) || 'Close'}
                className="p-2 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-amber-300 focus:outline-none"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul role="listbox" className="flex-1 overflow-y-auto py-2">
              {chapters.map((chapter, index) => (
                <ChapterDrawerItem
                  key={chapter._id}
                  chapter={chapter}
                  status={getChapterStatus(chapter)}
                  isCurrent={index === currentChapterIndex}
                  onClick={handleChapterClick}
                />
              ))}
            </ul>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}