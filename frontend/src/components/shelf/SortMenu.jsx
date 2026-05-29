import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HiSortAscending, HiClock, HiHeart } from 'react-icons/hi';

const SORT_OPTIONS = [
  { mode: 'alphabetical', icon: HiSortAscending },
  { mode: 'favorites', icon: HiHeart, disabled: true },
  { mode: 'recently-read', icon: HiClock },
];

export default function SortMenu({ currentSort, onSortChange, isOpen, onClose }) {
  const { t } = useTranslation('shelf');
  const menuRef = useRef(null);
  const firstItemRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (firstItemRef.current) {
      firstItemRef.current.focus();
    }

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }

    function handleEscape(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleKeyDown = useCallback(
    (e, index) => {
      const enabledOptions = SORT_OPTIONS.filter((o) => !o.disabled);
      const enabledIndex = enabledOptions.findIndex((o) => o.mode === SORT_OPTIONS[index].mode);
      const enabledCount = enabledOptions.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (enabledIndex + 1) % enabledCount;
        const nextMode = enabledOptions[next].mode;
        const nextIndex = SORT_OPTIONS.findIndex((o) => o.mode === nextMode);
        const btn = menuRef.current?.querySelector(`[data-sort-mode="${nextMode}"]`);
        btn?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (enabledIndex - 1 + enabledCount) % enabledCount;
        const prevMode = enabledOptions[prev].mode;
        const btn = menuRef.current?.querySelector(`[data-sort-mode="${prevMode}"]`);
        btn?.focus();
      } else if (e.key === 'Tab') {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('sort.menuLabel')}
      className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg ring-1 ring-black/5 z-50 py-2"
    >
      {SORT_OPTIONS.map((option, index) => {
        const Icon = option.icon;
        const isActive = currentSort === option.mode;
        const labelKey =
          option.mode === 'alphabetical'
            ? 'sort.alphabetical'
            : option.mode === 'favorites'
              ? 'sort.favorites'
              : 'sort.recentlyRead';
        const label = t(labelKey);

        return (
          <button
            key={option.mode}
            ref={index === 0 ? firstItemRef : undefined}
            data-sort-mode={option.mode}
            role="menuitemradio"
            aria-checked={isActive}
            aria-label={t('sort.optionAria', { mode: label })}
            disabled={option.disabled}
            onClick={() => {
              if (!option.disabled) {
                onSortChange(option.mode);
                onClose();
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`
              flex items-center gap-3 w-full px-4 py-3 text-left min-h-[48px] min-w-[48px]
              transition-colors duration-150
              ${
                option.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : isActive
                    ? 'bg-amber-50 text-amber-700 font-semibold'
                    : 'text-gray-700 hover:bg-amber-50 hover:text-amber-700'
              }
            `}
            title={option.disabled ? t('sort.favoritesDisabled') : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {option.disabled && (
              <span className="text-xs text-gray-300 ml-2 italic">
                {t('sort.favoritesDisabled')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}