import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useReaderStore from '../../stores/reader-store';

export default function ReaderTapZones({ onPreviousChapter, onNextChapter }) {
  const { t } = useTranslation('reader');
  const toggleToolbar = useReaderStore((s) => s.toggleToolbar);

  const handleLeftTap = useCallback(
    (e) => {
      e.preventDefault();
      onPreviousChapter();
    },
    [onPreviousChapter],
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
      onNextChapter();
    },
    [onNextChapter],
  );

  return (
    <div
      className="reader-tap-zones absolute inset-0 z-20 flex pointer-events-auto"
      aria-hidden="true"
    >
      <button
        className="w-[15%] h-full cursor-pointer focus:outline-none focus:ring-0 active:bg-transparent hover:bg-transparent bg-transparent"
        onClick={handleLeftTap}
        aria-label={t('tapLeft')}
        tabIndex={-1}
      />
      <button
        className="w-[70%] h-full cursor-pointer focus:outline-none focus:ring-0 active:bg-transparent hover:bg-transparent bg-transparent"
        onClick={handleCenterTap}
        aria-label={t('tapCenter')}
        tabIndex={-1}
      />
      <button
        className="w-[15%] h-full cursor-pointer focus:outline-none focus:ring-0 active:bg-transparent hover:bg-transparent bg-transparent"
        onClick={handleRightTap}
        aria-label={t('tapRight')}
        tabIndex={-1}
      />
    </div>
  );
}