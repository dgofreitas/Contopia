// Contopia — BookshelfGrid
// Distributes books into shelf rows based on viewport width
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ShelfRow from './ShelfRow';
import PulledOutOverlay from './PulledOutOverlay';
import CoverOverlay from './CoverOverlay';
import usePulledOutBook from '../../hooks/usePulledOutBook';

const BREAKPOINTS = {
  mobile: 3,   // < 640px
  tablet: 5,   // 640–1024px
  desktop: 7,  // > 1024px
};

function getBooksPerRow() {
  if (typeof window === 'undefined') return BREAKPOINTS.desktop;
  const width = window.innerWidth;
  if (width < 640) return BREAKPOINTS.mobile;
  if (width < 1024) return BREAKPOINTS.tablet;
  return BREAKPOINTS.desktop;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function BookshelfGrid({ books, onBookClick }) {
  const { t } = useTranslation('shelf');
  const prefersReducedMotion = useReducedMotion();
  const [booksPerRow, setBooksPerRow] = useState(getBooksPerRow);
  const navigate = useNavigate();
  const { pulledOutBookId, toggle, placeBack, isPlacingBack } = usePulledOutBook();
  const spineRefs = useRef({});
  const [coverOverlayOpen, setCoverOverlayOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      setBooksPerRow(getBooksPerRow());
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rows = useMemo(() => chunkArray(books, booksPerRow), [books, booksPerRow]);

  const handleBookClick = useCallback((bookId) => {
    toggle(bookId);
    onBookClick?.(bookId);
  }, [onBookClick, toggle]);

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

  const pulledBook = pulledOutBookId
    ? books.find((b) => b._id === pulledOutBookId)
    : null;

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

  return (
    <section
      aria-label={t('ariaShelfLabel', { count: books.length })}
      className="py-6 space-y-2"
    >
      <motion.div
        variants={containerVariants}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
        className="space-y-2"
      >
        {rows.map((row, index) => (
          <motion.div key={index} variants={spineVariants}>
            <ShelfRow
              books={row}
              onBookClick={handleBookClick}
              pulledOutBookId={pulledOutBookId}
              placingBackBookId={isPlacingBack ? pulledOutBookId : null}
            />
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {pulledBook && !isPlacingBack && (
          <PulledOutOverlay
            key="overlay"
            book={pulledBook}
            onDismiss={handlePlaceBack}
            onRead={() => navigate(`/reader/${pulledBook._id}`)}
            onEdit={() => navigate(`/editor/${pulledBook._id}`)}
            onDesignCover={() => navigate(`/editor/${pulledBook._id}?tab=cover`)}
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
          onRead={() => navigate(`/reader/${pulledBook._id}`)}
        />
      )}
    </section>
  );
}
