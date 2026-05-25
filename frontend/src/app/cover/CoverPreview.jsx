import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';
import SpinePreview from './SpinePreview';
import CoverStickerLayer from './CoverStickerLayer';
import CoverTitleEdit from './CoverTitleEdit';
import CoverAuthorName from './CoverAuthorName';
import '../../styles/cover.css';

export default function CoverPreview({ book, template }) {
  const { t } = useTranslation('cover');
  const baseColor = useCoverStore((s) => s.baseColor);
  const patternId = useCoverStore((s) => s.patternId);
  const getEffectiveSpineColor = useCoverStore((s) => s.getEffectiveSpineColor);

  const title = book?.title || t('preview.title');
  const author = book?.author?.name || t('preview.author');
  const textColor = template?.textColor || '#6b7280';
  const accentColor = template?.accentColor || '#9ca3af';
  const effectiveSpineColor = getEffectiveSpineColor();

  const coverStyle = baseColor ? { '--cover-bg': baseColor } : undefined;
  const activePattern = patternId && patternId !== 'none' ? patternId : null;

  return (
    <div aria-live="polite" aria-atomic="true" className="flex justify-center">
      <div
        className="relative w-56 sm:w-64 md:w-72 lg:w-80 aspect-[3/4] rounded-lg shadow-lg overflow-hidden"
        style={coverStyle}
      >
        {template ? (
          <>
            <div
              className={`cover-template--${template.id} absolute inset-0`}
              aria-hidden="true"
            />
            {baseColor && (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: baseColor }}
                aria-hidden="true"
              />
            )}
            {activePattern && (
              <div
                className={`cover-pattern-overlay cover-pattern--${activePattern}`}
                aria-hidden="true"
              />
            )}
            <div data-sticker-layer className="absolute inset-0 z-10" style={{ touchAction: 'none' }}>
              <CoverStickerLayer textColor={textColor} />
            </div>
            <div aria-hidden="true">
              <SpinePreview
                spineColor={effectiveSpineColor}
                title={title}
                proportional={false}
              />
            </div>
            <div className="cover-preview-text absolute inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ zIndex: 20 }}>
              <div
                className="w-12 h-0.5 rounded-full mb-4"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
              <CoverTitleEdit bookTitle={title} textColor={textColor} />
              <CoverAuthorName authorName={author} textColor={textColor} />
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
