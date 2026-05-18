// Contopia — ShelfRow
// Single shelf row with books spines and wooden bar below
import BookSpine from './BookSpine';

export default function ShelfRow({ books, onBookClick, pulledOutBookId, placingBackBookId }) {
  const hasPlacingBack = placingBackBookId && books.some(b => b._id === placingBackBookId);

  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-1 px-2">
        {books.map((book) => (
          <BookSpine
            key={book._id}
            book={book}
            onClick={() => onBookClick(book._id)}
            isPulledOut={book._id === pulledOutBookId}
            onPullOut={() => onBookClick(book._id)}
          />
        ))}
      </div>
      <div className={`h-3 rounded-b-sm transition-shadow duration-300 ${
        hasPlacingBack
          ? 'bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 shadow-lg'
          : 'bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 shadow-md'
      }`} />
    </div>
  );
}
