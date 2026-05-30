// Contopia — BookSpine
// Individual book spine rendered as a button with vertical text
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { sanitizeText } from '../../lib/sanitize';
import { getTextColor, spineColorFromId } from '../../lib/spine-colors';
import ShelfProgressIndicator from '../reader/ShelfProgressIndicator';

const BookSpine = React.forwardRef(function BookSpine(
  { book, onClick, isPulledOut, onPullOut, isHighlighted, highlightRef, progress, animationTransition },
  ref,
) {
  const { t } = useTranslation('shelf');
  const prefersReducedMotion = useReducedMotion();
  const spineColor = book.spineColor || spineColorFromId(book._id);
  const textColor = getTextColor(spineColor);
  const title = sanitizeText(book.title);

  const pulledStyle = isPulledOut
    ? { zIndex: 50, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', transform: 'translateY(-4px) scale(1.05)', willChange: 'transform' }
    : {};

  const animDuration = prefersReducedMotion ? 0 : 300;
  const settleTransition = !isPulledOut
    ? { transition: `transform ${animDuration}ms cubic-bezier(0.25,0.1,0.25,1), box-shadow ${animDuration}ms cubic-bezier(0.25,0.1,0.25,1)` }
    : {};

  const layoutTransition = animationTransition ?? (prefersReducedMotion
    ? { type: 'tween', duration: 0.15, ease: 'easeOut' }
    : { type: 'spring', stiffness: 300, damping: 20 });

  const willChangeStyle = animationTransition && !prefersReducedMotion
    ? { willChange: 'transform' }
    : {};

  function handleKeyDown(e) {
    if (e.key === 'Enter' && onPullOut) {
      e.preventDefault();
      onPullOut();
    }
  }

  return (
    <motion.button
      ref={isHighlighted ? highlightRef : ref}
      layout
      transition={layoutTransition}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={t('ariaSpineLabel', { title })}
      aria-expanded={isPulledOut}
      tabIndex={isHighlighted ? 0 : undefined}
      className={`relative flex flex-col items-center justify-end px-1 pt-2 pb-1 rounded-t-sm cursor-pointer transition-shadow focus:ring-2 focus:ring-amber-300 focus:outline-none min-w-[48px] min-h-[48px] select-none${isHighlighted ? ' book-highlight-ring' : ''}`}
      style={{
        backgroundColor: spineColor,
        color: textColor,
        width: '100%',
        height: 'var(--spine-height)',
        ...pulledStyle,
        ...settleTransition,
        ...willChangeStyle,
      }}
    >
      {book.isFavorited && (
        <svg
          className="absolute top-1 right-1 w-4 h-4"
          viewBox="0 0 24 24"
          fill="#FF6B6B"
          aria-hidden="true"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      )}
      <span
        className="text-xs font-bold leading-tight truncate drop-shadow-sm"
        style={{
          writingMode: 'vertical-lr',
          WebkitWritingMode: 'vertical-lr',
          msWritingMode: 'vertical-lr',
          maxHeight: '80%',
        }}
      >
        {title}
      </span>
      {progress && (
        <ShelfProgressIndicator
          percentage={progress.percentage}
          finished={progress.finished}
        />
      )}
    </motion.button>
  );
});

export default React.memo(BookSpine);
