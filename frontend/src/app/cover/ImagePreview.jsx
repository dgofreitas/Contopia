import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ImagePreview({ thumbnailUrl, fullUrl, onRemove }) {
  const { t } = useTranslation('cover');
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
          ?
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('cover.upload.removeButton')}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          {t('cover.upload.removeButton')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="w-16 h-20 rounded overflow-hidden bg-gray-200 flex-shrink-0">
        {!loaded && (
          <div className="w-full h-full animate-pulse bg-gray-300" />
        )}
        <img
          src={thumbnailUrl || fullUrl}
          alt={t('cover.upload.previewAlt')}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-cover ${loaded ? 'block' : 'hidden'}`}
          loading="lazy"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('cover.upload.removeButton')}
        className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        {t('cover.upload.removeButton')}
      </button>
    </div>
  );
}