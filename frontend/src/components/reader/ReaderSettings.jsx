import { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { HiX } from 'react-icons/hi';
import useReaderStore from '../../stores/reader-store';

const FONT_SIZES = ['small', 'medium', 'large'];
const THEMES = ['light', 'sepia', 'dark'];

const FONT_SIZE_CLASSES = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

const THEME_CONFIG = {
  light: { label: 'settingsThemeLight', bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200' },
  sepia: { label: 'settingsThemeSepia', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  dark: { label: 'settingsThemeDark', bg: 'bg-gray-900', text: 'text-gray-100', border: 'border-gray-700' },
};

export default function ReaderSettings() {
  const { t } = useTranslation('reader');
  const prefersReducedMotion = useReducedMotion();
  const isSettingsOpen = useReaderStore((s) => s.isSettingsOpen);
  const closeSettings = useReaderStore((s) => s.closeSettings);
  const fontSize = useReaderStore((s) => s.fontSize);
  const setFontSize = useReaderStore((s) => s.setFontSize);
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSettings();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  useEffect(() => {
    if (isSettingsOpen && panelRef.current) {
      const firstBtn = panelRef.current.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }
  }, [isSettingsOpen]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        closeSettings();
      }
    },
    [closeSettings],
  );

  const slideVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
      };

  const backdropVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <>
          <motion.div
            key="settings-backdrop"
            initial={backdropVariants.initial}
            animate={backdropVariants.animate}
            exit={backdropVariants.exit}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
          <motion.div
            key="settings-panel"
            ref={panelRef}
            role="dialog"
            aria-label={t('settings')}
            initial={slideVariants.initial}
            animate={slideVariants.animate}
            exit={slideVariants.exit}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-w-lg mx-auto p-6 text-gray-900"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{t('settings')}</h2>
              <button
                onClick={closeSettings}
                className="p-2 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-amber-300 focus:outline-none"
                aria-label={t('close')}
              >
                <HiX className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <section className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                {t('settingsFontSize')}
              </h3>
              <div className="flex gap-3">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-center font-medium transition-colors focus:ring-2 focus:ring-amber-300 focus:outline-none ${
                      fontSize === size
                        ? 'border-amber-600 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    } ${FONT_SIZE_CLASSES[size]}`}
                    aria-pressed={fontSize === size}
                  >
                    {t(`settingsFontSize${size.charAt(0).toUpperCase() + size.slice(1)}`)}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                {t('settingsTheme')}
              </h3>
              <div className="flex gap-3">
                {THEMES.map((themeKey) => {
                  const cfg = THEME_CONFIG[themeKey];
                  return (
                    <button
                      key={themeKey}
                      onClick={() => setTheme(themeKey)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-center font-medium transition-colors focus:ring-2 focus:ring-amber-300 focus:outline-none ${cfg.bg} ${cfg.text} ${cfg.border} ${
                        theme === themeKey
                          ? 'border-amber-600 ring-2 ring-amber-300'
                          : 'border-current hover:opacity-80'
                      }`}
                      aria-pressed={theme === themeKey}
                    >
                      {t(cfg.label)}
                    </button>
                  );
                })}
              </div>
            </section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}