import { useMemo, useState, useCallback, useRef } from 'react';
import { m, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useReducedMotion } from '../../lib/animation-engine/index.js';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ShelfRow from './ShelfRow';
import PulledOutOverlay from './PulledOutOverlay';
import CoverOverlay from './CoverOverlay';
import usePulledOutBook from '../../hooks/usePulledOutBook';
import useDebouncedResize from '../../hooks/useDebouncedResize';
import useFavoriteToggle from '../../hooks/useFavoriteToggle';
import useSortAnimation from '../../hooks/useSortAnimation';

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function computeItemsPerRow(viewportWidth) {
  if (!viewportWidth) return 7;
  const isDesktop = viewportWidth >= 1024;
  const isTablet = viewportWidth >= 768;
  const padding = isDesktop ? 64 : isTablet ? 48 : 32;
  const gap = isDesktop ? 8 : isTablet ? 6 : 4;
  const minCol = isDesktop ? 64 : isTablet ? 56 : 48;
  const maxWidth = isDesktop ? 1024 : viewportWidth;
  const available = Math.min(viewportWidth, maxWidth) - padding;
  return Math.max(1, Math.floor((available + gap) / (minCol + gap)));
}

export default function BookshelfGrid({ books, onBookClick, highlightBookId, highlightRef, progressMap = {} }) {
  const { t } = useTranslation('shelf');
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const { pulledOutBookId, toggle, placeBack, isPlacingBack, getReaderUrl } = usePulledOutBook();
  const favoriteMutation = useFavoriteToggle();
  const spineRefs = useRef({});
  const [coverOverlayOpen, setCoverOverlayOpen] = useState(false);
  const { width: viewportWidth } = useDebouncedResize();
  const { sortGeneration, getTransition } = useSortAnimation();

  const rows = useMemo(() => {
    const itemsPerRow = computeItemsPerRow(viewportWidth);
    return chunkArray(books, itemsPerRow);
  }, [books, viewportWidth]);

  const handleBookClick = useCallback((bookId) => {
    toggle(bookId);
    onBookClick?.(bookId);
  }, [onBookClick, toggle]);

  const pulledBook = pulledOutBookId
    ? books.find((b) => b._id === pulledOutBookId)
    : null;

  const handleViewCover = useCallback(() => {
    setCoverOverlayOpen(true);
  }, []);

  const handleCloseCover = useCallback(() => {
    setCoverOverlayOpen(false);
  }, []);

  const handlePlaceBack = useCallback(() => {
    setCoverOverlayOpen(false);
    placeBack();
  }, [placeBack]);

  const handleFavoriteToggle = useCallback(() => {
    if (!pulledBook) return;
    favoriteMutation.mutate({
      bookId: pulledBook._id,
      isFavorited: !pulledBook.isFavorited,
    });
  }, [pulledBook, favoriteMutation]);

  const triggerRef = spineRefs.current[pulledOutBookId];

  const containerVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.03,
          },
        },
      };

  const spineVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      };

  let flatIndex = 0;

  return (
    <section
      aria-label={t('ariaShelfLabel', { count: books.length })}
      className="w-full px-4 md:px-6 lg:px-8 lg:max-w-5xl lg:mx-auto py-6"
    >
      <LayoutGroup>
      <m.div
        key={sortGeneration}
        variants={containerVariants}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
        className="space-y-2"
      >
        {rows.map((row, rowIndex) => {
          const rowStartIndex = flatIndex;
          flatIndex += row.length;

          return (
            <m.div key={rowIndex} variants={spineVariants}>
              <ShelfRow
                books={row}
                onBookClick={handleBookClick}
                pulledOutBookId={pulledOutBookId}
                placingBackBookId={isPlacingBack ? pulledOutBookId : null}
                highlightBookId={highlightBookId}
                highlightRef={highlightRef}
                progressMap={progressMap}
                rowIndex={rowStartIndex}
                getTransition={getTransition}
              />
            </m.div>
          );
        })}
      </m.div>
      </LayoutGroup>

      <AnimatePresence>
        {pulledBook && !isPlacingBack && (
          <PulledOutOverlay
            key="overlay"
            book={pulledBook}
            onDismiss={handlePlaceBack}
            onRead={() => navigate(getReaderUrl(pulledBook._id))}
            onEdit={() => navigate(`/editor/${pulledBook._id}`)}
            onDesignCover={() => navigate(`/cover/${pulledBook._id}`)}
            onViewCover={handleViewCover}
            onPlaceBack={handlePlaceBack}
            triggerRef={{ current: triggerRef }}
          />
        )}
      </AnimatePresence>

      {coverOverlayOpen && pulledBook && (
        <CoverOverlay
          isOpen={coverOverlayOpen}
          book={pulledBook}
          onClose={handleCloseCover}
          onRead={() => navigate(getReaderUrl(pulledBook._id))}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}
    </section>
  );
}