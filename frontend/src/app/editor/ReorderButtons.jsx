import { useTranslation } from 'react-i18next';
import { HiArrowUp, HiArrowDown } from 'react-icons/hi';

export default function ReorderButtons({ canMoveUp, canMoveDown, onMoveUp, onMoveDown }) {
  const { t } = useTranslation('editor');

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={canMoveUp ? onMoveUp : undefined}
        disabled={!canMoveUp}
        aria-label={t('chapterMoveUp')}
        className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        <HiArrowUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={canMoveDown ? onMoveDown : undefined}
        disabled={!canMoveDown}
        aria-label={t('chapterMoveDown')}
        className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        <HiArrowDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}