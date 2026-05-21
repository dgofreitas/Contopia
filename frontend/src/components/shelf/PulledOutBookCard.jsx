import React, { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeText } from '../../lib/sanitize';

function PulledOutBookCard({ book, onRead, onEdit, onDesignCover, onViewCover, onPlaceBack }) {
  const { t } = useTranslation('shelf');
  const title = sanitizeText(book.title);
  const summary = book.summary ? sanitizeText(book.summary) : '';
  const excerpt = summary.length > 120 ? summary.slice(0, 120) + '…' : summary;
  const longPressTimer = useRef(null);

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      onEdit();
    }, 300);
  }, [onEdit]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div
      role="group"
      aria-label={t('pullOut.ariaActions')}
      className="bg-white rounded-xl shadow-lg p-4 w-64 space-y-3"
      style={{ touchAction: 'manipulation' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <h3 className="text-sm font-bold text-gray-800 truncate">{title}</h3>
      <button
        onClick={onViewCover}
        aria-label={t('coverOverlay.viewCover')}
        className="w-full h-16 rounded bg-gray-200 hover:bg-gray-300 transition-colors focus:ring-2 focus:ring-amber-300 focus:outline-none"
      >
        <span className="text-xs text-gray-400">{t('coverOverlay.viewCover')}</span>
      </button>
      {excerpt && (
        <p className="text-xs text-gray-500 leading-relaxed">{excerpt}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onViewCover}
          aria-label={t('coverOverlay.viewCover')}
          className="flex-1 text-xs font-semibold py-1.5 px-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:outline-none"
        >
          {t('coverOverlay.viewCover')}
        </button>
        <button
          onClick={onRead}
          aria-label={t('pullOut.read')}
          className="flex-1 text-xs font-semibold py-1.5 px-2 rounded bg-amber-600 text-white hover:bg-amber-700 focus:ring-2 focus:ring-amber-300 focus:outline-none"
        >
          {t('pullOut.read')}
        </button>
        <button
          onClick={onEdit}
          aria-label={t('pullOut.edit')}
          className="flex-1 text-xs font-semibold py-1.5 px-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:outline-none"
        >
          {t('pullOut.edit')}
        </button>
        <button
          onClick={onDesignCover}
          aria-label={t('pullOut.designCover')}
          className="flex-1 text-xs font-semibold py-1.5 px-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:outline-none"
        >
          {t('pullOut.designCover')}
        </button>
      </div>
      <button
        onClick={onPlaceBack}
        aria-label={t('placeBack')}
        className="w-full text-xs font-semibold py-1.5 px-2 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 focus:ring-2 focus:ring-amber-300 focus:outline-none"
      >
        {t('placeBack')}
      </button>
    </div>
  );
}

export default React.memo(PulledOutBookCard);