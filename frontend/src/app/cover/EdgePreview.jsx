import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { isLightColor } from '../../lib/spine-colors';
import { EDGE_PATTERNS } from '../../lib/edge-patterns';

const EdgePreview = memo(function EdgePreview({
  edgeColor,
  edgePattern,
  standalone = true,
}) {
  const { t } = useTranslation('cover');
  const pattern = EDGE_PATTERNS.find((p) => p.id === edgePattern) || EDGE_PATTERNS[0];
  const cssClass = pattern.cssClass || 'cover-edge--solid';
  const isLight = edgeColor ? isLightColor(edgeColor) : false;
  const patternName = t(pattern.nameKey);

  const stateKey = standalone
    ? 'cover.edge.customState'
    : 'cover.edge.autoState';
  const stateLabel = t(stateKey);

  const style = standalone
    ? {
        '--edge-color': edgeColor || 'rgba(0, 0, 0, 0.2)',
        '--edge-color-dark': edgeColor
          ? darkenColor(edgeColor)
          : 'rgba(0, 0, 0, 0.4)',
        minHeight: '80px',
      }
    : {
        '--edge-color': edgeColor || 'rgba(0, 0, 0, 0.2)',
        '--edge-color-dark': edgeColor
          ? darkenColor(edgeColor)
          : 'rgba(0, 0, 0, 0.4)',
      };

  const className = standalone
    ? `cover-edge-preview ${cssClass}`
    : `cover-edge ${cssClass}`;

  const ariaLabel = t('cover.aria.edgePreview', {
    state: stateLabel,
    pattern: patternName,
  });

  return (
    <div
      className={className}
      style={style}
      aria-live={standalone ? 'polite' : undefined}
      aria-hidden={!standalone ? 'true' : undefined}
      aria-label={standalone ? ariaLabel : undefined}
      role={standalone ? 'img' : undefined}
    />
  );
});

function darkenColor(hex) {
  if (!hex || typeof hex !== 'string' || hex.length < 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 50);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 50);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 50);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default EdgePreview;