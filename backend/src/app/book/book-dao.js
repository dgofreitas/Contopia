// Contopia — Book Data Access Object
import { Book, Chapter, Asset, ReadingProgress, ActivityLog } from './book-model.js';

// ── Book DAO ──────────────────────────────────────────────────────────────────

export async function createBook(data) {
  const doc = await Book.create(data);
  return doc.toObject();
}

export async function findBookById(id) {
  return Book.findOne({ _id: id, deletedAt: null }).lean({ virtuals: true }).exec();
}

export async function findBooksByAuthor(authorId, { status, limit = 50, skip = 0 } = {}) {
  const filter = { authorId, deletedAt: null };
  if (status) filter.status = status;
  const sort = status === 'published'
    ? { publishedAt: -1, _id: -1 }
    : { createdAt: -1 };
  return Book.find(filter).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }).exec();
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