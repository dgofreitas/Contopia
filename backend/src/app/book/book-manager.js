// Contopia — Book Business Logic Manager
import pino from 'pino';
import {
  createBook,
  findBookById,
  findBooksByAuthor,
  findBooksByAuthorWithWordCount,
  findBookWithChapters,
  updateBookById,
  softDeleteBook,
  countBooksByAuthor,
  findChaptersByBook,
  softDeleteChaptersByBook,
  softDeleteAssetsByBook,
  softDeleteReadingProgressByBook,
  findReadingProgress,
  upsertReadingProgress,
  findReadingProgressByUser,
  createActivityLog,
  createAsset,
  sumAssetBytesByAuthor,
} from './book-dao.js';

const logger = pino({ name: 'book-manager', level: process.env.LOG_LEVEL || 'info' });

const MAX_BOOKS_PER_USER = 100;
const ASSET_QUOTA_BYTES = 524_288_000; // 500MB

// ── Asset Operations ─────────────────────────────────────────────────────────

/**
 * Create an asset for a book, enforcing per-user storage quota (NFR-SCL-02).
 * @param {{ bookId: string, authorId: string, url: string, type: string, mimeType: string, sizeBytes: number }} data
 */
export async function createAssetManager(data) {
  const currentBytes = await sumAssetBytesByAuthor(data.authorId);
  if (currentBytes + data.sizeBytes > ASSET_QUOTA_BYTES) {
    const err = new Error('Asset quota exceeded');
    err.code = 'ASSET_QUOTA_EXCEEDED';
    err.status = 403;
    throw err;
  }

  const asset = await createAsset(data);

  logger.info({ assetId: asset._id, authorId: data.authorId, sizeBytes: data.sizeBytes }, 'Asset created');
  return asset;
}

// ── Book Operations ───────────────────────────────────────────────────────────

/**
 * Create a new book for a child author.
 * Enforces max books per user (NFR-SCL-02).
 */
export async function createBookManager({ authorId, title, description, language }) {
  const count = await countBooksByAuthor(authorId);
  if (count >= MAX_BOOKS_PER_USER) {
    const err = new Error("You've reached the maximum number of books");
    err.code = 'BOOK_LIMIT_REACHED';
    err.status = 403;
    throw err;
  }

  const book = await createBook({
    authorId,
    title,
    description: description || '',
    language: language || 'pt-BR',
    status: 'draft',
    chapterIds: [],
    coverAssetId: null,
    publishedAt: null,
    deletedAt: null,
  });

  // Audit log (fire-and-forget)
  createActivityLog({
    actorId: authorId,
    actorType: 'child',
    action: 'book.create',
    targetId: book._id,
    targetType: 'book',
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action book.create');
  });

  logger.info({ bookId: book._id, authorId }, 'Book created');
  return book;
}

/**
 * Update a book's editable fields.
 * Only allows updating title, description, language.
 */
