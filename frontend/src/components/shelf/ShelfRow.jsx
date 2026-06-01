import { m } from 'framer-motion';
import BookSpine from './BookSpine';

export default function ShelfRow({ books, onBookClick, pulledOutBookId, placingBackBookId, isReversing, animationPhase, onPlaceBackComplete, highlightBookId, highlightRef, progressMap = {}, rowIndex, getTransition, onAnimationComplete, isIdle }) {
  const hasPlacingBack = placingBackBookId && books.some(b => b._id === placingBackBookId);

  return (
    <div className="flex flex-col">
      <div className="shelf-row-grid px-2">
        {books.map((book, colIndex) => {
          const globalIndex = rowIndex != null ? rowIndex + colIndex : colIndex;
          const transition = getTransition ? getTransition(globalIndex) : undefined;
          const isThisBookReversing = isReversing && placingBackBookId === book._id;

          return (
            <m.div key={book._id} layoutId={book._id} className="shelf-spine-cell" transition={transition}>
              <BookSpine
                book={book}
                onClick={() => onBookClick(book._id)}
                isPulledOut={book._id === pulledOutBookId}
                isReversing={isThisBookReversing}
                animationPhase={book._id === pulledOutBookId ? animationPhase : 'idle'}
                onPlaceBackComplete={onPlaceBackComplete}
                onAnimationComplete={onAnimationComplete}
                isHighlighted={book._id === highlightBookId}
                highlightRef={book._id === highlightBookId ? highlightRef : undefined}
                progress={progressMap[book._id]}
                animationTransition={transition}
                isIdle={isIdle}
              />
            </m.div>
          );
        })}
      </div>
      <div className={`h-3 rounded-b-sm transition-shadow duration-300 ${
        hasPlacingBack
          ? 'bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 shadow-lg'
          : 'bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 shadow-md'
      }`} />
    </div>
  );
}