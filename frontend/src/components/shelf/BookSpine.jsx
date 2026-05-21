// Contopia — BookSpine
// Individual book spine rendered as a button with vertical text
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { sanitizeText } from '../../lib/sanitize';
import { getTextColor, spineColorFromId } from '../../lib/spine-colors';

const BookSpine = React.forwardRef(function BookSpine(
  { book, onClick, isPulledOut, onPullOut, isHighlighted, highlightRef },
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && onPullOut) {
      e.preventDefault();
      onPullOut();
    }
  }

  return (
    <motion.button
      ref={isHighlighted ? highlightRef : ref}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={t('ariaSpineLabel', { title })}
      aria-expanded={isPulledOut}
      tabIndex={isHighlighted ? 0 : undefined}
      className={`flex flex-col items-center justify-end px-1 pt-2 pb-1 rounded-t-sm cursor-pointer transition-shadow focus:ring-2 focus:ring-amber-300 focus:outline-none min-w-[48px] min-h-[48px] select-none${isHighlighted ? ' book-highlight-ring' : ''}`}
      style={{
        backgroundColor: spineColor,
        color: textColor,
        width: '100%',
        height: 'var(--spine-height)',
        ...pulledStyle,
        ...settleTransition,
      }}
    >
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
    </motion.button>
  );
});

export default React.memo(BookSpine);
