import React from 'react';
import { m } from 'framer-motion';
import { useReducedMotion } from '../../lib/animation-engine/index.js';
import { useTranslation } from 'react-i18next';
import { sanitizeText } from '../../lib/sanitize';
import { getTextColor, spineColorFromId } from '../../lib/spine-colors';
import ShelfProgressIndicator from '../reader/ShelfProgressIndicator';
import {
  PULL_OUT_VARIANTS,
  PULL_OUT_VARIANTS_REDUCED,
} from '../../hooks/useBookPullOut';

const BookSpine = React.forwardRef(function BookSpine(
  { book, onClick, isPulledOut, isReversing, animationPhase, onPlaceBackComplete, onAnimationComplete, isHighlighted, highlightRef, progress, animationTransition },
  ref,
) {
  const { t } = useTranslation('shelf');
  const prefersReducedMotion = useReducedMotion();
  const spineColor = book.spineColor || spineColorFromId(book._id);
  const textColor = getTextColor(spineColor);
  const title = sanitizeText(book.title);

  const layoutTransition = animationTransition ?? (prefersReducedMotion
    ? { type: 'tween', duration: 0.15, ease: 'easeOut' }
    : { type: 'spring', stiffness: 300, damping: 20 });

  // TODO: STORY-039 — migrate to animation engine
  const willChangeStyle = (animationPhase !== 'idle' || animationTransition) && !prefersReducedMotion
    ? { willChange: 'transform' }
    : {};

  const variants = prefersReducedMotion ? PULL_OUT_VARIANTS_REDUCED : PULL_OUT_VARIANTS;

  // TODO: STORY-039 — migrate variant selection to animation engine
  const variantName = animationPhase === 'placeBack'
    ? 'placeBack'
    : isReversing
      ? 'reversing'
      : isPulledOut
        ? 'pulled'
        : 'rest';

  const pullOutStyle = isPulledOut || animationPhase === 'placeBack'
    ? { zIndex: 50, transformOrigin: 'center bottom' }
    : {};

  function handleKeyDown(e) {
    if (e.key === 'Enter' && onClick) {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <m.button
      ref={isHighlighted ? highlightRef : ref}
      layout
      transition={layoutTransition}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      variants={variants}
      animate={variantName}
      onAnimationComplete={() => {
        if (animationPhase === 'placeBack') {
          onPlaceBackComplete?.();
        } else if (isPulledOut && !isReversing) {
          onAnimationComplete?.();
        }
      }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={t('ariaSpineLabel', { title })}
      aria-expanded={isPulledOut}
      tabIndex={isHighlighted ? 0 : undefined}
      className={`relative flex flex-col items-center justify-end px-1 pt-2 pb-1 rounded-t-sm cursor-pointer focus:ring-2 focus:ring-amber-300 focus:outline-none min-w-[48px] min-h-[48px] select-none${isHighlighted ? ' book-highlight-ring' : ''}`}
      style={{
        backgroundColor: spineColor,
        color: textColor,
        width: '100%',
        height: 'var(--spine-height)',
        ...pullOutStyle,
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
    </m.button>
  );
});

export default React.memo(BookSpine);