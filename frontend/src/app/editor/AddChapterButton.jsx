import { useTranslation } from 'react-i18next';
import { Button, Spinner, Tooltip } from 'flowbite-react';
import { HiPlus } from 'react-icons/hi';

const MAX_CHAPTERS = 50;

export default function AddChapterButton({ chaptersCount, onAdd, isCreating }) {
  const { t } = useTranslation('editor');
  const isAtLimit = chaptersCount >= MAX_CHAPTERS;

  const button = (
    <Button
      size="sm"
      color="light"
      onClick={onAdd}
      disabled={isAtLimit || isCreating}
      aria-label={t('addChapter')}
      className="w-full justify-center border border-dashed border-gray-300 text-gray-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 focus:ring-amber-300 transition-colors"
    >
      {isCreating ? (
        <Spinner size="sm" className="mr-2" />
      ) : (
        <HiPlus className="w-4 h-4 mr-1.5" />
      )}
      {t('addChapter')}
    </Button>
  );

  if (isAtLimit) {
    return (
      <Tooltip content={t('chapterLimitReached')} placement="top">
        <div>{button}</div>
      </Tooltip>
    );
  }

  return button;
}