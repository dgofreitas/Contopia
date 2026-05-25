import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { EDGE_PATTERNS } from '../../lib/edge-patterns';
import { useCoverStore } from '../../stores/cover-store';

function EdgePatternSwatch({ pattern, isSelected, onSelect, baseColor }) {
  const { t } = useTranslation('cover');
  const name = t(pattern.nameKey);
  const cssClass = pattern.cssClass || 'cover-edge--solid';

  const style = {
    '--edge-color': baseColor || 'rgba(0, 0, 0, 0.2)',
    '--edge-color-dark': baseColor
      ? darkenColor(baseColor)
      : 'rgba(0, 0, 0, 0.4)',
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(pattern.id)}
      aria-label={name}
      aria-pressed={isSelected}
      className={`
        cover-edge-swatch ${cssClass}
        ${isSelected ? 'cover-edge-swatch--selected' : ''}
      `}
      style={style}
    />
  );
}

function darkenColor(hex) {
  if (!hex || typeof hex !== 'string' || hex.length < 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 50);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 50);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 50);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const EdgePatternSwatchMemo = memo(EdgePatternSwatch);

export default function EdgePatternPicker() {
  const { t } = useTranslation('cover');
  const edgePattern = useCoverStore((s) => s.edgePattern);
  const setEdgePattern = useCoverStore((s) => s.setEdgePattern);
  const getEffectiveEdgeColor = useCoverStore((s) => s.getEffectiveEdgeColor);
  const effectiveColor = getEffectiveEdgeColor();

  return (
    <div>
      <h3 className="text-xs font-medium text-gray-600 mb-2">
        {t('cover.edge.patternHeading')}
      </h3>
      <div
        role="radiogroup"
        aria-label={t('cover.aria.edgePatternPickerGroup')}
        className="flex gap-3 flex-wrap"
      >
        {EDGE_PATTERNS.map((pattern) => (
          <div key={pattern.id} className="flex flex-col items-center gap-1">
            <EdgePatternSwatchMemo
              pattern={pattern}
              isSelected={edgePattern === pattern.id}
              onSelect={setEdgePattern}
              baseColor={effectiveColor}
            />
            <span className="text-[10px] text-gray-500">
              {t(pattern.nameKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}