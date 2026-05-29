import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * ReaderProgressBar — Page-based reading progress bar.
 *
 * Shows progress based on currentPageOffsetInBook / totalPagesInBook * 100.
 * Falls back to chapter-based progress (currentChapterIndex / totalChapters) when page data is unavailable.
 */
export default function ReaderProgressBar({
  currentPageOffsetInBook,
  totalPagesInBook,
  currentChapterIndex,
  totalChapters,
  percentage,
  scrollProgress,
}) {
  const { t } = useTranslation('reader');
  const prefersReducedMotion = useReducedMotion();

  if (totalChapters <= 0 && totalPagesInBook <= 0) return null;

  // If scroll progress is provided (scroll mode), use it directly
  let progress;
  if (scrollProgress != null) {
    progress = scrollProgress;
  } else if (totalPagesInBook > 0) {
    progress = totalPagesInBook > 0
      ? ((currentPageOffsetInBook) / totalPagesInBook) * 100
      : 0;
  } else if (percentage != null) {
    progress = percentage;
  } else {
    progress = ((currentChapterIndex + 1) / totalChapters) * 100;
  }

  progress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="reader-progress-bar fixed bottom-0 left-0 right-0 z-30 h-0.5 bg-black/10"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('progressLabel')}
    >
      <motion.div
        className="h-full bg-amber-600/70"
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}