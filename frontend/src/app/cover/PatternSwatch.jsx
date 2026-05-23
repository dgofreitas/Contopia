import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const PatternSwatch = memo(function PatternSwatch({ pattern, isSelected, onSelect, baseColor }) {
  const { t } = useTranslation('cover');
  const name = t(pattern.nameKey);
  const statusKey = isSelected ? 'cover.aria.patternSwatchSelected' : 'cover.aria.patternSwatchNotSelected';
  const status = t(statusKey);

  return (
    <button
      type="button"
      onClick={() => onSelect(pattern.id)}
      aria-label={t('cover.aria.patternSwatch', { name, status })}
      aria-pressed={isSelected}
      className={`
        relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
        transition-all duration-150 motion-reduce:transition-none
        ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'}
      `}
      style={{ backgroundColor: baseColor || '#6b7280' }}
    >
      {pattern.cssClass && (
        <div
          className={`cover-pattern-overlay ${pattern.cssClass}`}
          aria-hidden="true"
        />
      )}
      {!pattern.cssClass && (
        <div className="absolute inset-0 flex items-center justify-center" aria-label={t('cover.aria.noPatternIndicator')} role="img">
          <span className="text-xs text-gray-600 line-through" aria-hidden="true">/</span>
        </div>
      )}
    </button>
  );
});

export default PatternSwatch;
