import { useTranslation } from 'react-i18next';
import { HiArrowRight } from 'react-icons/hi';
import useReaderStore from '../../stores/reader-store';

export default function NextChapterButton({ chapters, onClick }) {
  const { t } = useTranslation('reader');
  const currentChapterIndex = useReaderStore((s) => s.currentChapterIndex);

  if (!chapters || chapters.length <= 1 || currentChapterIndex >= chapters.length - 1) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 focus:ring-2 focus:ring-amber-300 focus:outline-none transition-colors text-sm font-semibold"
      aria-label={t('nextChapterBtn', { chapterTitle: chapters[currentChapterIndex + 1]?.title })}
    >
      <span>{t('nextChapterBtn', { chapterTitle: '' })}</span>
      <HiArrowRight className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}