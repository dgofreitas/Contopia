import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import { useEffect, useRef, useMemo } from 'react';
import { useReducedMotionConfig } from '../../lib/animation/reduced-motion.js';

const WARNING_CODES = new Set(['RATE_LIMITED', 'OFFLINE', 'BACK_ONLINE']);

function getStyles(code) {
  if (WARNING_CODES.has(code)) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  return 'bg-rose-50 text-rose-800 border-rose-200';
}

function getIcon(code) {
  if (WARNING_CODES.has(code)) return '\u26A0\uFE0F';
  return '\uD83D\uDD34';
}

export default function ErrorToast({ id, code, message, onDismiss }) {
  const { t } = useTranslation('errors');
  const { prefersReducedMotion } = useReducedMotionConfig();
  const dismissRef = useRef(null);

  const displayMessage = message || t(code);

  useEffect(() => {
    dismissRef.current?.focus();
  }, []);

  const styleClass = useMemo(() => getStyles(code), [code]);
  const icon = useMemo(() => getIcon(code), [code]);

  if (prefersReducedMotion) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${styleClass}`}
      >
        <span className="text-xl mt-0.5" aria-hidden="true">{icon}</span>
        <p className="flex-1 text-sm font-medium leading-snug">{displayMessage}</p>
        <button
          ref={dismissRef}
          onClick={() => onDismiss(id)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-sm font-semibold hover:opacity-70 transition-opacity"
          aria-label={t('GOT_IT')}
        >
          {t('GOT_IT')}
        </button>
      </div>
    );
  }

  return (
    <m.div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${styleClass}`}
    >
      <span className="text-xl mt-0.5" aria-hidden="true">{icon}</span>
      <p className="flex-1 text-sm font-medium leading-snug">{displayMessage}</p>
      <button
        ref={dismissRef}
        onClick={() => onDismiss(id)}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-sm font-semibold hover:opacity-70 transition-opacity"
        aria-label={t('GOT_IT')}
      >
        {t('GOT_IT')}
      </button>
    </m.div>
  );
}