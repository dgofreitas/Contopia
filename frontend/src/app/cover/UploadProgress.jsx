import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const PROGRESS_MILESTONES = [0, 25, 50, 75, 100];

function getAnnouncementText(progress, t) {
  if (progress >= 100) {
    return t('cover.upload.completeAnnouncement');
  }
  return t('cover.upload.progressAnnouncement', { percent: progress });
}

function shouldAnnounce(currentProgress, previousProgress) {
  for (const milestone of PROGRESS_MILESTONES) {
    if (previousProgress < milestone && currentProgress >= milestone) {
      return true;
    }
  }
  return false;
}

export default function UploadProgress({ progress, onCancel }) {
  const { t } = useTranslation('cover');
  const [announcedProgress, setAnnouncedProgress] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (shouldAnnounce(progress, announcedProgress)) {
      setAnnouncedProgress(progress);
      setAnnouncement(getAnnouncementText(progress, t));
    }
  }, [progress, announcedProgress, t]);

  const isSuccess = progress >= 100;

  return (
    <div className="space-y-2">
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('cover.upload.buttonLabel')}
        className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isSuccess ? 'bg-green-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{progress}%</span>
        {!isSuccess && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-red-500 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
          >
            {t('cover.upload.cancel', 'Cancel')}
          </button>
        )}
      </div>
    </div>
  );
}