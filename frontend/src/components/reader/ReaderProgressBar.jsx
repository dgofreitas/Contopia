import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';

export default function ReaderProgressBar({ currentChapterIndex, totalChapters, percentage }) {
  const { t } = useTranslation('reader');
  const prefersReducedMotion = useReducedMotion();

  if (totalChapters <= 0) return null;

  // Use server/local percentage if provided; otherwise estimate from chapter index
  const progress = percentage != null
    ? Math.min(100, Math.max(0, percentage))
    : ((currentChapterIndex + 1) / totalChapters) * 100;

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