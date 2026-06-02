/**
 * Contopia — StorageWarningBanner Component (STORY-051)
 *
 * Renders when storage is under pressure (>= 80% quota used).
 * Message: "Your device is almost full. Some books may not be available offline."
 * Dismissible; re-checks on mount.
 *
 * ACs: AC6 (storage warning at 80% quota)
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { checkStorageAndWarn } from '../../services/offline-book-cache';

export default function StorageWarningBanner() {
  const { t } = useTranslation('reader');
  const [showWarning, setShowWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkStorage = async () => {
      try {
        const isPressure = await checkStorageAndWarn();
        if (!cancelled) {
          setShowWarning(isPressure);
        }
      } catch {
        // non-critical
      }
    };

    checkStorage();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!showWarning || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-[55] bg-amber-50 border border-amber-300 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3"
    >
      <span className="text-amber-600 text-lg flex-shrink-0" aria-hidden="true">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">
          {t('storageWarningTitle')}
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          {t('storageWarningMessage')}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md hover:bg-amber-100 transition-colors text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
        aria-label={t('dismissStorageWarning')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}