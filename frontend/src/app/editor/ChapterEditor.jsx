import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HiPencilAlt } from 'react-icons/hi';
import TipTapEditor from '../../components/editor/TipTapEditor';
import EditorToolbar from '../../components/editor/EditorToolbar';
import AutoSaveIndicator from '../../components/editor/AutoSaveIndicator';
import { sanitizeRichContent } from '../../lib/sanitize';
import useBookStore from '../../stores/book-store';

const AUTO_SAVE_DELAY = 1500;

export default function ChapterEditor({ chapter, onContentChange }) {
  const { t } = useTranslation('editor');
  const editorRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const dirtyRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const announceTimerRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [formatAnnouncement, setFormatAnnouncement] = useState('');
  const saveDraft = useBookStore((s) => s.saveDraft);
  const clearDraft = useBookStore((s) => s.clearDraft);
  const chapterIdRef = useRef(null);

  const handleEditorRef = useCallback((editor) => {
    editorRef.current = editor;
    setEditorInstance(editor);
  }, []);

  const handleAnnounce = useCallback((key) => {
    setFormatAnnouncement(t(key));
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => {
      setFormatAnnouncement('');
    }, 2000);
  }, [t]);

  const handleUpdate = useCallback(
    (html) => {
      dirtyRef.current = true;
      setIsDirty(true);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const sanitized = sanitizeRichContent(html);
        if (onContentChange) {
          setIsSaving(true);
          const result = onContentChange({ chapterId: chapter._id, content: sanitized });
          if (result && typeof result.then === 'function') {
            result
              .then(() => {
                dirtyRef.current = false;
                setIsDirty(false);
                setLastSavedAt(Date.now());
                clearDraft();
              })
              .catch(() => {
                saveDraft(sanitized);
              })
              .finally(() => {
                setIsSaving(false);
              });
          } else {
            dirtyRef.current = false;
            setIsDirty(false);
            setIsSaving(false);
            setLastSavedAt(Date.now());
          }
        }
      }, AUTO_SAVE_DELAY);
    },
    [onContentChange, chapter, saveDraft, clearDraft]
  );

  useEffect(() => {
    if (chapter?._id !== chapterIdRef.current) {
      chapterIdRef.current = chapter?._id;
      dirtyRef.current = false;
      setIsDirty(false);
      setLastSavedAt(null);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }
  }, [chapter?._id]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (announceTimerRef.current) {
        clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  if (!chapter) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p className="text-lg">{t('addChapter')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <HiPencilAlt className="w-5 h-5 text-amber-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-800 truncate">
          {chapter.title}
        </h2>
        <div className="ml-auto">
          <AutoSaveIndicator
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            isDirty={isDirty}
          />
        </div>
      </div>
      {editorInstance && <EditorToolbar editor={editorInstance} ariaLabel={t('formattingToolbar')} onAnnounce={handleAnnounce} />}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-2">
          <TipTapEditor
            content={chapter.content || ''}
            onUpdate={handleUpdate}
            editorRef={handleEditorRef}
            placeholder={t('editorPlaceholder')}
            ariaLabel={t('editorAriaLabel')}
            chapterId={chapter._id}
          />
        </div>
      </div>
      <div aria-live="polite" className="sr-only" role="status">
        {formatAnnouncement}
      </div>
    </div>
  );
}