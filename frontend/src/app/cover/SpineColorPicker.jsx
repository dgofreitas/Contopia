import { useTranslation } from 'react-i18next';
import { COVER_COLOR_PALETTE } from '../../lib/cover-color-palette';
import ColorSwatch from './ColorSwatch';
import { useCoverStore } from '../../stores/cover-store';

export default function SpineColorPicker() {
  const { t } = useTranslation('cover');
  const spineColor = useCoverStore((s) => s.spineColor);
  const setSpineColor = useCoverStore((s) => s.setSpineColor);

  return (
    <div
      role="group"
      aria-label={t('cover.aria.spineColorPickerGroup')}
      className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 mt-2"
    >
      {COVER_COLOR_PALETTE.map((color) => (
        <div key={color.id} className="flex justify-center">
          <ColorSwatch
            color={color}
            isSelected={spineColor === color.hex}
            onSelect={setSpineColor}
          />
        </div>
      ))}
    </div>
  );
}
