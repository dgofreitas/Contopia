// Contopia — BookshelfGridLayout
// Orchestrator: fetches books via TanStack Query, renders appropriate state
import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import { HiExclamationCircle } from 'react-icons/hi';
import useBooksQuery from '../../hooks/useBooksQuery';
import useAllReadingProgressQuery from '../../hooks/useAllReadingProgressQuery';
import useBookStore from '../../stores/book-store';
import useSortPreference from '../../hooks/useSortPreference';
import { sortBooks } from '../../lib/sort-books';
import BookshelfGrid from '../../components/shelf/BookshelfGrid';
import ShelfSkeleton from '../../components/shelf/ShelfSkeleton';
import EmptyShelfState from '../../components/shelf/EmptyShelfState';

export default function BookshelfGridLayout({ highlightBookId }) {
  const { t } = useTranslation('shelf');
  const { data, isLoading, isError, refetch } = useBooksQuery();
  const { data: progressData } = useAllReadingProgressQuery();
  const setBooks = useBookStore((s) => s.setBooks);
  const highlightRef = useRef(null);

  const books = data?.data ?? [];
  const hasBooks = books.length > 0;
  const { sortMode } = useSortPreference();

  // Build a map of bookId → progress for quick lookup
  const progressMap = useMemo(() => {
    if (!progressData?.data) return {};
    const map = {};
    for (const entry of progressData.data) {
      map[entry.bookId] = {
        percentage: entry.percentage ?? 0,
        finished: entry.finished ?? false,
        updatedAt: entry.updatedAt ?? null,
      };
    }
    return map;
  }, [progressData]);

  const sortedBooks = useMemo(
    () => sortBooks(books, sortMode, progressMap),
    [books, sortMode, progressMap]
  );

  // Sync to Zustand store when data arrives
  useEffect(() => {
    if (data?.data) {
      setBooks(data.data);
    }
  }, [data, setBooks]);

  useEffect(() => {
    if (!highlightBookId || isLoading || !hasBooks) return;
    const el = highlightRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('book-highlight-ring');
    el.focus({ preventScroll: true });
    const timer = setTimeout(() => {
      el.classList.remove('book-highlight-ring');
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightBookId, isLoading, hasBooks]);

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
      <BookshelfGrid books={sortedBooks} onBookClick={handleBookClick} highlightBookId={highlightBookId} highlightRef={highlightRef} progressMap={progressMap} />
    );
  }, [isLoading, isError, sortedBooks, hasBooks, t, handleRetry, handleBookClick, highlightBookId, progressMap]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {content}
    </div>
  );
}