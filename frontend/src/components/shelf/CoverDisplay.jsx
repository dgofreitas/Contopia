import React, { useState } from 'react';
import { sanitizeText } from '../../lib/sanitize';
import { COVER_TEMPLATES } from '../../lib/cover-templates';
import { deriveSpineColor } from '../../lib/spine-color-utils';
import { deriveEdgeColor } from '../../lib/edge-utils';
import { getDefaultCoverColor } from '../../lib/default-cover-utils';
import { getDefaultTextColor } from '../../lib/default-cover-utils';
import DefaultCover from './DefaultCover';
import { sanitizeImageUrl } from '../../lib/sanitize';

function CoverSkeleton() {
  return (
    <div className="absolute inset-0 animate-pulse bg-gray-200 rounded-lg" aria-hidden="true" />
  );
}

export default function CoverDisplay({ coverUrl: coverUrlProp, title: titleProp, authorName: authorNameProp, spineColor: spineColorProp, className, book }) {
  const [imgState, setImgState] = useState('loading');

  const coverUrl = book?.coverUrl || coverUrlProp;
  const title = book?.title || titleProp;
  const authorName = book?.authorName || authorNameProp;
  const spineColor = book?.spineColor || spineColorProp;

  const hasCustomCover = book?.has_custom_cover === true && coverUrl;
  const templateId = book?.templateId;

  if (hasCustomCover) {
    const sanitizedUrl = sanitizeImageUrl(coverUrl);
    if (!sanitizedUrl) {
      return <DefaultCover book={book} title={title} authorName={authorName} spineColor={spineColor} className={className} />;
    }

    return (
      <div className={`relative ${className || ''}`}>
        {imgState === 'loading' && <CoverSkeleton />}
        <img
          src={sanitizedUrl}
          alt={title}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
          className={`w-full h-full object-cover rounded-lg ${imgState !== 'loaded' ? 'invisible' : ''}`}
        />
        {imgState === 'error' && (
          <DefaultCover book={book} title={title} authorName={authorName} spineColor={spineColor} />
        )}
      </div>
    );
  }

  if (templateId) {
    // Template composition — render template design with title
    const template = COVER_TEMPLATES.find((t) => t.id === templateId);
    const coverBg = book?.coverColor || (template ? template.background.colors[0] : '#e5e7eb');
    const textColor = getDefaultTextColor(coverBg);
    const defaultColor = book?.default_color || getDefaultCoverColor(book?._id);
    const computedSpineColor = spineColor || deriveSpineColor({
      coverColor: book?.coverColor,
      template: templateId,
      bookId: book?._id,
    }) || defaultColor;

    return (
      <div
        className={`w-full h-full rounded-lg flex overflow-hidden ${className || ''}`}
        role="img"
        aria-label={title}
      >
        <div
          style={{ backgroundColor: computedSpineColor }}
          className="w-[8%] shrink-0"
          aria-hidden="true"
        />
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 relative"
          style={{ backgroundColor: coverBg }}
        >
          {templateId && (
            <div
              className={`cover-template--${templateId} absolute inset-0`}
              aria-hidden="true"
            />
          )}
          <span
            className="relative z-10 font-bold text-center leading-tight line-clamp-3"
            style={{
              color: textColor,
              fontSize: 'clamp(0.875rem, 2vw, 1.25rem)',
            }}
          >
            {sanitizeText(title)}
          </span>
        </div>
      </div>
    );
  }

  return <DefaultCover book={book} title={title} authorName={authorName} spineColor={spineColor} className={className} />;
}