import { useTranslation } from 'react-i18next';

const SKELETON_ROWS = 3;
const SKELETONS_PER_ROW = 12;

function SkeletonRow() {
  return (
    <div className="flex flex-col">
      <div className="shelf-row-grid px-2">
        {Array.from({ length: SKELETONS_PER_ROW }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="animate-pulse bg-gray-300 rounded-t-sm min-h-[48px] aspect-[3/5]"
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
      className="w-full px-4 md:px-6 lg:px-8 lg:max-w-5xl lg:mx-auto space-y-2 py-6"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
