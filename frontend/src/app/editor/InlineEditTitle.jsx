import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export default function InlineEditTitle({ title, onSave, maxLength = 200 }) {
  const { t } = useTranslation('editor');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onSave(trimmed);
    }
    setIsEditing(false);
    setEditValue(title);
  }, [editValue, title, onSave]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(title);
  }, [title]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div aria-live="polite">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.slice(0, maxLength))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          className="w-full bg-white border border-amber-400 rounded px-2 py-0.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          aria-label={t('chapterRename')}
        />
      </div>
    );
  }

  return (
    <div aria-live="polite">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="w-full text-left px-2 py-0.5 rounded hover:bg-amber-50 transition-colors text-sm font-medium text-gray-800 truncate"
        title={title}
        aria-label={t('chapterRename')}
      >
        {title}
      </button>
    </div>
  );
}