import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * ChapterTransitionCard — Overlay card showing chapter title at chapter boundaries.
 *
 * Displays a chapter title with a fade animation and auto-dismisses after 1.5s
 * (0.5s when prefers-reduced-motion is enabled).
 *
 * @param {Object} props
 * @param {string} props.title - Chapter title to display
 * @param {boolean} props.visible - Whether the card is currently visible
 * @param {Function} props.onDismiss - Callback when card auto-dismisses or is tapped
 */
export default function ChapterTransitionCard({ title, visible, onDismiss }) {
  const { t } = useTranslation('reader');
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(visible);

  // Sync visibility with prop
  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  // Auto-dismiss: 1.5s normal, 0.5s for reduced motion
  useEffect(() => {
    if (!isVisible) return;

    const duration = prefersReducedMotion ? 500 : 1500;
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, prefersReducedMotion, onDismiss]);

  const handleTap = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const fadeVariants = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
      };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="chapter-transition"
          variants={fadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
            ease: 'easeOut',
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleTap}
          role="alert"
          aria-live="assertive"
        >
          <div
            className="text-center px-8 py-12 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/60 text-sm uppercase tracking-widest mb-3">
              {t('chapterTransition', { title: '' }).trim() || 'Chapter'}
            </p>
            <h2 className="text-3xl font-bold text-white leading-tight">
              {title}
            </h2>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}