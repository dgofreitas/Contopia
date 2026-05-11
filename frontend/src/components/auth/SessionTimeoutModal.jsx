// Contopia — SessionTimeoutModal Component
// Shown at 25m idle; countdown to 30m; "Continue" extends session
import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Spinner } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import useAuth from '../../hooks/useAuth';

export default function SessionTimeoutModal() {
  const { t } = useTranslation();
  const { showTimeoutModal, continueSession, sessionExpiresAt, extendingSession } = useAuth();
  const [countdown, setCountdown] = useState(5);

  // Countdown timer (from sessionExpiresAt)
  useEffect(() => {
    if (!showTimeoutModal || !sessionExpiresAt) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, sessionExpiresAt - Date.now());
      const minutes = Math.ceil(remaining / 60000);
      setCountdown(minutes);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 10000); // update every 10s

    return () => clearInterval(interval);
  }, [showTimeoutModal, sessionExpiresAt]);

  const handleContinue = useCallback(() => {
    continueSession();
  }, [continueSession]);

  if (!showTimeoutModal) return null;

  return (
    <Modal
      show={showTimeoutModal}
      size="md"
      popup
      onClose={() => { /* don't allow closing without action */ }}
      aria-labelledby="session-timeout-title"
      dismissible={false}
    >
      <Modal.Header className="bg-amber-50 border-b-0 pt-6 pb-0 px-6" id="session-timeout-title">
        <h2 className="text-xl font-bold text-gray-800">
          {t('session.timeoutTitle')}
        </h2>
      </Modal.Header>
      <Modal.Body className="bg-amber-50 px-6 py-4 space-y-4">
        <p className="text-base text-gray-700" aria-live="polite">
          {t('session.timeoutMessage')}
        </p>
        <p className="text-lg font-semibold text-amber-600" aria-live="polite" role="timer">
          {t('session.countdown', { minutes: countdown })}
        </p>
      </Modal.Body>
      <Modal.Footer className="bg-amber-50 pb-6 px-6 border-t-0">
        <Button
          onClick={handleContinue}
          disabled={extendingSession}
          className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold text-lg py-2.5 rounded-xl transition-colors"
          size="xl"
          aria-label={t('session.continue')}
          style={{ minHeight: '48px' }}
        >
          {extendingSession ? <Spinner size="sm" className="mr-2" /> : null}
          {t('session.continue')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}