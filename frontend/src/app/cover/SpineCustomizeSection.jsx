import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';
import SpineToggle from './SpineToggle';
import SpinePreview from './SpinePreview';
import SpineColorPicker from './SpineColorPicker';

export default function SpineCustomizeSection({ title }) {
  const { t } = useTranslation('cover');
  const spineCustomized = useCoverStore((s) => s.spineCustomized);
  const spineColor = useCoverStore((s) => s.spineColor);
  const baseColor = useCoverStore((s) => s.baseColor);
  const getEffectiveSpineColor = useCoverStore((s) => s.getEffectiveSpineColor);

  const effectiveSpineColor = spineCustomized
    ? spineColor || baseColor
    : getEffectiveSpineColor();

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">
        {t('cover.spine.sectionHeading')}
      </h2>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <SpinePreview
            spineColor={effectiveSpineColor}
            title={title}
            proportional={true}
          />
          <div className="flex-1">
            <SpineToggle />
          </div>
        </div>

        {spineCustomized && <SpineColorPicker />}
      </div>
    </section>
  );
}
