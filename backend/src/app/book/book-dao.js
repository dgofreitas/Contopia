// Contopia — Book Data Access Object
import mongoose from 'mongoose';
import { Book, Chapter, Asset, ReadingProgress, ActivityLog, ReadingSession } from './book-model.js';

// ── Book DAO ──────────────────────────────────────────────────────────────────

export async function createBook(data) {
  const doc = await Book.create(data);
  return doc.toObject();
}

export async function findBookById(id) {
  // lean({ virtuals: true }) includes has_custom_cover, default_color, default_font + spineColor getter
  return Book.findOne({ _id: id, deletedAt: null }).lean({ virtuals: true }).exec();
}

export async function findBooksByAuthor(authorId, { status, limit = 50, skip = 0 } = {}) {
  const filter = { authorId, deletedAt: null };
  if (status) filter.status = status;
  const sort = status === 'published'
    ? { publishedAt: -1, _id: -1 }
    : { createdAt: -1 };
  // lean({ virtuals: true }) includes has_custom_cover, default_color, default_font + spineColor getter
  return Book.find(filter).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }).exec();
}

/**
 * Fetch a single book with its non-deleted chapters and total word count.
 * Uses MongoDB aggregation: $match → $lookup chapters → $addFields for totalWordCount.
 * Returns { book, chapters, totalWordCount } or null if not found.
 */
export async function findBookWithChapters(bookId) {
  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(bookId), deletedAt: null } },
    {
      $lookup: {
        from: 'chapters',
        localField: '_id',
        foreignField: 'bookId',
        as: 'chapters',
      },
    },
    { $unwind: { path: '$chapters', preserveNullAndEmptyArrays: true } },
    { $match: { $or: [{ 'chapters.deletedAt': null }, { 'chapters': { $exists: false } }] } },
    {
      $group: {
        _id: '$_id',
        root: { $first: '$$ROOT' },
        chapters: { $push: '$chapters' },
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            '$root',
            {
              chapters: { $filter: { input: '$chapters', as: 'ch', cond: { $ne: ['$$ch', null] } } },
            },
          ],
        },
      },
    },
    {
      $addFields: {
        totalWordCount: { $sum: '$chapters.wordCount' },
      },
    },
  ];

  const results = await Book.aggregate(pipeline).exec();
  if (!results || results.length === 0) return null;

  const doc = results[0];
  // Sort chapters by order ascending
  const chapters = (doc.chapters || [])
    .filter((ch) => ch && ch.deletedAt === null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalWordCount = doc.totalWordCount || 0;

  return {
    book: doc,
    chapters,
    totalWordCount,
  };
}

/**
 * Fetch books by author with totalWordCount per book (aggregation).
 * Only used when status === 'draft' for edit-list word counts.
 */
export async function findBooksByAuthorWithWordCount(authorId, { status, limit = 50, skip = 0 } = {}) {
  const matchFilter = { authorId: new mongoose.Types.ObjectId(authorId), deletedAt: null };
  if (status) matchFilter.status = status;

  const pipeline = [
    { $match: matchFilter },
    {
      $lookup: {
        from: 'chapters',
        localField: '_id',
        foreignField: 'bookId',
        as: 'chapters',
      },
    },
    {
      $addFields: {
        totalWordCount: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$chapters',
                  as: 'ch',
                  cond: { $eq: ['$$ch.deletedAt', null] },
                },
              },
              as: 'filtered',
              in: '$$filtered.wordCount',
            },
          },
        },
      },
    },
    { $project: { chapters: 0 } },
  ];

  // Apply sort
  if (status === 'published') {
    pipeline.push({ $sort: { publishedAt: -1, _id: -1 } });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  // Apply pagination
  pipeline.push({ $skip: skip }, { $limit: limit });

  return Book.aggregate(pipeline).exec();
}

export async function updateBookById(id, update) {
  return Book.findOneAndUpdate({ _id: id, deletedAt: null }, update, { new: true }).lean().exec();
}

export async function softDeleteBook(id) {
  const now = new Date();
  return Book.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: now }, { new: true }).lean().exec();
}

export async function hardDeleteBook(id) {
  return Book.findByIdAndDelete(id).lean().exec();
}

export async function countBooksByAuthor(authorId, { status } = {}) {
  const filter = { authorId, deletedAt: null };
  if (status) filter.status = status;
  return Book.countDocuments(filter).exec();
}

