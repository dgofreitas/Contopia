import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';
import EdgeToggle from './EdgeToggle';
import EdgePreview from './EdgePreview';
import EdgeColorPicker from './EdgeColorPicker';
import EdgePatternPicker from './EdgePatternPicker';

export default function EdgeCustomizeSection({ title }) {
  const { t } = useTranslation('cover');
  const edgeCustomized = useCoverStore((s) => s.edgeCustomized);
  const edgePattern = useCoverStore((s) => s.edgePattern);
  const getEffectiveEdgeColor = useCoverStore((s) => s.getEffectiveEdgeColor);

  const effectiveEdgeColor = getEffectiveEdgeColor();

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">
        {t('cover.edge.sectionHeading')}
      </h2>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <EdgePreview
            edgeColor={effectiveEdgeColor}
            edgePattern={edgePattern}
            standalone={true}
          />
          <div className="flex-1">
            <EdgeToggle />
          </div>
        </div>

        {edgeCustomized && (
          <>
            <EdgeColorPicker />
            <EdgePatternPicker />
          </>
        )}
      </div>
    </section>
  );
}