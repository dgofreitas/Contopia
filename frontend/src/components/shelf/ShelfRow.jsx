// Contopia — ShelfRow
// Single shelf row with books spines and wooden bar below
import BookSpine from './BookSpine';

export default function ShelfRow({ books, onBookClick }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-1 px-2">
        {books.map((book) => (
          <BookSpine
            key={book._id}
            book={book}
            onClick={() => onBookClick(book._id)}
          />
        ))}
      </div>
      <div className="h-3 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 rounded-b-sm shadow-md" />
    </div>
  );
}
