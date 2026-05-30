import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import CoverDisplay from './CoverDisplay';
import FavoriteToggle from './FavoriteToggle';
import { sanitizeText } from '../../lib/sanitize';
import { spineColorFromId } from '../../lib/spine-colors';

const EASE_OUT = [0.25, 0.1, 0.25, 1];

export default function CoverOverlay({ isOpen, book, onClose, onRead, onFavoriteToggle }) {
  const { t } = useTranslation('shelf');
  const prefersReducedMotion = useReducedMotion();
  const overlayRef = useRef(null);
  const firstBtnRef = useRef(null);

  const title = book ? sanitizeText(book.title) : '';
  const authorName = book?.authorName || '';
  const summary = book?.description ? sanitizeText(book.description) : '';
  const spineColor = book?.spineColor || spineColorFromId(book?._id);
  const coverUrl = book?.coverUrl || null;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      firstBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key === 'Tab' && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, handleClose]);

  return (
    <AnimatePresence>
      {isOpen && book && (
        <>
          <motion.div
            key="cover-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-[60]"
            aria-hidden="true"
          />
          <motion.div
            key="cover-modal"
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('coverOverlay.ariaLabel', { title })}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: EASE_OUT }}
            style={{ willChange: 'transform' }}
            className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-[90vw] max-w-sm max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
              {t('coverOverlay.title')}
            </h2>

            <div className="w-full aspect-[3/4] rounded-lg overflow-hidden mb-4">
              <CoverDisplay
                book={book}
                className="w-full h-full"
              />
            </div>

            <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
            {authorName && (
              <p className="text-sm text-gray-500 mb-2">
                {t('coverOverlay.authorBy', { name: authorName })}
              </p>
            )}
            {summary && (
              <p className="text-xs text-gray-600 leading-relaxed mb-4">{summary}</p>
            )}

            <div className="flex gap-2 items-center">
              <FavoriteToggle
                isFavorited={book.isFavorited}
                onToggle={onFavoriteToggle}
              />
              <button
                ref={firstBtnRef}
                onClick={onRead}
                aria-label={t('coverOverlay.readBook')}
                className="flex-1 text-sm font-semibold py-2 px-4 rounded bg-amber-600 text-white hover:bg-amber-700 focus:ring-2 focus:ring-amber-300 focus:outline-none"
              >
                {t('coverOverlay.readBook')}
              </button>
              <button
                onClick={handleClose}
                aria-label={t('coverOverlay.close')}
                className="flex-1 text-sm font-semibold py-2 px-4 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:outline-none"
              >
                {t('coverOverlay.close')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
