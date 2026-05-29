// Contopia — Reader Business Logic Manager
// STORY-034: Chapter Navigation — public chapter access for reading
// STORY-032: Reader Preferences — font size, theme, reading mode
import pino from 'pino';
import { findBookById, findChaptersByBook } from '../book/book-dao.js';
import { findPreferences, upsertPreferences } from './reader-preferences-dao.js';

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

// ── Reader Preferences (STORY-032) ──────────────────────────────────────────────

const DEFAULT_PREFERENCES = {
  fontSize: 'medium',
  theme: 'light',
  readingMode: 'paginated',
};

/**
 * Get reading preferences for a child.
 * Returns defaults if no preferences document exists.
 * @param {string} childId - The authenticated child's ID
 * @returns {Promise<Object>} Preferences object { fontSize, theme, readingMode, updatedAt }
 */
export async function getPreferences(childId) {
  const prefs = await findPreferences(childId);

  if (!prefs) {
    return { ...DEFAULT_PREFERENCES, childId, updatedAt: null };
  }

  return {
    childId: prefs.childId.toString(),
    fontSize: prefs.fontSize,
    theme: prefs.theme,
    readingMode: prefs.readingMode,
    updatedAt: prefs.updatedAt,
  };
}

/**
 * Update reading preferences for a child.
 * Only updates fields provided; existing fields are preserved.
 * @param {string} childId - The authenticated child's ID
 * @param {object} update - Partial update { fontSize?, theme?, readingMode? }
 * @returns {Promise<Object>} Updated preferences
 */
export async function updatePreferences(childId, update) {
  const cleanedUpdate = {};
  if (update.fontSize !== undefined) cleanedUpdate.fontSize = update.fontSize;
  if (update.theme !== undefined) cleanedUpdate.theme = update.theme;
  if (update.readingMode !== undefined) cleanedUpdate.readingMode = update.readingMode;

  const prefs = await upsertPreferences(childId, cleanedUpdate);

  logger.info({ childId, updatedFields: Object.keys(cleanedUpdate) }, 'Reader preferences updated');

  return {
    childId: prefs.childId.toString(),
    fontSize: prefs.fontSize,
    theme: prefs.theme,
    readingMode: prefs.readingMode,
    updatedAt: prefs.updatedAt,
  };
}