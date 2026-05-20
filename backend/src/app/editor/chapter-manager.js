// Contopia — Chapter Business Logic Manager
import pino from 'pino';
import {
  findBookById,
  findChapterById,
  createChapter,
  softDeleteChapter,
  findChaptersByBook,
  countChaptersByBook,
  findMaxOrderByBook,
  updateChapterById,
  updateManyChapterOrders,
  pushChapterIdToBook,
  pullChapterIdFromBook,
  updateBookChapterIdsOrder,
  createActivityLog,
} from '../book/book-dao.js';

const logger = pino({ name: 'chapter-manager', level: process.env.LOG_LEVEL || 'info' });

const MAX_CHAPTERS_PER_BOOK = 50;

/**
 * Update a chapter's content (title, content, wordCount).
 * Ownership is verified against the parent book's authorId.
 * If `content` is provided, wordCount is auto-computed.
 */
export async function updateChapterManager(childId, chapterId, updates) {
  // 1. Find chapter — 404 if not found or soft-deleted
  const chapter = await findChapterById(chapterId);
  if (!chapter) {
    const err = new Error('We couldn\'t find that chapter');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // 2. Verify ownership via parent book
  const book = await findBookById(chapter.bookId);
  if (!book) {
    const err = new Error('We couldn\'t find that book');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (book.authorId.toString() !== childId.toString()) {
    const err = new Error('That doesn\'t belong to you');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  // 3. Auto-compute wordCount if content is provided
  const cleanUpdates = { ...updates };
  if (updates.content !== undefined) {
    cleanUpdates.wordCount = updates.content.split(/\s+/).filter((w) => w.length > 0).length;
  }

  // 4. Persist update
  const updated = await updateChapterById(chapterId, cleanUpdates);

  // 5. Audit log (fire-and-forget)
  createActivityLog({
    actorId: childId,
    actorType: 'child',
    action: 'chapter.update',
    targetId: chapterId,
    targetType: 'chapter',
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action chapter.update');
  });

  logger.info({ chapterId, childId }, 'Chapter updated');
  return updated;
}

/**
 * Create a new chapter for a book.
 * - Verifies book ownership (403 if not owner)
 * - Enforces max 50 chapters per book (409 if limit reached)
 * - Computes default title based on book language
 * - Assigns order = maxOrder + 1 (gapped ordering starting at 100)
 */
export async function createChapterManager(authorId, bookId, body = {}) {
  // 1. Find book → 404 if not found
  const book = await findBookById(bookId);
  if (!book) {
    const err = new Error('We couldn\'t find that book');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // 2. Verify ownership → 403 if not owner
  if (book.authorId.toString() !== authorId.toString()) {
    const err = new Error('That doesn\'t belong to you');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  // 3. Count active chapters → 409 if >= 50
  const count = await countChaptersByBook(bookId);
  if (count >= MAX_CHAPTERS_PER_BOOK) {
    const err = new Error("You've reached the maximum number of chapters for this book");
    err.code = 'CHAPTER_LIMIT_REACHED';
    err.status = 409;
    throw err;
  }

  // 4. Compute next order (gapped: 0, 100, 200, ...)
  const maxOrder = await findMaxOrderByBook(bookId);
  const nextOrder = count === 0 ? 0 : maxOrder + 100;

  // 5. Compute default title based on book language
  const chapterNumber = count + 1;
  const isPortuguese = book.language && book.language.startsWith('pt');
  const defaultTitle = isPortuguese
    ? `Capítulo ${chapterNumber}`
    : `Chapter ${chapterNumber}`;

  // 6. Create chapter
  const chapter = await createChapter({
    bookId,
    order: nextOrder,
    title: body.title || defaultTitle,
    content: body.content || '',
  });

  // 7. Push chapter._id to book.chapterIds
  await pushChapterIdToBook(bookId, chapter._id);

  // 8. Audit log (fire-and-forget)
  createActivityLog({
    actorId: authorId,
    actorType: 'child',
    action: 'chapter.create',
    targetId: chapter._id,
    targetType: 'chapter',
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action chapter.create');
  });

  logger.info({ chapterId: chapter._id, bookId, authorId }, 'Chapter created');
  return chapter;
}

/**
 * Soft-delete a chapter and reorder remaining chapters with gapped ordering.
 * - Verifies book ownership (403 if not owner)
 * - Soft-deletes the chapter (sets deletedAt)
 * - Pulls chapterId from book.chapterIds
 * - Re-numbers remaining chapters: order = index * 100
 */
export async function deleteChapterManager(authorId, bookId, chapterId) {
  // 1. Find book → 404 if not found
  const book = await findBookById(bookId);
  if (!book) {
    const err = new Error('We couldn\'t find that book');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // 2. Verify ownership → 403 if not owner
  if (book.authorId.toString() !== authorId.toString()) {
    const err = new Error('That doesn\'t belong to you');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  // 3. Find chapter → 404 if not found
  const chapter = await findChapterById(chapterId);
  if (!chapter) {
    const err = new Error('We couldn\'t find that chapter');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // 4. Verify chapter belongs to book → 400 if mismatch
  if (chapter.bookId.toString() !== bookId.toString()) {
    const err = new Error('That chapter doesn\'t belong to this book');
    err.code = 'BAD_REQUEST';
    err.status = 400;
    throw err;
  }

  // 5. Soft-delete chapter
  await softDeleteChapter(chapterId);

  // 6. Pull chapterId from book.chapterIds
  await pullChapterIdFromBook(bookId, chapterId);

  // 7. Get remaining active chapters sorted by order, re-number with gapped ordering
  const remaining = await findChaptersByBook(bookId);
  if (remaining.length > 0) {
    const reorderUpdates = remaining.map((ch, index) => ({
      _id: ch._id,
      order: index * 100,
    }));
    await updateManyChapterOrders(bookId, reorderUpdates);
  }

  // 8. Update book.chapterIds to reflect new order
  const reordered = await findChaptersByBook(bookId);
  await updateBookChapterIdsOrder(bookId, reordered.map((ch) => ch._id));

  // 9. Audit log (fire-and-forget)
  createActivityLog({
    actorId: authorId,
    actorType: 'child',
    action: 'chapter.delete',
    targetId: chapterId,
    targetType: 'chapter',
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action chapter.delete');
  });

  logger.info({ chapterId, bookId, authorId }, 'Chapter deleted');
  return { deleted: true };
}

/**
 * Reorder chapters within a book.
 * - Verifies all chapter IDs belong to the book (409 REORDER_MISMATCH if not)
 * - Verifies request count matches active chapter count (400 if mismatch)
 * - Bulk updates order via bulkWrite
 * - Updates book.chapterIds to match new order
 */
export async function reorderChaptersManager(authorId, bookId, chapters) {
  // 1. Find book → 404 if not found
  const book = await findBookById(bookId);
  if (!book) {
    const err = new Error('We couldn\'t find that book');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // 2. Verify ownership → 403 if not owner
  if (book.authorId.toString() !== authorId.toString()) {
    const err = new Error('That doesn\'t belong to you');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  // 3. Get all active chapters for book
  const activeChapters = await findChaptersByBook(bookId);

  // 4. Verify request count matches active chapters count
  if (chapters.length !== activeChapters.length) {
    const err = new Error('Chapter count mismatch — please refresh and try again');
    err.code = 'BAD_REQUEST';
    err.status = 400;
    throw err;
  }

  // 5. Verify all IDs in request belong to book
  const activeIds = new Set(activeChapters.map((ch) => ch._id.toString()));
  for (const item of chapters) {
    if (!activeIds.has(item.id)) {
      const err = new Error('Chapter IDs don\'t match this book\'s chapters');
      err.code = 'REORDER_MISMATCH';
      err.status = 409;
      throw err;
    }
  }

  // 6. BulkWrite: update order for each chapter
  const reorderUpdates = chapters.map((item) => ({
    _id: item.id,
    order: item.order,
  }));
  await updateManyChapterOrders(bookId, reorderUpdates);

  // 7. Update book.chapterIds to new order (sorted by order ascending)
  const reorderedChapters = await findChaptersByBook(bookId);
  const newChapterIds = reorderedChapters.map((ch) => ch._id);
  await updateBookChapterIdsOrder(bookId, newChapterIds);

  // 8. Audit log (fire-and-forget)
  createActivityLog({
    actorId: authorId,
    actorType: 'child',
    action: 'chapter.reorder',
    targetId: bookId,
    targetType: 'book',
  }).catch((err) => {
    logger.error({ err }, 'Audit log failed for action chapter.reorder');
  });

  logger.info({ bookId, authorId, count: chapters.length }, 'Chapters reordered');
  return reorderedChapters;
}