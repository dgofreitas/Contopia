import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import { HiSortAscending, HiClock, HiHeart } from 'react-icons/hi';
import SortMenu from './SortMenu';
import useSortPreference from '../../hooks/useSortPreference';

const SORT_ICONS = {
  alphabetical: HiSortAscending,
  'recently-read': HiClock,
  favorites: HiHeart,
};

export default function SortButton() {
  const { t } = useTranslation('shelf');
  const [isOpen, setIsOpen] = useState(false);
  const { sortMode, setSortMode } = useSortPreference();

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSortChange = useCallback(
    (mode) => {
      setSortMode(mode);
    },
    [setSortMode]
  );

  const CurrentIcon = SORT_ICONS[sortMode] || HiClock;

  return (
    <div className="relative">
      <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
        <button
          onClick={handleToggle}
          aria-label={t('sort.buttonLabel')}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold py-2 px-4 rounded-xl min-h-[48px] min-w-[48px] focus:ring-2 focus:outline-none transition-colors duration-150"
        >
          <CurrentIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </m.div>

      <SortMenu
        currentSort={sortMode}
        onSortChange={handleSortChange}
        isOpen={isOpen}
        onClose={handleClose}
      />
    </div>
  );
}