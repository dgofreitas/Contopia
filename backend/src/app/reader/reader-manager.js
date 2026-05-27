// Contopia — Reader Business Logic Manager
// STORY-034: Chapter Navigation — public chapter access for reading
import pino from 'pino';
import { findBookById, findChaptersByBook } from '../book/book-dao.js';

const logger = pino({ name: 'reader-manager', level: process.env.LOG_LEVEL || 'info' });

/**
 * Get chapters for reading a book.
 * Allows access if:
 *   - The book is published (status === 'published'), OR
 *   - The requesting user is the book's author (authorId matches childId)
 *
 * @param {string} bookId - The book ID
 * @param {string|null} childId - The authenticated child ID (may be null for unauthenticated requests)
 * @returns {Promise<Array>} Chapters sorted by order
 */
export async function getChaptersForReading(bookId, childId) {
  const book = await findBookById(bookId);

  if (!book) {
    const err = new Error('We couldn\'t find that book');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const isPublished = book.status === 'published';
  const isAuthor = childId && book.authorId.toString() === childId.toString();

  if (!isPublished && !isAuthor) {
    const err = new Error('That doesn\'t belong to you');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  logger.info({ bookId, childId }, 'Reader accessing chapters');
  return findChaptersByBook(bookId);
}