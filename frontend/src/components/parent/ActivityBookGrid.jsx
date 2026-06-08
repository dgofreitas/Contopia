function BookCard({ bookId, title, coverThumbnailUrl, status }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" data-testid={`book-card-${bookId}`}>
      <div className="h-40 flex items-center justify-center overflow-hidden">
        {coverThumbnailUrl ? (
          <img
            src={coverThumbnailUrl}
            alt={`Capa de ${title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-slate-800 truncate" title={title}>{title}</p>
        <p className="text-xs text-slate-400 mt-1 capitalize">{status}</p>
      </div>
    </div>
  );
}

export default function ActivityBookGrid({ books }) {
  if (!books || books.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {books.map((book) => (
        <BookCard key={book.bookId} {...book} />
      ))}
    </div>
  );
}