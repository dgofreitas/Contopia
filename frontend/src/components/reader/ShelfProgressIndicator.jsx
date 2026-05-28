// Contopia — ShelfProgressIndicator
// Thin progress bar overlay for book spines on the bookshelf
import { useTranslation } from 'react-i18next';

/**
 * Accessible progress bar overlay rendered at the bottom of a book spine.
 *
 * @param {{ percentage: number; finished?: boolean }} props
 * - percentage: 0–100 reading progress
 * - finished:  whether the book is fully read (overrides color to gold)
 */
export default function ShelfProgressIndicator({ percentage, finished = false }) {
  const { t } = useTranslation('shelf');

  const clampedPercentage = Math.min(100, Math.max(0, Math.round(percentage)));
  const isFinished = finished || clampedPercentage >= 100;

  // Green for in-progress, gold for finished
  const barColor = isFinished ? 'bg-amber-400' : 'bg-emerald-500';
  // Slightly darker background track behind the progress fill
  const trackColor = isFinished ? 'bg-amber-900/30' : 'bg-emerald-900/30';

  const label = isFinished
    ? t('finishedLabel')
    : t('progressLabel', { percentage: clampedPercentage });

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clampedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`absolute bottom-0 left-0 right-0 h-[10%] rounded-b-sm overflow-hidden ${trackColor}`}
    >
      <div
        className={`h-full transition-all duration-300 ease-out rounded-b-sm ${barColor}`}
        style={{ width: `${clampedPercentage}%` }}
      />
    </div>
  );
}