import React, { useState } from 'react';
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
    return <DefaultCover book={book} title={title} authorName={authorName} spineColor={spineColor} className={className} />;
  }

  return <DefaultCover book={book} title={title} authorName={authorName} spineColor={spineColor} className={className} />;
}