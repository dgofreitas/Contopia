import { useTranslation } from 'react-i18next';
import { COVER_COLOR_PALETTE } from '../../lib/cover-color-palette';
import ColorSwatch from './ColorSwatch';
import { useCoverStore } from '../../stores/cover-store';

export default function EdgeColorPicker() {
  const { t } = useTranslation('cover');
  const edgeColor = useCoverStore((s) => s.edgeColor);
  const setEdgeColor = useCoverStore((s) => s.setEdgeColor);

  return (
    <div
      role="group"
      aria-label={t('cover.aria.edgeColorPickerGroup')}
      className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 mt-2"
    >
      {COVER_COLOR_PALETTE.map((color) => (
        <div key={color.id} className="flex justify-center">
          <ColorSwatch
            color={color}
            isSelected={edgeColor === color.hex}
            onSelect={setEdgeColor}
          />
        </div>
      ))}
    </div>
  );
}