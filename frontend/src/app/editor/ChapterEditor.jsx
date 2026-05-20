import { useTranslation } from 'react-i18next';
import { HiPencilAlt } from 'react-icons/hi';

export default function ChapterEditor({ chapter }) {
  const { t } = useTranslation('editor');

  if (!chapter) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p className="text-lg">{t('addChapter')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <HiPencilAlt className="w-5 h-5 text-amber-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-800 truncate">
          {chapter.title}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="min-h-[60vh] rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center">
            <p className="text-gray-400 text-sm">
              {t('autoSaveHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}