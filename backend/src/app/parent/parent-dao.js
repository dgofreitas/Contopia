// Contopia — Parent Dashboard Data Access Object
import { Parent, Child } from '../auth/auth-model.js';
import { Book, ReadingProgress, ReadingSession } from '../book/book-model.js';
import { getWeeklyReadingTime } from '../book/book-dao.js';

/**
 * Find a parent by ID with their child populated.
 * Returns { parent, child } or null if parent not found.
 */
export async function findParentByIdWithChild(parentId) {
  const parent = await Parent.findById(parentId).lean().exec();

  if (!parent) return null;

  const child = await Child.findOne({
    parentId: parent._id,
    isActive: true,
    deletedAt: null,
  }).lean().exec();

  return { parent, child };
}

/**
 * Get the count of books created by a child.
 * Returns the total number of books (all statuses).
 */
export async function getChildBookCount(childId) {
  const count = await Book.countDocuments({ authorId: childId, deletedAt: null }).exec();
  return count;
}

// ── Weekly Aggregation Functions (STORY-053) ──────────────────────────────────

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Count books created by a child in the last 7 days.
 */
export async function getWeeklyBookCount(childId) {
  const since = new Date(Date.now() - ONE_WEEK_MS);
  const count = await Book.countDocuments({
    authorId: childId,
    deletedAt: null,
    createdAt: { $gte: since },
  }).exec();
  return count;
}

/**
 * Count distinct books with reading progress updated in the last 7 days
 * where percentage > 0 (actually read, not just opened).
 */
export async function getWeeklyBooksReadCount(childId) {
  const since = new Date(Date.now() - ONE_WEEK_MS);
  const result = await ReadingProgress.aggregate([
    {
      $match: {
        userId: childId,
        updatedAt: { $gte: since },
        percentage: { $gt: 0 },
        deletedAt: null,
      },
    },
    { $group: { _id: '$bookId' } },
    { $count: 'total' },
  ]).exec();
  return result.length > 0 ? result[0].total : 0;
}

/**
 * Get total weekly reading time in milliseconds for a child.
 * Delegates to book-dao.
 */
export async function getWeeklyReadingTimeForChild(childId) {
  const since = new Date(Date.now() - ONE_WEEK_MS);
  return getWeeklyReadingTime(childId, since);
}

/**
 * Get books by child with only title, coverAssetId, status, updatedAt.
 * Privacy: never includes chapterIds, description, or content.
 * Sorted by updatedAt desc, paginated.
 */
export async function getChildBookTitlesWithCovers(childId, { limit = 20, skip = 0 } = {}) {
  return Book.find({ authorId: childId, deletedAt: null })
    .select('title coverAssetId status updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
}

/**
 * Count total books by child (for pagination total).
 */
export async function countChildBooks(childId) {
  return Book.countDocuments({ authorId: childId, deletedAt: null }).exec();
}