import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PulledOutBookCard from './PulledOutBookCard';

const EASE_OUT = [0.25, 0.1, 0.25, 1];

export default function PulledOutOverlay({
  book,
  onDismiss,
  onRead,
  onEdit,
  onDesignCover,
  triggerRef,
}) {
  const { t } = useTranslation('shelf');
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? 0 : 0.25;
  const overlayRef = useRef(null);
  const firstBtnRef = useRef(null);

  useEffect(() => {
    firstBtnRef.current?.focus();
  }, []);

  const handleDismiss = useCallback(() => {
    onDismiss();
    triggerRef?.current?.focus();
  }, [onDismiss, triggerRef]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
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
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleDismiss]);

  return (
    <AnimatePresence>
      {book && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/30 z-40"
            aria-hidden="true"
          />
          <motion.div
            key="card"
            ref={overlayRef}
            role="dialog"
            aria-label={t('pullOut.ariaActions')}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration, ease: EASE_OUT }}
            style={{ willChange: 'transform' }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <PulledOutBookCard
              book={book}
              onRead={onRead}
              onEdit={onEdit}
              onDesignCover={onDesignCover}
            />
            <button
              ref={firstBtnRef}
              onClick={handleDismiss}
              aria-label={t('pullOut.ariaDismiss')}
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:text-xs focus:px-2 focus:py-1 focus:rounded focus:bg-gray-200 focus:text-gray-700"
            >
              {t('pullOut.ariaDismiss')}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
