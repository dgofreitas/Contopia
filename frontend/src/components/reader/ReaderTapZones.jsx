import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useReaderStore from '../../stores/reader-store';

/**
 * ReaderTapZones — Three-zone tap overlay for paginated reading.
 * Left 30% = previous page, Center 40% = toggle toolbar, Right 30% = next page.
 */
export default function ReaderTapZones({ onPreviousPage, onNextPage }) {
  const { t } = useTranslation('reader');
  const toggleToolbar = useReaderStore((s) => s.toggleToolbar);

  const handleLeftTap = useCallback(
    (e) => {
      e.preventDefault();
      onPreviousPage();
    },
    [onPreviousPage],
  );

  const handleCenterTap = useCallback(
    (e) => {
      e.preventDefault();
      toggleToolbar();
    },
    [toggleToolbar],
  );

  const handleRightTap = useCallback(
    (e) => {
      e.preventDefault();
      onNextPage();
    },
    [onNextPage],
  );

  return (
    <div
      className="reader-tap-zones absolute inset-0 z-20 flex pointer-events-auto"
      aria-hidden="true"
    >
      <button
        className="w-[30%] h-full cursor-pointer focus:outline-none focus:ring-0 active:bg-transparent hover:bg-transparent bg-transparent"
        onClick={handleLeftTap}
        aria-label={t('tapLeftPage')}
        tabIndex={-1}
      />
      <button
        className="w-[40%] h-full cursor-pointer focus:outline-none focus:ring-0 active:bg-transparent hover:bg-transparent bg-transparent"
        onClick={handleCenterTap}
        aria-label={t('tapCenter')}
        tabIndex={-1}
      />
      <button
        className="w-[30%] h-full cursor-pointer focus:outline-none focus:ring-0 active:bg-transparent hover:bg-transparent bg-transparent"
        onClick={handleRightTap}
        aria-label={t('tapRightPage')}
        tabIndex={-1}
      />
    </div>
  );
}