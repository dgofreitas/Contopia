import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HiCheck, HiClock, HiExclamation, HiCloudDownload, HiInformationCircle } from 'react-icons/hi';

const ANNOUNCE_DEBOUNCE_MS = 5000;
const SAVED_FADE_MS = 2000;

export default function AutoSaveIndicator({
  saveStatus,
  lastSavedAt,
  isDirty,
  conflictInfo,
  offlineMessage,
  muteAnnouncements = false,
}) {
  const { t } = useTranslation('editor');
  const [fadingOut, setFadingOut] = useState(false);
  const lastAnnounceRef = useRef(0);
  const [srAnnouncement, setSrAnnouncement] = useState('');

  const announceScreenReader = useCallback((message) => {
    const now = Date.now();
    if (now - lastAnnounceRef.current >= ANNOUNCE_DEBOUNCE_MS) {
      lastAnnounceRef.current = now;
      setSrAnnouncement(message);
      setTimeout(() => setSrAnnouncement(''), 1000);
    }
  }, []);

  useEffect(() => {
    if (muteAnnouncements) return;

    switch (saveStatus) {
      case 'saving':
        setFadingOut(false);
        announceScreenReader(t('syncingMessage'));
        break;
      case 'saved': {
        setFadingOut(false);
        announceScreenReader(t('savedExclamation'));
        const fadeTimer = setTimeout(() => setFadingOut(true), SAVED_FADE_MS);
        return () => clearTimeout(fadeTimer);
      }
      case 'offline':
        setFadingOut(false);
        announceScreenReader(t('offlineMessage'));
        break;
      case 'error':
        setFadingOut(false);
        announceScreenReader(t('unableToSync'));
        break;
      case 'conflict':
        setFadingOut(false);
        announceScreenReader(t('localChangesKept'));
        break;
      case 'idle':
        if (!lastSavedAt) setFadingOut(false);
        break;
    }
  }, [saveStatus, announceScreenReader, t, lastSavedAt, muteAnnouncements]);

  if (saveStatus === 'idle' && !lastSavedAt) {
    return <span role="status" aria-live="polite" className="sr-only">{srAnnouncement}</span>;
  }

  const renderIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="autosave-indicator flex items-center gap-1.5 text-sm text-amber-600">
            <HiClock className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>{t('syncingMessage')}</span>
          </div>
        );

      case 'saved':
        return (
          <div
            className={`autosave-indicator autosave-saved flex items-center gap-1.5 text-sm text-green-600 ${fadingOut ? 'autosave-fade-out' : ''}`}
          >
            <HiCheck className="w-4 h-4" aria-hidden="true" />
            <span>{t('savedExclamation')}</span>
          </div>
        );

      case 'offline':
        return (
          <div className="autosave-indicator autosave-offline flex items-center gap-1.5 text-sm text-gray-500">
            <HiCloudDownload className="w-4 h-4" aria-hidden="true" />
            <span>{offlineMessage || t('offlineMessage')}</span>
          </div>
        );

      case 'error':
        return (
          <div className="autosave-indicator flex items-center gap-1.5 text-sm text-red-600">
            <HiExclamation className="w-4 h-4" aria-hidden="true" />
            <span>{t('unableToSync')}</span>
          </div>
        );

      case 'conflict':
        return (
          <div className="autosave-indicator autosave-conflict flex items-center gap-1.5 text-sm text-amber-600">
            <HiInformationCircle className="w-4 h-4" aria-hidden="true" />
            <span>{t('localChangesKept')}</span>
            {conflictInfo && (
              <span className="sr-only">{conflictInfo}</span>
            )}
          </div>
        );

      case 'idle':
      default:
        if (lastSavedAt) {
          const time = new Date(lastSavedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <div className="autosave-indicator flex items-center gap-1.5 text-sm text-gray-400">
              <HiCheck className="w-4 h-4 text-green-500" aria-hidden="true" />
              <span>{t('savedAt', { time })}</span>
            </div>
          );
        }
        return null;
    }
  };

  return (
    <>
      <div className="autosave-indicator-wrapper min-h-[1.5rem]" aria-hidden="true">
        {renderIndicator()}
      </div>
      {!muteAnnouncements && (
        <span role="status" aria-live="polite" className="sr-only">
          {srAnnouncement}
        </span>
      )}
    </>
  );
}