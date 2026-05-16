// Contopia — ShelfSkeleton
// Loading placeholder with animated skeleton spines
import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 3;
const SKELETONS_PER_ROW = 5;

function SkeletonRow() {
  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-1 px-2">
        {Array.from({ length: SKELETONS_PER_ROW }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="animate-pulse bg-gray-300 rounded-t-sm min-w-[44px] min-h-[44px]"
            style={{
              width: `${44 + Math.random() * 40}px`,
              height: `${80 + Math.random() * 60}px`,
            }}
          />
        ))}
      </div>
      <div className="h-3 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 rounded-b-sm shadow-md" />
    </div>
  );
}

export default function ShelfSkeleton() {
  const { t } = useTranslation('shelf');

  return (
    <div
      aria-busy="true"
      aria-label={t('loading')}
      className="space-y-2 py-6"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
