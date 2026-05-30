const ARTICLES_PT = ['a ', 'o ', 'as ', 'os '];
const ARTICLES_EN = ['a ', 'an ', 'the '];
const ALL_ARTICLES = [...ARTICLES_PT, ...ARTICLES_EN];

const articleRegex = new RegExp(`^(${ALL_ARTICLES.map((a) => a.trim()).join('|')})\\s+`, 'i');

export function stripArticle(title) {
  if (!title) return '';
  return title.replace(articleRegex, '').trim();
}

export function sortByAlphabetical(books) {
  return [...books].sort((a, b) => {
    const titleA = stripArticle(a.title || '');
    const titleB = stripArticle(b.title || '');
    return titleA.localeCompare(titleB, 'pt-BR', { sensitivity: 'base' });
  });
}

export function sortByRecentlyRead(books, progressMap = {}) {
  return [...books].sort((a, b) => {
    const progressA = progressMap[a._id];
    const progressB = progressMap[b._id];
    const timeA = progressA?.updatedAt ? new Date(progressA.updatedAt).getTime() : 0;
    const timeB = progressB?.updatedAt ? new Date(progressB.updatedAt).getTime() : 0;

    if (timeA && timeB) return timeB - timeA;
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;

    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createdB - createdA;
  });
}

export function sortByFavorites(books) {
  return [...books].sort((a, b) => {
    if (a.isFavorited === b.isFavorited) return 0;
    return a.isFavorited ? -1 : 1;
  });
}

export function sortBooks(books, sortMode, progressMap) {
  if (!books || books.length === 0) return books ?? [];

  switch (sortMode) {
    case 'alphabetical':
      return sortByAlphabetical(books);
    case 'recently-read':
      return sortByRecentlyRead(books, progressMap);
    case 'favorites':
      return sortByFavorites(books);
    default:
      return books;
  }
}