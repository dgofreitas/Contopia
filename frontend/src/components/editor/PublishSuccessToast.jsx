import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';

export default function PublishSuccessToast({ isOpen, onDismiss, bookId }) {
  const { t } = useTranslation('shelf');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-xl shadow-lg border border-amber-200 px-6 py-4 flex items-center gap-4"
      >
        <span className="text-sm font-medium text-gray-800">
          {t('highlightNew')}
        </span>
        <button
          onClick={() => navigate(`/shelf?highlight=${bookId}`)}
          className="text-sm font-semibold text-amber-600 hover:text-amber-700 underline focus:outline-none focus:ring-2 focus:ring-amber-300 rounded"
        >
          {t('goToShelf')}
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-gray-400 hover:text-gray-600 ml-2 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
        >
          ✕
        </button>
      </m.div>
    </div>
  );
}