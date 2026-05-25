import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function UploadButton({ onFileSelect, disabled }) {
  const { t } = useTranslation('cover');
  const inputRef = useRef(null);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(event) {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = '';
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={t('cover.upload.buttonLabel')}
        className={`
          px-4 py-2 text-sm font-medium rounded-lg transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
          ${disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'}
        `}
      >
        {t('cover.upload.buttonLabel')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/png,image/jpeg"
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}