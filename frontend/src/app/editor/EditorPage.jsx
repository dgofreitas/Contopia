import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'flowbite-react';
import { HiUpload } from 'react-icons/hi';
import apiClient from '../../lib/api-client';
import useChaptersQuery from '../../hooks/useChaptersQuery';
import useCreateChapter from '../../hooks/useCreateChapter';
import useUpdateChapter from '../../hooks/useUpdateChapter';
import useDeleteChapter from '../../hooks/useDeleteChapter';
import usePublishBook from '../../hooks/usePublishBook';
import autosaveService from '../../services/autosave-service';
import ChapterSidebar from './ChapterSidebar';
import ChapterEditor from './ChapterEditor';
import PublishConfirmDialog from '../../components/editor/PublishConfirmDialog';
import PublishSuccessToast from '../../components/editor/PublishSuccessToast';
import CelebrationOverlay from '../../components/editor/CelebrationOverlay';
import { useErrorStore } from '../../stores/error-store';

export default function EditorPage() {
  const { bookId } = useParams();
  const { t } = useTranslation('editor');
  const navigate = useNavigate();

  const { data: chaptersData, isLoading } = useChaptersQuery(bookId);
  const { data: bookData } = useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/v1/books/${bookId}`);
      return data.data;
    },
    enabled: !!bookId,
  });

  const bookStatus = bookData?.status || 'draft';
  const bookTitle = bookData?.title || '';

  const createChapter = useCreateChapter(bookId);
  const updateChapter = useUpdateChapter(bookId);
  const deleteChapter = useDeleteChapter(bookId);
  const publishBook = usePublishBook();
  const addToast = useErrorStore((s) => s.addToast);

  const chapters = useMemo(() => {
    if (!chaptersData?.data) return [];
    return [...chaptersData.data].sort((a, b) => a.order - b.order);
  }, [chaptersData]);

  const [activeChapterId, setActiveChapterId] = useState(null);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [publishErrorCode, setPublishErrorCode] = useState(null);

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

  const handlePublishClick = useCallback(async () => {
    try {
      await autosaveService.flushDraftsForBook(bookId);
    } catch {
      // proceed even if flush fails
    }
    setPublishErrorCode(null);
    setIsPublishDialogOpen(true);
  }, [bookId]);

  const handlePublishConfirm = useCallback(async () => {
    try {
      await publishBook.mutateAsync(bookId);
      setIsPublishDialogOpen(false);
      setShowSuccessToast(true);
      setShowCelebration(true);
      setTimeout(() => {
        navigate(`/shelf?highlight=${bookId}`);
      }, 2000);
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (code === 'EMPTY_CONTENT') {
        setPublishErrorCode('EMPTY_CONTENT');
      } else {
        setIsPublishDialogOpen(false);
        addToast('PUBLISH_ERROR', t('publishError'));
      }
    }
  }, [publishBook, bookId, navigate, addToast]);

  const handlePublishCancel = useCallback(() => {
    setIsPublishDialogOpen(false);
    setPublishErrorCode(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-teal-50">
        <div className="animate-pulse text-gray-400">{t('chapterNav')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-teal-50">
      {bookStatus === 'draft' && (
        <div className="flex justify-end px-4 pt-3">
          <Button
            onClick={handlePublishClick}
            className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 min-h-[44px]"
          >
            <HiUpload className="w-5 h-5" />
            {t('publishButton')}
          </Button>
        </div>
      )}
      <div className="flex flex-1">
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
        <ChapterEditor chapter={activeChapter} onContentChange={handleContentChange} bookId={bookId} />
      </div>
      <PublishConfirmDialog
        isOpen={isPublishDialogOpen}
        onConfirm={handlePublishConfirm}
        onCancel={handlePublishCancel}
        isPublishing={publishBook.isPending}
        bookTitle={bookTitle}
        errorCode={publishErrorCode}
      />
      <PublishSuccessToast
        isOpen={showSuccessToast}
        onDismiss={() => setShowSuccessToast(false)}
        bookId={bookId}
      />
      {showCelebration && <CelebrationOverlay />}
      <span className="sr-only" aria-live="polite">
        {showSuccessToast ? t('publishSuccessAnnouncement') : ''}
      </span>
    </div>
  );
}