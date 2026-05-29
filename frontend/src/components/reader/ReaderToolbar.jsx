import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { HiArrowLeft, HiViewList, HiCog } from 'react-icons/hi';
import useReaderStore from '../../stores/reader-store';

const TOOLBAR_AUTO_HIDE_MS = 2000;

export default function ReaderToolbar({ bookTitle, onBackToShelf, onToggleChapterDrawer, onOpenSettings }) {
  const { t } = useTranslation('reader');
  const prefersReducedMotion = useReducedMotion();
  const isToolbarVisible = useReaderStore((s) => s.isToolbarVisible);
  const showToolbar = useReaderStore((s) => s.showToolbar);
  const hideToolbar = useReaderStore((s) => s.hideToolbar);
  const readingMode = useReaderStore((s) => s.readingMode);
  const toolbarRef = useRef(null);
  const autoHideTimerRef = useRef(null);

  const startAutoHide = useCallback(() => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    autoHideTimerRef.current = setTimeout(() => {
      hideToolbar();
    }, TOOLBAR_AUTO_HIDE_MS);
  }, [hideToolbar]);

  const handleMouseEnter = useCallback(() => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isToolbarVisible) startAutoHide();
  }, [isToolbarVisible, startAutoHide]);

  useEffect(() => {
    if (isToolbarVisible) {
      startAutoHide();
      if (toolbarRef.current) {
        const firstBtn = toolbarRef.current.querySelector('button');
        if (firstBtn) firstBtn.focus();
      }
    }
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [isToolbarVisible, startAutoHide]);

  useEffect(() => {
    if (!isToolbarVisible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideToolbar();
        return;
      }

      if (e.key === 'Tab' && toolbarRef.current) {
        const focusable = toolbarRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isToolbarVisible, hideToolbar]);

  const fadeIn = prefersReducedMotion ? { opacity: 1 } : { opacity: 1 };
  const fadeOut = prefersReducedMotion ? { opacity: 0 } : { opacity: 0 };
  const duration = prefersReducedMotion ? 0 : 0.3;

  return (
    <AnimatePresence>
      {isToolbarVisible && (
        <motion.header
          ref={toolbarRef}
          role="toolbar"
          aria-label={t('toggleToolbar')}
          initial={fadeOut}
          animate={fadeIn}
          exit={fadeOut}
          transition={{ duration }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="reader-toolbar fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md text-white"
        >
          <button
            onClick={onBackToShelf}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/20 focus:ring-2 focus:ring-amber-300 focus:outline-none transition-colors text-sm font-medium"
            aria-label={t('backToShelfFullscreen')}
          >
            <HiArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span>{t('backToShelfFullscreen')}</span>
          </button>

          <span className="text-sm font-semibold text-white/90 truncate mx-4 hidden sm:block" aria-hidden="true">
            {bookTitle || ''}
          </span>

           <div className="flex items-center gap-2">
             <button
               onClick={onToggleChapterDrawer}
               className="p-2 rounded-lg hover:bg-white/20 focus:ring-2 focus:ring-amber-300 focus:outline-none transition-colors"
               aria-label={t('openChapterList')}
               title={t('chapterList')}
             >
               <HiViewList className="w-5 h-5" aria-hidden="true" />
             </button>
             <span
               className="text-xs font-medium text-white/60 px-2 py-1 rounded bg-white/10"
               aria-label={readingMode === 'scroll' ? t('scrollMode') : t('paginatedMode')}
             >
               {readingMode === 'scroll' ? t('scrollMode') : t('paginatedMode')}
             </span>
             <button
               onClick={onOpenSettings}
               className="p-2 rounded-lg hover:bg-white/20 focus:ring-2 focus:ring-amber-300 focus:outline-none transition-colors"
               aria-label={t('settings')}
               title={t('settings')}
             >
               <HiCog className="w-5 h-5" aria-hidden="true" />
             </button>
           </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}