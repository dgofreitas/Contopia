import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getStickerBySvgId, getStickerName } from '../../lib/sticker-library.jsx';

const StickerButton = memo(function StickerButton({ svgId, onSelect, disabled }) {
  const { t } = useTranslation('cover');
  const sticker = getStickerBySvgId(svgId);
  const name = getStickerName(svgId, t);

  const handleClick = useCallback(() => {
    if (!disabled) onSelect(svgId);
  }, [svgId, onSelect, disabled]);

  if (!sticker) return null;
  const SvgComponent = sticker.component;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={name}
      className={`
        w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center
        rounded-lg border border-gray-200 bg-white
        hover:border-blue-400 hover:bg-blue-50
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500
        transition-colors duration-150 motion-reduce:transition-none
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white
      `}
      style={{ color: 'currentColor' }}
    >
      <span className="w-8 h-8 sm:w-10 sm:h-10">
        <SvgComponent />
      </span>
    </button>
  );
});

export default StickerButton;