/**
 * Fetch published books by author with chapterCount for each book.
 * Uses aggregation: $match → $lookup chapters → $addFields for chapterCount.
 * STORY-051: Offline sync needs lightweight metadata (id, title, coverAssetId, updatedAt, chapterCount).
 * @param {string} authorId
 * @param {{ limit?: number, skip?: number }} options
 * @returns {Promise<Array>} Book documents with chapterCount field
 */
export async function findPublishedBooksWithChapterCounts(authorId, { limit = 50, skip = 0 } = {}) {
  const pipeline = [
    { $match: { authorId: new mongoose.Types.ObjectId(authorId), status: 'published', deletedAt: null } },
    {
      $lookup: {
        from: 'chapters',
        localField: '_id',
        foreignField: 'bookId',
        as: 'chapters',
      },
    },
    {
      $addFields: {
        chapterCount: {
          $size: {
            $filter: {
              input: '$chapters',
              as: 'ch',
              cond: { $eq: ['$$ch.deletedAt', null] },
            },
          },
        },
      },
    },
    { $project: { chapters: 0 } },
    { $sort: { publishedAt: -1, _id: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  return Book.aggregate(pipeline).exec();
}

// ── Chapter DAO ───────────────────────────────────────────────────────────────

export async function createChapter(data) {
  const doc = await Chapter.create(data);
  return doc.toObject();
}

export async function findChapterById(id) {
  return Chapter.findOne({ _id: id, deletedAt: null }).lean().exec();
}

export async function findChaptersByBook(bookId, { limit = 100, skip = 0 } = {}) {
  return Chapter.find({ bookId, deletedAt: null }).sort({ order: 1 }).skip(skip).limit(limit).lean().exec();
}

export async function updateChapterById(id, update) {
  return Chapter.findOneAndUpdate({ _id: id, deletedAt: null }, update, { new: true }).lean().exec();
}

/**
 * Atomic update that increments _version and sets updatedAt.
 * Used by sync conflict resolution to ensure version monotonicity.
 * Returns the updated document or null if not found/soft-deleted.
 */
export async function updateChapterByIdWithVersion(id, update) {
  return Chapter.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { ...update, $inc: { _version: 1 } },
    { new: true },
  ).lean().exec();
}

export async function softDeleteChapter(id) {
  const now = new Date();
  return Chapter.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: now }, { new: true }).lean().exec();
}

export async function softDeleteChaptersByBook(bookId) {
  const now = new Date();
  return Chapter.updateMany({ bookId, deletedAt: null }, { deletedAt: now }).exec();
}

export async function hardDeleteChapter(id) {
  return Chapter.findByIdAndDelete(id).lean().exec();
}

export async function countChaptersByBook(bookId) {
  return Chapter.countDocuments({ bookId, deletedAt: null }).exec();
}

export async function findMaxOrderByBook(bookId) {
  const result = await Chapter
    .find({ bookId, deletedAt: null })
    .sort({ order: -1 })
    .limit(1)
    .select('order')
    .lean()
    .exec();
  return result.length > 0 ? result[0].order : 0;
}

export async function updateManyChapterOrders(bookId, updates) {
  // updates: array of { _id, order }
  // Two-phase update to avoid unique constraint violations on {bookId, order, deletedAt}:
  // Phase 1: Set all orders to negative temporary values (guaranteed unique)
  // Phase 2: Set all orders to their final values
  const tempOps = updates.map((u, i) => ({
    updateOne: {
      filter: { _id: u._id, bookId, deletedAt: null },
      update: { $set: { order: -(i + 1) } },
    },
  }));
  await Chapter.bulkWrite(tempOps);

  const finalOps = updates.map((u) => ({
    updateOne: {
      filter: { _id: u._id, bookId, deletedAt: null },
      update: { $set: { order: u.order } },
    },
  }));
  return Chapter.bulkWrite(finalOps);
}

export async function pushChapterIdToBook(bookId, chapterId) {
  return Book.findOneAndUpdate(
    { _id: bookId, deletedAt: null },
    { $push: { chapterIds: chapterId } },
    { new: true },
  ).lean({ virtuals: true }).exec();
}

export async function pullChapterIdFromBook(bookId, chapterId) {
  return Book.findOneAndUpdate(
    { _id: bookId, deletedAt: null },
    { $pull: { chapterIds: chapterId } },
    { new: true },
  ).lean({ virtuals: true }).exec();
}

export async function updateBookChapterIdsOrder(bookId, chapterIds) {
  return Book.findOneAndUpdate(
    { _id: bookId, deletedAt: null },
    { $set: { chapterIds } },
    { new: true },
  ).lean({ virtuals: true }).exec();
}

