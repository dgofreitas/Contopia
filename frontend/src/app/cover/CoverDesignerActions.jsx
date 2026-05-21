import { useTranslation } from 'react-i18next';

export default function CoverDesignerActions({ onSkip, onCustomize, hasSelection }) {
  const { t } = useTranslation('cover');

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-white">
      <button
        type="button"
        onClick={onSkip}
        aria-label={t('actions.skip')}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500 transition-colors"
      >
        {t('actions.skip')}
      </button>
      <button
        type="button"
        onClick={onCustomize}
        disabled={!hasSelection}
        aria-label={t('actions.customize')}
        className={`
          px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
          ${hasSelection
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {t('actions.customize')}
      </button>
    </div>
  );
}