import { useTranslation } from 'react-i18next';

export default function SyncStatusBar({ syncStatus, progress = { synced: 0, total: 0 }, pendingCount = 0 }) {
  const { t } = useTranslation('editor');

  if (syncStatus === 'complete') {
    return null;
  }

  if (syncStatus === 'syncing' && progress.total > 1) {
    const percentage = progress.total > 0 ? (progress.synced / progress.total) * 100 : 0;
    return (
      <div className="sync-status-bar flex items-center gap-3 px-6 py-1.5 bg-orange-50 border-b border-orange-100">
        <div className="flex items-center gap-2 text-sm text-orange-700 flex-1">
          <span>
            {t('syncingProgress', { synced: progress.synced, total: progress.total })}
          </span>
        </div>
        <div className="w-32 h-1.5 bg-orange-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  if (syncStatus === 'offline' && pendingCount > 0) {
    return (
      <div className="sync-status-bar flex items-center gap-2 px-6 py-1.5 bg-gray-50 border-b border-gray-200">
        <span className="text-sm text-gray-600">
          {t('offlineMode')}
        </span>
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-full">
          {pendingCount}
        </span>
        <span className="text-sm text-gray-500">
          {pendingCount === 1
            ? t('chapterPending', { count: pendingCount })
            : t('chaptersPending', { count: pendingCount })}
        </span>
      </div>
    );
  }

  return null;
}