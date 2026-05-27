import React from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeText } from '../../lib/sanitize';
import { getDefaultCoverColor } from '../../lib/default-cover-utils';
import { getDefaultTextColor } from '../../lib/default-cover-utils';
import { deriveDefaultEdgeColor } from '../../lib/default-cover-utils';
import { spineColorFromId } from '../../lib/spine-colors';
import '../../styles/cover.css';

export default function DefaultCover({ book, title: titleProp, authorName: authorNameProp, spineColor: spineColorProp, className }) {
  const { t } = useTranslation('shelf');

  const bookTitle = book?.title || titleProp || '';
  const bookAuthor = book?.authorName || authorNameProp || '';
  const title = sanitizeText(bookTitle);
  const authorName = bookAuthor ? sanitizeText(bookAuthor) : '';

  const defaultColor = book?.default_color || getDefaultCoverColor(book?._id);
  const spineColor = spineColorProp || book?.spineColor || spineColorFromId(book?._id) || defaultColor;
  const textColor = getDefaultTextColor(defaultColor);
  const edgeColor = deriveDefaultEdgeColor(spineColor);

  return (
    <div
      className={`w-full h-full rounded-lg flex overflow-hidden ${className || ''}`}
      role="img"
      aria-label={t('coverOverlay.defaultCover', { title: title || t('coverOverlay.untitled') })}
    >
      <div
        style={{ backgroundColor: spineColor }}
        className="w-[8%] shrink-0"
        aria-hidden="true"
      />
      <div
        className="flex-1 flex flex-col items-center justify-center p-4 relative"
        style={{ backgroundColor: defaultColor }}
      >
        <div
          className="default-cover-texture absolute inset-0"
          aria-hidden="true"
        />
        <span
          className="relative z-10 font-bold text-center leading-tight line-clamp-3"
          style={{
            color: textColor,
            fontSize: 'clamp(0.875rem, 2vw, 1.25rem)',
          }}
        >
          {title}
        </span>
        {authorName && (
          <span
            className="relative z-10 text-sm mt-2"
            style={{ color: `${textColor}99` }}
          >
            {t('coverOverlay.authorBy', { name: authorName })}
          </span>
        )}
      </div>
      <div
        className="w-[4%] shrink-0"
        style={{ backgroundColor: edgeColor }}
        aria-hidden="true"
      />
    </div>
  );
}