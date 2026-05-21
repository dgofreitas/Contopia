import { useTranslation } from 'react-i18next';
import '../../styles/cover.css';

export default function CoverPreview({ book, template }) {
  const { t } = useTranslation('cover');

  const title = book?.title || t('preview.title');
  const author = book?.author?.name || t('preview.author');
  const textColor = template?.textColor || '#6b7280';
  const accentColor = template?.accentColor || '#9ca3af';

  return (
    <div aria-live="polite" aria-atomic="true" className="flex justify-center">
      <div className="relative w-56 sm:w-64 md:w-72 lg:w-80 aspect-[3/4] rounded-lg shadow-lg overflow-hidden">
        {template ? (
          <>
            <div
              className={`cover-template--${template.id} absolute inset-0`}
              aria-hidden="true"
            />
            <div className="cover-spine" aria-hidden="true" />
            <div className="cover-preview-text absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div
                className="w-12 h-0.5 rounded-full mb-4"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
              <h2
                className="text-xl sm:text-2xl font-bold leading-tight mb-2"
                style={{ color: textColor }}
              >
                {title}
              </h2>
              <p
                className="text-sm opacity-80"
                style={{ color: textColor }}
              >
                {author}
              </p>
              <div
                className="w-12 h-0.5 rounded-full mt-4"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gray-200 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 mb-3 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center" aria-hidden="true">
              <span className="text-gray-400 text-lg">+</span>
            </div>
            <p className="text-gray-500 text-sm">{t('preview.chooseTemplate')}</p>
          </div>
        )}
      </div>
    </div>
  );
}