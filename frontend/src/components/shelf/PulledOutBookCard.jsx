import React, { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeText } from '../../lib/sanitize';
import { deriveEdgeColor } from '../../lib/edge-utils';
import { deriveSpineColor } from '../../lib/spine-color-utils';
import { getDefaultTextColor } from '../../lib/default-cover-utils';
import { getDefaultCoverColor } from '../../lib/default-cover-utils';
import { COVER_TEMPLATES } from '../../lib/cover-templates';
import '../../styles/cover.css';

function PulledOutBookCover({ book }) {
  const spineColor = book.spineColor || deriveSpineColor({
    coverColor: book.coverColor,
    template: book.templateId,
    bookId: book._id,
  }) || 'rgba(0, 0, 0, 0.2)';

  const edgeColor = deriveEdgeColor({
    edgeColor: book.edgeColor || null,
    spineColor,
    coverColor: book.coverColor,
    template: book.templateId,
    bookId: book._id,
  }) || 'rgba(0, 0, 0, 0.2)';

  const edgePattern = book.edgePattern || 'solid';

  const template = book.templateId
    ? COVER_TEMPLATES.find((t) => t.id === book.templateId)
    : null;

  const coverBg = book.coverColor || (template ? template.background.colors[0] : '#e5e7eb');
  const templateId = template ? template.id : null;
  const patternId = book.coverPattern && book.coverPattern !== 'none' ? book.coverPattern : null;

  const defaultColor = book.default_color || getDefaultCoverColor(book._id);
  const textColor = getDefaultTextColor(template ? coverBg : defaultColor);

  return (
    <div className="pulled-out-cover">
      <div className="pulled-out-cover__book">
        {templateId && (
          <div
            className={`cover-template--${templateId} absolute inset-0`}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: templateId ? coverBg : defaultColor }}
          aria-hidden="true"
        />
        {patternId && (
          <div
            className={`cover-pattern-overlay cover-pattern--${patternId}`}
            aria-hidden="true"
          />
        )}
        <div
          className="pulled-out-cover__spine-strip"
          style={{ backgroundColor: spineColor }}
          aria-hidden="true"
        />
        {!templateId && (
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '8px 8px' }}
            aria-hidden="true"
          />
        )}
        {!templateId && book.title && (
          <span
            className="relative z-10 font-bold text-center leading-tight line-clamp-3 px-2"
            style={{ color: textColor, fontSize: 'clamp(0.5rem, 1.5vw, 0.75rem)' }}
          >
            {sanitizeText(book.title)}
          </span>
        )}
        <div
          className={`pulled-out-cover__edge-strip cover-edge--${edgePattern}`}
          style={{
            '--edge-color': edgeColor,
            '--edge-color-dark': darkenColor(edgeColor),
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function darkenColor(hex) {
  if (!hex || typeof hex !== 'string' || hex.length < 7 || hex.startsWith('rgba')) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 50);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 50);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 50);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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
      <div
        className="w-full h-16 rounded overflow-hidden cursor-pointer"
        onClick={onViewCover}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onViewCover(); }}
        role="button"
        tabIndex={0}
        aria-label={t('coverOverlay.viewCover')}
      >
        <PulledOutBookCover book={book} />
      </div>
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