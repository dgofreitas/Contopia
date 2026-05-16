// Contopia — BookshelfGrid
// Distributes books into shelf rows based on viewport width
import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ShelfRow from './ShelfRow';

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

  useEffect(() => {
    function handleResize() {
      setBooksPerRow(getBooksPerRow());
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rows = useMemo(() => chunkArray(books, booksPerRow), [books, booksPerRow]);

  const handleBookClick = useCallback((bookId) => {
    onBookClick?.(bookId);
  }, [onBookClick]);

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
            <ShelfRow books={row} onBookClick={handleBookClick} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
