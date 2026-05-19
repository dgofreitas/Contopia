import BookSpine from './BookSpine';

export default function ShelfRow({ books, onBookClick, pulledOutBookId, placingBackBookId }) {
  const hasPlacingBack = placingBackBookId && books.some(b => b._id === placingBackBookId);

  return (
    <div className="flex flex-col">
      <div className="shelf-row-grid px-2">
        {books.map((book) => (
          <div key={book._id} className="shelf-spine-cell">
            <BookSpine
              book={book}
              onClick={() => onBookClick(book._id)}
              isPulledOut={book._id === pulledOutBookId}
              onPullOut={() => onBookClick(book._id)}
            />
          </div>
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
