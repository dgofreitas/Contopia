// Contopia — Parent Dashboard Data Access Object
import { Parent, Child } from '../auth/auth-model.js';
import { Book, Chapter, ReadingProgress, ReadingSession } from '../book/book-model.js';
import { getWeeklyReadingTime } from '../book/book-dao.js';
import { DeletionRequest } from './parent-model.js';

/**
 * Find a parent by ID with their first active child populated.
 * Returns { parent, child } or null if parent not found.
 * Note: For multiple children, use findChildrenByParentId + findParentById.
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
 * Find all active children for a parent.
 * Used by parent dashboard to list child profiles.
 */
export async function findChildrenByParentId(parentId) {
  return Child.find({
    parentId,
    isActive: true,
    deletedAt: null,
  })
    .select('firstName avatarSeed isActive onboardingCompleted createdAt')
    .lean()
    .exec();
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

// ── DeletionRequest DAO Methods (STORY-054) ──────────────────────────────────────

/**
 * Create a new DeletionRequest document.
 */
export async function createDeletionRequest(data) {
  const doc = await DeletionRequest.create(data);
  return doc.toObject();
}

/**
 * Find a pending DeletionRequest for a specific child.
 * Used to prevent duplicate deletion requests and to block child login.
 */
export async function findPendingDeletionByChild(childId) {
  return DeletionRequest.findOne({ childId, status: 'pending' }).lean().exec();
}

/**
 * Find a pending DeletionRequest for a parent+child pair.
 * Used for cancellation: find the pending request to cancel.
 */
export async function findPendingDeletionByParentAndChild(parentId, childId) {
  return DeletionRequest.findOne({ parentId, childId, status: 'pending' }).lean().exec();
}

/**
 * Cancel a DeletionRequest: set status='cancelled' and cancelledAt=now.
 */
export async function cancelDeletionRequest(deletionRequestId) {
  const now = new Date();
  return DeletionRequest.findByIdAndUpdate(
    deletionRequestId,
    { status: 'cancelled', cancelledAt: now },
    { new: true }
  ).lean().exec();
}

/**
 * Find expired pending DeletionRequests (for GDPR cron job).
 * Returns requests where status='pending' and expiresAt < now.
 */
export async function findExpiredDeletionRequests() {
  return DeletionRequest.find({ status: 'pending', expiresAt: { $lt: new Date() } }).lean().exec();
}

/**
 * Mark a DeletionRequest as completed: set status='completed' and completedAt=now.
 */
export async function markDeletionCompleted(deletionRequestId) {
  const now = new Date();
  return DeletionRequest.findByIdAndUpdate(
    deletionRequestId,
    { status: 'completed', completedAt: now },
    { new: true }
  ).lean().exec();
}

/**
 * Find pending DeletionRequest for a parent's child.
 * Returns { childId, status, expiresAt } or null if no pending request.
 * Used by GET /deletion-request/status (STORY-054 FIX).
 */
export async function findDeletionStatusByParent(parentId) {
  const result = await DeletionRequest.findOne({ parentId, status: 'pending' }).lean().exec();
  if (!result) return null;
  return {
    childId: result.childId.toString(),
    status: result.status,
    expiresAt: result.expiresAt.toISOString(),
  };
}

/**
 * Find all books for a child with their chapters populated.
 * Used for data export: includes title, chapters (content, order, title), coverAssetId, createdAt.
 */
export async function findChildBooksWithChapters(childId) {
  const books = await Book.find({ authorId: childId, deletedAt: null })
    .select('title coverAssetId createdAt')
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  // Fetch chapters for each book
  const enrichedBooks = await Promise.all(
    books.map(async (book) => {
      const chapters = await Chapter.find({ bookId: book._id, deletedAt: null })
        .select('order title content')
        .sort({ order: 1 })
        .lean()
        .exec();
      return { ...book, chapters };
    })
  );

  return enrichedBooks;
}