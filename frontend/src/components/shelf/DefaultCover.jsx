import React from 'react';
import { useTranslation } from 'react-i18next';

export default function DefaultCover({ title, authorName, spineColor, className }) {
  const { t } = useTranslation('shelf');
  return (
    <div
      className={`w-full h-full rounded-lg flex flex-col items-center justify-center p-4 ${className || ''}`}
      style={{ background: `linear-gradient(135deg, ${spineColor} 0%, ${spineColor}99 100%)` }}
      role="img"
      aria-label={t('coverOverlay.defaultCover', { title })}
    >
      <span className="text-gray-800 font-bold text-lg text-center leading-tight line-clamp-3">
        {title}
      </span>
      {authorName && (
        <span className="text-gray-600 text-sm mt-2">
          {t('coverOverlay.authorBy', { name: authorName })}
        </span>
      )}
    </div>
  );
}
