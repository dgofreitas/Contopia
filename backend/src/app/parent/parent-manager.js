// Contopia — Parent Dashboard Business Logic Manager
import pino from 'pino';
import {
  findParentByIdWithChild,
  getWeeklyBookCount,
  getWeeklyBooksReadCount,
  getWeeklyReadingTimeForChild,
  getChildBookTitlesWithCovers,
  countChildBooks,
} from './parent-dao.js';
import { findAssetRecordById } from '../storage/storage-dao.js';
import { getSignedUrl as getSignedUrlService } from '../storage/storage-service.js';
import { findAssetsByBook } from '../book/book-dao.js';

const logger = pino({ name: 'parent-manager', level: process.env.LOG_LEVEL || 'info' });

/**
 * Get child activity summary for the parent dashboard (STORY-053).
 * Weekly aggregation: books written, books read, reading time in minutes.
 * Returns empty-state defaults when no child exists or no activity.
 */
export async function getChildActivitySummary(parentId) {
  const parentIdStr = parentId.toString();
  const result = await findParentByIdWithChild(parentIdStr);

  if (!result || !result.child) {
    return {
      booksWritten: 0,
      booksRead: 0,
      readingTimeMinutes: 0,
      childFirstName: result?.child?.firstName || null,
      childId: result?.child?._id?.toString() || null,
      hasActivity: false,
    };
  }

  const childId = result.child._id;

  const [booksWritten, booksRead, totalMs] = await Promise.all([
    getWeeklyBookCount(childId),
    getWeeklyBooksReadCount(childId),
    getWeeklyReadingTimeForChild(childId),
  ]);

  const readingTimeMinutes = Math.round(totalMs / 60000);
  const hasActivity = booksWritten > 0 || booksRead > 0 || readingTimeMinutes > 0;

  return {
    booksWritten,
    booksRead,
    readingTimeMinutes,
    childFirstName: result.child.firstName,
    childId: childId.toString(),
    hasActivity,
  };
}

/**
 * Get paginated list of child's books with titles and cover thumbnails only.
 * Privacy: never returns chapterIds, content, or description (STORY-053).
 * Resolves coverThumbnailUrl via asset signed URLs.
 */
export async function getChildBookList(parentId, { limit = 20, skip = 0 } = {}) {
  const parentIdStr = parentId.toString();
  const result = await findParentByIdWithChild(parentIdStr);

  if (!result || !result.child) {
    return { books: [], total: 0, limit, offset: skip };
  }

  const childId = result.child._id;

  const [books, total] = await Promise.all([
    getChildBookTitlesWithCovers(childId, { limit, skip }),
    countChildBooks(childId),
  ]);

  // Resolve cover thumbnail URLs
  const enrichedBooks = await Promise.all(books.map(async (book) => {
    let coverThumbnailUrl = null;

    if (book.coverAssetId) {
      try {
        const bookAssets = await findAssetsByBook(book._id.toString(), { type: 'cover_thumbnail' });
        if (bookAssets.length > 0) {
          coverThumbnailUrl = await getSignedUrlService(bookAssets[0].url);
        } else {
          // Fallback: try the cover asset itself
          const coverAsset = await findAssetRecordById(book.coverAssetId.toString());
          if (coverAsset) {
            coverThumbnailUrl = await getSignedUrlService(coverAsset.url);
          }
        }
      } catch (err) {
        logger.warn({ err, bookId: book._id }, 'Failed to resolve cover thumbnail URL');
      }
    }

    return {
      bookId: book._id.toString(),
      title: book.title,
      coverThumbnailUrl,
      status: book.status,
      updatedAt: book.updatedAt,
    };
  }));

  return {
    books: enrichedBooks,
    total,
    limit,
    offset: skip,
  };
}