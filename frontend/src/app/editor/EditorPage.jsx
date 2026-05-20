import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useChaptersQuery from '../../hooks/useChaptersQuery';
import useCreateChapter from '../../hooks/useCreateChapter';
import useUpdateChapter from '../../hooks/useUpdateChapter';
import useDeleteChapter from '../../hooks/useDeleteChapter';
import ChapterSidebar from './ChapterSidebar';
import ChapterEditor from './ChapterEditor';

export default function EditorPage() {
  const { bookId } = useParams();
  const { t } = useTranslation('editor');

  const { data: chaptersData, isLoading } = useChaptersQuery(bookId);
  const createChapter = useCreateChapter(bookId);
  const updateChapter = useUpdateChapter(bookId);
  const deleteChapter = useDeleteChapter(bookId);

  const chapters = useMemo(() => {
    if (!chaptersData?.data) return [];
    return [...chaptersData.data].sort((a, b) => a.order - b.order);
  }, [chaptersData]);

  const [activeChapterId, setActiveChapterId] = useState(null);

  const activeChapterIdFinal = activeChapterId || (chapters.length > 0 ? chapters[0]._id : null);
  const activeChapter = chapters.find((c) => c._id === activeChapterIdFinal) || null;

  const handleSelectChapter = useCallback((chapterId) => {
    setActiveChapterId(chapterId);
  }, []);

  const handleAddChapter = useCallback(() => {
    createChapter.mutate(undefined, {
      onSuccess: (newChapter) => {
        setActiveChapterId(newChapter._id);
      },
    });
  }, [createChapter]);

  const handleRenameChapter = useCallback(
    ({ chapterId, title }) => {
      updateChapter.mutate({ chapterId, title });
    },
    [updateChapter]
  );

  const handleDeleteChapter = useCallback(
    ({ chapterId }) => {
      deleteChapter.mutate({ chapterId }, {
        onSuccess: () => {
          if (activeChapterIdFinal === chapterId) {
            const remaining = chapters.filter((c) => c._id !== chapterId);
            setActiveChapterId(remaining.length > 0 ? remaining[0]._id : null);
          }
        },
      });
    },
    [deleteChapter, activeChapterIdFinal, chapters]
  );

  const handleContentChange = useCallback(
    ({ chapterId, content }) => {
      return updateChapter.mutateAsync({ chapterId, content });
    },
    [updateChapter]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50">
        <div className="animate-pulse text-gray-400">{t('chapterNav')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-amber-50 to-teal-50">
      <ChapterSidebar
        bookId={bookId}
        chapters={chapters}
        activeChapterId={activeChapterIdFinal}
        onSelectChapter={handleSelectChapter}
        onAddChapter={handleAddChapter}
        onRenameChapter={handleRenameChapter}
        onDeleteChapter={handleDeleteChapter}
        isCreatingChapter={createChapter.isPending}
      />
      <ChapterEditor chapter={activeChapter} onContentChange={handleContentChange} />
    </div>
  );
}