// ── Asset DAO ─────────────────────────────────────────────────────────────────

export async function createAsset(data) {
  const doc = await Asset.create(data);
  return doc.toObject();
}

export async function findAssetById(id) {
  return Asset.findOne({ _id: id, deletedAt: null }).lean().exec();
}

export async function findAssetsByBook(bookId, { type } = {}) {
  const filter = { bookId, deletedAt: null };
  if (type) filter.type = type;
  return Asset.find(filter).lean().exec();
}

export async function sumAssetBytesByAuthor(authorId) {
  const result = await Asset.aggregate([
    { $match: { authorId, deletedAt: null } },
    { $group: { _id: null, totalBytes: { $sum: '$sizeBytes' } } },
  ]).exec();
  return result.length > 0 ? result[0].totalBytes : 0;
}

export async function softDeleteAsset(id) {
  const now = new Date();
  return Asset.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: now }, { new: true }).lean().exec();
}

export async function softDeleteAssetsByBook(bookId) {
  const now = new Date();
  return Asset.updateMany({ bookId, deletedAt: null }, { deletedAt: now }).exec();
}

export async function hardDeleteAsset(id) {
  return Asset.findByIdAndDelete(id).lean().exec();
}

// ── ReadingProgress DAO ───────────────────────────────────────────────────────

export async function createReadingProgress(data) {
  const doc = await ReadingProgress.create(data);
  return doc.toObject();
}

export async function findReadingProgress(userId, bookId) {
  return ReadingProgress.findOne({ userId, bookId, deletedAt: null }).lean().exec();
}

export async function upsertReadingProgress(userId, bookId, update) {
  return ReadingProgress.findOneAndUpdate(
    { userId, bookId, deletedAt: null },
    { $set: { ...update, updatedAt: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean().exec();
}

export async function findReadingProgressByUser(userId, { limit = 50, skip = 0 } = {}) {
  return ReadingProgress.find({ userId, deletedAt: null })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
}

export async function softDeleteReadingProgressByBook(bookId) {
  const now = new Date();
  return ReadingProgress.updateMany({ bookId, deletedAt: null }, { deletedAt: now }).exec();
}

export async function softDeleteReadingProgress(id) {
  const now = new Date();
  return ReadingProgress.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: now }, { new: true }).lean().exec();
}

// ── ActivityLog DAO (append-only, no updates or deletes) ──────────────────────

export async function createActivityLog(data) {
  const doc = await ActivityLog.create(data);
  return doc.toObject({ minimize: false });
}

export async function findActivityLogs({ actorId, action, targetId, targetType, limit = 50, skip = 0 } = {}) {
  const filter = {};
  if (actorId) filter.actorId = actorId;
  if (action) filter.action = action;
  if (targetId) filter.targetId = targetId;
  if (targetType) filter.targetType = targetType;
  return ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec();
}

// ── ReadingSession DAO (STORY-053) ──────────────────────────────────────────────

export async function createReadingSession(data) {
  const doc = await ReadingSession.create(data);
  return doc.toObject();
}

export async function getChildReadingSessions(childId, { since } = {}) {
  const filter = { childId };
  if (since) filter.createdAt = { $gte: since };
  return ReadingSession.find(filter).sort({ createdAt: -1 }).lean().exec();
}

/**
 * Sum total reading time (durationMs) for a child since a given date.
 * Used for weekly aggregation in parent activity summary.
 */
export async function getWeeklyReadingTime(childId, sinceDate) {
  const result = await ReadingSession.aggregate([
    { $match: { childId: new mongoose.Types.ObjectId(childId), createdAt: { $gte: sinceDate } } },
    { $group: { _id: null, totalMs: { $sum: '$durationMs' } } },
  ]).exec();
  return result.length > 0 ? result[0].totalMs : 0;
}

/**
 * Count distinct books that have reading progress updated since a date
 * with percentage > 0 (i.e., actually read, not just opened).
 */
export async function getWeeklyBooksRead(childId, sinceDate) {
  const result = await ReadingProgress.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(childId),
        updatedAt: { $gte: sinceDate },
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
 * Get books by author with only title, coverAssetId, status, updatedAt.
 * NEVER includes chapterIds or content fields (privacy: STORY-053).
 */
export async function getChildBooksSummary(childId, { limit = 20, skip = 0 } = {}) {
  return Book.find({ authorId: childId, deletedAt: null })
    .select('title coverAssetId status updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
}