export async function updateBookManager(bookId, authorId, updates) {
  const book = await findBookById(bookId);
  if (!book) {
    const err = new Error("We couldn't find that book");
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (book.authorId.toString() !== authorId.toString()) {
    const err = new Error("That doesn't belong to you");
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  const allowedFields = {};
  if (updates.title !== undefined) allowedFields.title = updates.title;
  if (updates.description !== undefined) allowedFields.description = updates.description;
  if (updates.language !== undefined) allowedFields.language = updates.language;
  if (updates.templateId !== undefined) allowedFields.templateId = updates.templateId;

  const updated = await updateBookById(bookId, allowedFields);
  logger.info({ bookId, authorId }, 'Book updated');
  return updated;
}

/**
 * Soft-delete a book and cascade soft-delete to chapters, assets, reading progress.
 */
export async function deleteBookManager(bookId, authorId) {
  const book = await findBookById(bookId);
  if (!book) {
    const err = new Error("We couldn't find that book");
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (book.authorId.toString() !== authorId.toString()) {
    const err = new Error("That doesn't belong to you");
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  // Cascade soft-delete: chapters, assets, reading progress
  await Promise.all([
    softDeleteChaptersByBook(bookId),
    softDeleteAssetsByBook(bookId),
    softDeleteReadingProgressByBook(bookId),
  ]);

  const deleted = await softDeleteBook(bookId);

  // Audit log (fire-and-forget)
  createActivityLog({
    actorId: authorId,
    actorType: 'child',
    action: 'book.delete',
    targetId: bookId,
    targetType: 'book',
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action book.delete');
  });

  logger.info({ bookId, authorId }, 'Book soft-deleted');
  return deleted;
}

/**
 * Publish a book: set status to 'published' and publishedAt to now.
 */
export async function publishBookManager(bookId, authorId) {
  const book = await findBookById(bookId);
  if (!book) {
    const err = new Error("We couldn't find that book");
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (book.authorId.toString() !== authorId.toString()) {
    const err = new Error("That doesn't belong to you");
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  if (book.status === 'published') {
    return book; // Idempotent early return
  }

  // Validate at least one chapter with non-empty content
  const chapters = await findChaptersByBook(bookId);
  const hasContent = chapters.some(ch => (ch.content || '').trim().length > 0);
  if (!hasContent) {
    const err = new Error('Write something first! Your book needs at least one chapter with content.');
    err.code = 'EMPTY_CONTENT';
    err.status = 422;
    throw err;
  }

  const updated = await updateBookById(bookId, {
    status: 'published',
    publishedAt: new Date(),
  });

  // Audit log (fire-and-forget)
  createActivityLog({
    actorId: authorId,
    actorType: 'child',
    action: 'book.publish',
    targetId: bookId,
    targetType: 'book',
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action book.publish');
  });

  logger.info({ bookId, authorId }, 'Book published');
  return updated;
}

/**
 * Get a book with its chapters and total word count for editing.
 * Ownership guard: only the author can view their book for editing.
 */
export async function getBookForEditManager(bookId, authorId) {
  const result = await findBookWithChapters(bookId);

  if (!result) {
    const err = new Error("We couldn't find that book");
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const { book, chapters, totalWordCount } = result;

  if (book.authorId.toString() !== authorId.toString()) {
    const err = new Error("That doesn't belong to you");
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  return {
    book,
    chapters,
    totalWordCount,
    lastEditedAt: book.updatedAt,
  };
}

/**
 * Get all books by an author, optionally filtered by status.
 * Returns pagination metadata.
 */
export async function getBooksByAuthorManager(authorId, { status, page = 1, pageSize = 20, limit, skip } = {}) {
  // Support both new (page/pageSize) and legacy (limit/skip) callers
  const effectiveLimit = limit || pageSize;
  const effectiveSkip = skip || (page > 0 ? (page - 1) * effectiveLimit : 0);

  // For drafts, include totalWordCount per book via aggregation
  if (status === 'draft') {
    const [books, total] = await Promise.all([
      findBooksByAuthorWithWordCount(authorId, { status, limit: effectiveLimit, skip: effectiveSkip }),
      countBooksByAuthor(authorId, { status }),
    ]);

    return {
      books,
      total,
      page,
      pageSize: effectiveLimit,
      totalPages: Math.ceil(total / effectiveLimit),
    };
  }

  const [books, total] = await Promise.all([
    findBooksByAuthor(authorId, { status, limit: effectiveLimit, skip: effectiveSkip }),
    countBooksByAuthor(authorId, { status }),
  ]);

  return {
    books,
    total,
    page,
    pageSize: effectiveLimit,
    totalPages: Math.ceil(total / effectiveLimit),
  };
}

// ── Chapter Operations ────────────────────────────────────────────────────────

/**
 * Get all chapters for a book (sorted by order), with ownership guard.
 */
export async function getChaptersByBookManager(bookId, authorId) {
  const book = await findBookById(bookId);
  if (!book) {
    const err = new Error('We couldn\'t find that book');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (book.authorId.toString() !== authorId.toString()) {
    const err = new Error('That doesn\'t belong to you');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  return findChaptersByBook(bookId);
}

// ── Reading Progress Operations ──────────────────────────────────────────────

/**
 * Update or create reading progress for a user + book.
 */
export async function updateReadingProgressManager(userId, bookId, { lastChapterId, lastPosition, percentage }) {
  const update = {};
  if (lastChapterId !== undefined) update.lastChapterId = lastChapterId;
  if (lastPosition !== undefined) update.lastPosition = lastPosition;
  if (percentage !== undefined) update.percentage = percentage;

  const progress = await upsertReadingProgress(userId, bookId, update);
  logger.info({ userId, bookId, percentage: progress.percentage }, 'Reading progress updated');
  return progress;
}

/**
 * Get reading progress for all books a user is reading.
 */
export async function getReadingProgressByUserManager(userId, { limit, skip } = {}) {
  return findReadingProgressByUser(userId, { limit, skip });
}

/**
 * Get reading progress for a specific user + book.
 */
export async function getReadingProgressManager(userId, bookId) {
  return findReadingProgress(userId, bookId);
}