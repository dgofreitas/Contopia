import React, { useState } from 'react';
import { m } from 'framer-motion';
import { useReducedMotion } from '../../lib/animation-engine/index.js';
import { useTranslation } from 'react-i18next';

export default function FavoriteToggle({ isFavorited, onToggle }) {
  const { t } = useTranslation('shelf');
  const prefersReducedMotion = useReducedMotion();
  const [animKey, setAnimKey] = useState(0);

  const label = isFavorited ? t('favorite.remove') : t('favorite.add');

  function handleClick() {
    setAnimKey((k) => k + 1);
    onToggle();
  }

  return (
    <m.button
      key={animKey}
      type="button"
      role="checkbox"
      aria-checked={String(isFavorited)}
      aria-label={label}
      title={label}
      onClick={handleClick}
      className="flex items-center justify-center min-w-[48px] min-h-[48px] rounded-full focus:ring-2 focus:ring-amber-300 focus:outline-none"
      initial={false}
      animate={{ scale: 1 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 500, damping: 15 }
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="w-7 h-7 transition-colors duration-150"
        fill={isFavorited ? '#FF6B6B' : 'none'}
        stroke={isFavorited ? '#FF6B6B' : '#9CA3AF'}
        strokeWidth={isFavorited ? 0 : 2}
        aria-hidden="true"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </m.button>
  );
}