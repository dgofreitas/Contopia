import { useTranslation } from 'react-i18next';
import { COVER_COLOR_PALETTE } from '../../lib/cover-color-palette';
import ColorSwatch from './ColorSwatch';

export default function ColorPickerPanel({ selectedColor, onSelectColor }) {
  const { t } = useTranslation('cover');

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">
        {t('cover.customize.colorPickerHeading')}
      </h2>
      <div
        role="group"
        aria-label={t('cover.aria.colorPickerGroup')}
        className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3"
      >
        {COVER_COLOR_PALETTE.map((color) => (
          <div key={color.id} className="flex justify-center">
            <ColorSwatch
              color={color}
              isSelected={selectedColor === color.hex}
              onSelect={onSelectColor}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
