import React, { useState } from 'react';
import DefaultCover from './DefaultCover';
import { sanitizeImageUrl } from '../../lib/sanitize';

function CoverSkeleton() {
  return (
    <div className="absolute inset-0 animate-pulse bg-gray-200 rounded-lg" aria-hidden="true" />
  );
}

export default function CoverDisplay({ coverUrl, title, authorName, spineColor, className }) {
  const [imgState, setImgState] = useState('loading');

  if (!coverUrl) {
    return <DefaultCover title={title} authorName={authorName} spineColor={spineColor} className={className} />;
  }

  const sanitizedUrl = sanitizeImageUrl(coverUrl);
  if (!sanitizedUrl) {
    return <DefaultCover title={title} authorName={authorName} spineColor={spineColor} className={className} />;
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
        <DefaultCover title={title} authorName={authorName} spineColor={spineColor} />
      )}
    </div>
  );
}
