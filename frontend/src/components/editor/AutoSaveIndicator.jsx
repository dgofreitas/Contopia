import { useTranslation } from 'react-i18next';
import { HiCheck, HiClock, HiExclamation } from 'react-icons/hi';

export default function AutoSaveIndicator({ isSaving, lastSavedAt, isDirty }) {
  const { t } = useTranslation('editor');

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-amber-600" role="status">
        <HiClock className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span>{t('saving')}</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-amber-600" role="status">
        <HiExclamation className="w-4 h-4" aria-hidden="true" />
        <span>{t('unsavedChanges')}</span>
      </div>
    );
  }

  if (lastSavedAt) {
    const time = new Date(lastSavedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return (
      <div className="flex items-center gap-1.5 text-sm text-gray-500" role="status">
        <HiCheck className="w-4 h-4 text-green-500" aria-hidden="true" />
        <span>{t('savedAt', { time })}</span>
      </div>
    );
  }

  return null;
}