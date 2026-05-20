import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HiPencilAlt } from 'react-icons/hi';
import TipTapEditor from '../../components/editor/TipTapEditor';
import EditorToolbar from '../../components/editor/EditorToolbar';
import AutoSaveIndicator from '../../components/editor/AutoSaveIndicator';
import { sanitizeRichContent } from '../../lib/sanitize';
import useAutoSave from '../../hooks/useAutoSave';
import useDraftRecovery from '../../hooks/useDraftRecovery';

export default function ChapterEditor({ chapter, onContentChange, bookId }) {
  const { t } = useTranslation('editor');
  const editorRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [formatAnnouncement, setFormatAnnouncement] = useState('');
  const announceTimerRef = useRef(null);
  const [restoredContent, setRestoredContent] = useState(null);

  const {
    isSaving,
    isDirty,
    saveStatus,
    lastSavedAt,
    isOffline,
    conflictInfo,
    saveNow,
  } = useAutoSave({
    bookId,
    chapterId: chapter?._id,
    content: restoredContent ?? (chapter?.content || ''),
    serverVersion: chapter?.updatedAt || null,
    onServerSave: onContentChange
      ? ({ chapterId, content }) => onContentChange({ chapterId, content })
      : null,
    enabled: !!chapter,
  });

  const {
    hasDraft,
    draftContent,
    conflictWarning,
    shouldRestore,
    restoreDraft,
    discardDraft,
  } = useDraftRecovery(bookId, chapter?._id, chapter?.updatedAt);

  useEffect(() => {
    if (shouldRestore && hasDraft && draftContent && !restoredContent) {
      setRestoredContent(draftContent);
    }
  }, [shouldRestore, hasDraft, draftContent, restoredContent]);

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
      const sanitized = sanitizeRichContent(html);
      setRestoredContent(sanitized);
    },
    []
  );

  useEffect(() => {
    return () => {
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

  const displayContent = restoredContent ?? (chapter.content || '');

  const handleRestore = async () => {
    const content = await restoreDraft();
    if (content) {
      setRestoredContent(content);
    }
  };

  const handleDiscard = async () => {
    await discardDraft();
    setRestoredContent(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <HiPencilAlt className="w-5 h-5 text-amber-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-800 truncate">
          {chapter.title}
        </h2>
        <div className="ml-auto">
          <AutoSaveIndicator
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            isDirty={isDirty}
            conflictInfo={conflictInfo}
          />
        </div>
      </div>

      {hasDraft && !restoredContent && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <HiPencilAlt className="w-4 h-4" aria-hidden="true" />
            <span>{t('unsavedChanges')}</span>
            {conflictWarning && (
              <span className="text-amber-600 text-xs">({conflictWarning})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestore}
              className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
            >
              {t('saveDraft')}
            </button>
            <button
              onClick={handleDiscard}
              className="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 rounded transition-colors"
            >
              {t('preview')}
            </button>
          </div>
        </div>
      )}

      {editorInstance && <EditorToolbar editor={editorInstance} ariaLabel={t('formattingToolbar')} onAnnounce={handleAnnounce} />}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-2">
          <TipTapEditor
            content={displayContent}
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