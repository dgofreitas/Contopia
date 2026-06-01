import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HiCloud, HiCheck, HiCloudDownload, HiRefresh, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi';

const COMPLETE_FADE_MS = 3000;
const CONFLICT_FADE_MS = 5000;

export default function OfflineIndicator({
  syncStatus = 'idle',
  isOnline = true,
  syncProgress: _syncProgress = { synced: 0, total: 0 },
  onDismissError,
}) {
  const { t } = useTranslation('editor');
  const [fadingOut, setFadingOut] = useState(false);
  const [visibleStatus, setVisibleStatus] = useState(syncStatus);
  const fadeTimerRef = useRef(null);

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearFadeTimer();
    setFadingOut(false);

    if (syncStatus === 'complete' || syncStatus === 'online-idle') {
      setVisibleStatus(syncStatus);
      fadeTimerRef.current = setTimeout(() => {
        setFadingOut(true);
        setTimeout(() => {
          setVisibleStatus('idle');
          setFadingOut(false);
        }, 300);
      }, COMPLETE_FADE_MS);
    } else if (syncStatus === 'conflict-resolved') {
      setVisibleStatus('conflict-resolved');
      fadeTimerRef.current = setTimeout(() => {
        setFadingOut(true);
        setTimeout(() => {
          setVisibleStatus('idle');
          setFadingOut(false);
        }, 300);
      }, CONFLICT_FADE_MS);
    } else {
      setVisibleStatus(syncStatus);
    }

    return clearFadeTimer;
  }, [syncStatus, clearFadeTimer]);

  const getStateConfig = () => {
    if (!isOnline) {
      return {
        icon: <HiCloudDownload className="w-4 h-4" aria-hidden="true" />,
        colorClass: 'text-gray-500',
        ariaLabel: t('savingLocally'),
        stateClass: 'offline-indicator-offline',
      };
    }

    switch (visibleStatus) {
      case 'offline':
        return {
          icon: <HiCloudDownload className="w-4 h-4" aria-hidden="true" />,
          colorClass: 'text-gray-500',
          ariaLabel: t('savingLocally'),
          stateClass: 'offline-indicator-offline',
        };
      case 'syncing':
        return {
          icon: <HiRefresh className="w-4 h-4 animate-spin" aria-hidden="true" />,
          colorClass: 'text-orange-500',
          ariaLabel: t('syncingChanges'),
          stateClass: 'offline-indicator-syncing',
        };
      case 'complete':
      case 'online-idle':
        return {
          icon: (
            <span className="relative inline-flex items-center justify-center">
              <HiCloud className="w-4 h-4" aria-hidden="true" />
              <HiCheck className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-green-600" aria-hidden="true" />
            </span>
          ),
          colorClass: 'text-green-600',
          ariaLabel: t('changesSynced'),
          stateClass: 'offline-indicator-complete',
        };
      case 'error':
        return {
          icon: <HiExclamationCircle className="w-4 h-4" aria-hidden="true" />,
          colorClass: 'text-red-600',
          ariaLabel: t('unableToSync'),
          stateClass: 'offline-indicator-error',
        };
      case 'conflict-resolved':
        return {
          icon: <HiCheckCircle className="w-4 h-4" aria-hidden="true" />,
          colorClass: 'text-green-600',
          ariaLabel: t('syncedLocalKept'),
          stateClass: 'offline-indicator-complete',
        };
      case 'idle':
      default:
        return {
          icon: (
            <span className="relative inline-flex items-center justify-center">
              <HiCloud className="w-4 h-4" aria-hidden="true" />
              <HiCheck className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-green-600" aria-hidden="true" />
            </span>
          ),
          colorClass: 'text-green-600',
          ariaLabel: t('allChangesSaved'),
          stateClass: 'offline-indicator-idle',
        };
    }
  };

  const { icon, colorClass, ariaLabel, stateClass } = getStateConfig();

  const handleClick = () => {
    if (visibleStatus === 'error' && onDismissError) {
      onDismissError();
    }
  };

  const transitionClass = fadingOut ? 'offline-indicator-fade-out' : 'offline-indicator-fade-in';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={`offline-indicator ${stateClass} ${colorClass} ${transitionClass} flex items-center gap-1.5 text-sm cursor-default select-none`}
      onClick={handleClick}
    >
      {icon}
      <span>{ariaLabel}</span>
    </div>
  );
}