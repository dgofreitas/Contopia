import { memo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';
import { getStickerBySvgId, getStickerName } from '../../lib/sticker-library.jsx';

const CoverSticker = memo(function CoverSticker({ sticker, textColor }) {
  const { t } = useTranslation('cover');
  const { id, svgId, x, y, scale } = sticker;
  const selectedStickerId = useCoverStore((s) => s.selectedStickerId);
  const moveSticker = useCoverStore((s) => s.moveSticker);
  const removeSticker = useCoverStore((s) => s.removeSticker);
  const selectSticker = useCoverStore((s) => s.selectSticker);
  const deselectSticker = useCoverStore((s) => s.deselectSticker);

  const isSelected = selectedStickerId === id;
  const stickerDef = getStickerBySvgId(svgId);
  const SvgComponent = stickerDef?.component;

  const dragRef = useRef(null);
  const layerRef = useRef(null);

  const name = getStickerName(svgId, t);
  const ariaLabel = t('cover.aria.stickerAriaLabel', { name, x: Math.round(x), y: Math.round(y) });

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    selectSticker(id);

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: x,
      origY: y,
    };

    const layer = target.closest('[data-sticker-layer]');
    layerRef.current = layer;
  }, [id, x, y, selectSticker]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current || !layerRef.current) return;

    const layerRect = layerRef.current.getBoundingClientRect();
    if (!layerRect.width || !layerRect.height) return;

    const newX = ((e.clientX - layerRect.left) / layerRect.width) * 100;
    const newY = ((e.clientY - layerRect.top) / layerRect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));

    moveSticker(id, clampedX, clampedY);
  }, [id, moveSticker]);

  const handlePointerUp = useCallback((e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }, []);

  const handleKeyDown = useCallback((e) => {
    const step = e.shiftKey ? 10 : 2;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveSticker(id, Math.max(0, x - step), y);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveSticker(id, Math.min(100, x + step), y);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveSticker(id, x, Math.max(0, y - step));
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveSticker(id, x, Math.min(100, y + step));
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        removeSticker(id);
        break;
      case 'Escape':
        deselectSticker();
        break;
    }
  }, [id, x, y, moveSticker, removeSticker, deselectSticker]);

  const handleDoubleClick = useCallback(() => {
    removeSticker(id);
  }, [id, removeSticker]);

  if (!SvgComponent) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      className={`absolute cover-sticker ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        touchAction: 'none',
        cursor: 'grab',
        outline: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
      onFocus={() => selectSticker(id)}
    >
      <span className="block w-10 h-10 sm:w-12 sm:h-12" style={{ color: textColor }}>
        <SvgComponent />
      </span>
    </div>
  );
});

export default CoverSticker;