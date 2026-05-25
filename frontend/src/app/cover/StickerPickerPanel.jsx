import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { STICKER_CATEGORIES, getStickersByCategory } from '../../lib/sticker-library.jsx';
import { useCoverStore } from '../../stores/cover-store';
import StickerButton from './StickerButton';

export default function StickerPickerPanel() {
  const { t } = useTranslation('cover');
  const stickers = useCoverStore((s) => s.stickers);
  const addSticker = useCoverStore((s) => s.addSticker);
  const [activeCategory, setActiveCategory] = useState(STICKER_CATEGORIES[0]?.id || 'nature');

  const isAtMax = stickers.length >= 10;

  const handleSelectSticker = useCallback((svgId) => {
    if (!isAtMax) addSticker(svgId);
  }, [addSticker, isAtMax]);

  const categoryStickers = getStickersByCategory(activeCategory);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700">
          {t('cover.customize.stickerPickerHeading')}
        </h2>
        <span className="text-xs text-gray-500">
          {t('cover.stickers.stickerCount', { count: stickers.length })}
        </span>
      </div>

      <div
        role="tablist"
        aria-label={t('cover.customize.stickerPickerHeading')}
        className="flex flex-wrap gap-1 mb-3"
      >
        {STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`
              px-2 py-1 text-xs font-medium rounded-md transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${activeCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            `}
          >
            {t(cat.nameKey)}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label={t('cover.customize.stickerCategoryLabel', { name: t(catNameKey(activeCategory)) })}
        className="grid grid-cols-4 sm:grid-cols-5 gap-2"
      >
        {categoryStickers.map((sticker) => (
          <StickerButton
            key={sticker.svgId}
            svgId={sticker.svgId}
            onSelect={handleSelectSticker}
            disabled={isAtMax}
          />
        ))}
      </div>
    </section>
  );
}

function catNameKey(categoryId) {
  const map = {
    nature: 'cover.stickers.categories.nature',
    animals: 'cover.stickers.categories.animals',
    shapes: 'cover.stickers.categories.shapes',
    hearts: 'cover.stickers.categories.hearts',
    space: 'cover.stickers.categories.space',
    celebration: 'cover.stickers.categories.celebration',
  };
  return map[categoryId] || 'cover.stickers.categories.nature';
}