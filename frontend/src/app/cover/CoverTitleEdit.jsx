import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';
import { sanitizeText } from '../../lib/sanitize';

export default function CoverTitleEdit({ bookTitle, textColor }) {
  const { t } = useTranslation('cover');
  const coverTitle = useCoverStore((s) => s.coverTitle);
  const setCoverTitle = useCoverStore((s) => s.setCoverTitle);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const displayTitle = coverTitle ?? bookTitle ?? t('cover.preview.title');

  const titleLength = displayTitle.length;
  const titleClass = titleLength > 60 ? 'cover-title-long'
    : titleLength > 30 ? 'cover-title-medium'
    : 'cover-title-short';

  const handleClick = useCallback(() => {
    setDraft(displayTitle);
    setIsEditing(true);
  }, [displayTitle]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    const sanitized = sanitizeText(draft);
    setCoverTitle(sanitized || null);
    setIsEditing(false);
  }, [draft, setCoverTitle]);

  const handleBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [commitEdit]);

  const handleChange = useCallback((e) => {
    setDraft(e.target.value);
  }, []);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        maxLength={120}
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-label={t('cover.stickers.titleEditAriaLabel')}
        className={`
          w-full text-center bg-transparent border-b-2 border-blue-400 outline-none
          ${titleClass}
        `}
        style={{ color: textColor }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t('cover.stickers.titleEditAriaLabel')}
      className={`cursor-pointer line-clamp-2 text-left w-full ${titleClass}`}
      style={{ color: textColor }}
    >
      {displayTitle}
    </button>
  );
}