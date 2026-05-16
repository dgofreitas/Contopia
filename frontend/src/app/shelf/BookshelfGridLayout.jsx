// Contopia — BookshelfGridLayout
// Orchestrator: fetches books via TanStack Query, renders appropriate state
import { useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import { HiExclamationCircle } from 'react-icons/hi';
import useBooksQuery from '../../hooks/useBooksQuery';
import useBookStore from '../../stores/book-store';
import BookshelfGrid from '../../components/shelf/BookshelfGrid';
import ShelfSkeleton from '../../components/shelf/ShelfSkeleton';
import EmptyShelfState from '../../components/shelf/EmptyShelfState';

export default function BookshelfGridLayout() {
  const { t } = useTranslation('shelf');
  const { data, isLoading, isError, refetch } = useBooksQuery();
  const setBooks = useBookStore((s) => s.setBooks);

  const books = data?.data ?? [];
  const hasBooks = books.length > 0;

  // Sync to Zustand store when data arrives
  useEffect(() => {
    if (data?.data) {
      setBooks(data.data);
    }
  }, [data, setBooks]);

  const handleBookClick = useCallback((bookId) => {
    // Future: navigate to editor or reader
    // navigate(`/editor/${bookId}`);
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const content = useMemo(() => {
    if (isLoading) {
      return <ShelfSkeleton />;
    }

    if (isError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center space-y-4 py-16"
        >
          <HiExclamationCircle className="w-16 h-16 text-red-400" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-gray-700">{t('errorTitle')}</h2>
          <p className="text-gray-500 text-center max-w-sm">{t('errorMessage')}</p>
          <Button
            onClick={handleRetry}
            className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-300 text-white font-semibold py-2 px-6 rounded-xl"
          >
            {t('retryButton')}
          </Button>
        </div>
      );
    }

    if (!hasBooks) {
      return <EmptyShelfState />;
    }

    return (
      <BookshelfGrid books={books} onBookClick={handleBookClick} />
    );
  }, [isLoading, isError, books, hasBooks, t, handleRetry, handleBookClick]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {content}
    </div>
  );
}
