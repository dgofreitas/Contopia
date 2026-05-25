import { useCoverStore } from '../../stores/cover-store';
import CoverSticker from './CoverSticker';

export default function CoverStickerLayer({ textColor }) {
  const stickers = useCoverStore((s) => s.stickers);

  return (
    <>
      <div aria-live="polite" className="sr-only" />
      {stickers.map((sticker) => (
        <CoverSticker
          key={sticker.id}
          sticker={sticker}
          textColor={textColor}
        />
      ))}
    </>
  );
}