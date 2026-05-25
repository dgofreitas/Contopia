import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const ColorSwatch = memo(function ColorSwatch({ color, isSelected, onSelect }) {
  const { t } = useTranslation('cover');
  const name = t(color.nameKey);
  const statusKey = isSelected ? 'cover.aria.colorSwatchSelected' : 'cover.aria.colorSwatchNotSelected';
  const status = t(statusKey);

  return (
    <button
      type="button"
      onClick={() => onSelect(color.hex)}
      aria-label={t('cover.aria.colorSwatch', { name, status })}
      aria-pressed={isSelected}
      className={`
        w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
        transition-transform duration-150 motion-reduce:transition-none
        ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 border-white' : 'border-gray-300 hover:scale-105'}
      `}
      style={{ backgroundColor: color.hex }}
    />
  );
});

export default ColorSwatch;
