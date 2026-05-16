import { useTranslation } from 'react-i18next';
import { useErrorStore } from '../../stores/error-store';

export default function OfflineBanner() {
  const isOffline = useErrorStore((s) => s.isOffline);
  const { t } = useTranslation('errors');

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] bg-sky-50 text-sky-800 border-b border-sky-200 px-4 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">🌐</span>
        <p className="text-sm font-medium">{t('OFFLINE')}</p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="min-h-[44px] px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
        aria-label={t('TRY_AGAIN')}
      >
        {t('TRY_AGAIN')}
      </button>
    </div>
  );
}