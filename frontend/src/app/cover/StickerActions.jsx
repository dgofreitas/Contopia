import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';

export default function StickerActions() {
  const { t } = useTranslation('cover');
  const stickers = useCoverStore((s) => s.stickers);
  const selectedStickerId = useCoverStore((s) => s.selectedStickerId);
  const removeSticker = useCoverStore((s) => s.removeSticker);
  const clearStickers = useCoverStore((s) => s.clearStickers);

  const [confirmClear, setConfirmClear] = useState(false);

  const handleRemoveSelected = useCallback(() => {
    if (selectedStickerId) removeSticker(selectedStickerId);
  }, [selectedStickerId, removeSticker]);

  const handleClearAll = useCallback(() => {
    if (confirmClear) {
      clearStickers();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  }, [confirmClear, clearStickers]);

  const handleClearCancel = useCallback(() => {
    setConfirmClear(false);
  }, []);

  if (stickers.length === 0 && !selectedStickerId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleRemoveSelected}
        disabled={!selectedStickerId}
        aria-label={t('cover.customize.removeSticker')}
        className={`
          px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${selectedStickerId
            ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
            : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'}
        `}
      >
        {t('cover.customize.removeSticker')}
      </button>
      {stickers.length > 0 && !confirmClear && (
        <button
          type="button"
          onClick={handleClearAll}
          aria-label={t('cover.customize.clearAllStickers')}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t('cover.customize.clearAllStickers')}
        </button>
      )}
      {confirmClear && (
        <>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-400 text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {t('cover.customize.clearAllConfirm')}
          </button>
          <button
            type="button"
            onClick={handleClearCancel}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            {t('cover.customize.cancel')}
          </button>
        </>
      )}
    </div>
  );
}