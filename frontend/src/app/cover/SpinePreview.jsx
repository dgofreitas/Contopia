import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getTextColor } from '../../lib/spine-colors';

const SpinePreview = memo(function SpinePreview({
  spineColor,
  title,
  textColor,
  proportional = true,
}) {
  const { t } = useTranslation('cover');
  const resolvedTextColor = textColor || getTextColor(spineColor);

  const stateKey = proportional
    ? 'cover.spine.customState'
    : 'cover.spine.autoState';
  const stateLabel = t(stateKey);
  const ariaLabel = t('cover.aria.spinePreview', { state: stateLabel });

  const style = proportional
    ? { aspectRatio: '2 / 7' }
    : { width: '8%', position: 'absolute', left: 0, top: 0, bottom: 0 };

  return (
    <div
      className={`cover-spine-preview${proportional ? '' : ' cover-spine-preview--inline'}`}
      style={{
        ...style,
        backgroundColor: spineColor || 'rgba(0, 0, 0, 0.2)',
        color: resolvedTextColor,
      }}
      aria-live="polite"
      aria-label={ariaLabel}
      role="img"
    >
      {title && (
        <span
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
      )}
    </div>
  );
});

export default SpinePreview;
