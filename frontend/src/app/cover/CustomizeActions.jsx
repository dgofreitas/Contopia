import { useTranslation } from 'react-i18next';

export default function CustomizeActions({ onBack, onSave, isSaving }) {
  const { t } = useTranslation('cover');

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-white">
      <button
        type="button"
        onClick={onBack}
        aria-label={t('cover.customize.back')}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500 transition-colors"
      >
        {t('cover.customize.back')}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        aria-label={t('cover.customize.save')}
        className={`
          px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
          ${isSaving
            ? 'bg-blue-400 text-white cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {isSaving ? '...' : t('cover.customize.save')}
      </button>
    </div>
  );
}
