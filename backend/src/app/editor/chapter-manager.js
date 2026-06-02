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
  updateChapterByIdWithVersion,
  updateManyChapterOrders,
  pushChapterIdToBook,
  pullChapterIdFromBook,
  updateBookChapterIdsOrder,
  createActivityLog,
} from '../book/book-dao.js';
import { sanitizeChapterContent } from '../../common/sanitize-content.js';

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

  // 3. Sanitize content and auto-compute wordCount if content is provided
  const cleanUpdates = { ...updates };
  if (updates.content !== undefined) {
    const sanitized = sanitizeChapterContent(updates.content);
    cleanUpdates.content = sanitized;
    const plainText = sanitized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    cleanUpdates.wordCount = plainText ? plainText.split(/\s+/).length : 0;
  }

  // 4. Persist update (increment _version on content changes for sync conflict detection)
  const updated = updates.content !== undefined
    ? await updateChapterByIdWithVersion(chapterId, cleanUpdates)
    : await updateChapterById(chapterId, cleanUpdates);

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

/**
 * Batch sync chapters for offline conflict resolution.
 * For each operation:
 *   a. Load chapter by chapterId
 *   b. Verify ownership via book (childId matches authorId)
 *   c. If baseVersion matches server _version: apply update, increment _version
 *   d. If mismatch: compare clientTimestamp vs server updatedAt
 *      - If clientTimestamp > serverTimestamp: last-write-wins — apply update
 *      - Else: conflict — return server state for client resolution
 *   e. If chapter not found: return error for that operation
 *
 * @param {string} childId - Authenticated user's child ID
 * @param {Array} operations - Array of sync operations
 * @returns {Array} results - Array of { chapterId, status, ... } objects
 */
export async function syncChaptersManager(childId, operations) {
  const results = [];

  for (const op of operations) {
    try {
      if (op.type === 'chapter.create') {
        // ── chapter.create: offline chapter creation via sync ──────────────
        const book = await findBookById(op.bookId);
        if (!book) {
          results.push({
            status: 'not_found',
            tempChapterId: op.tempChapterId || null,
            message: 'Book not found',
          });
          continue;
        }

        if (book.authorId.toString() !== childId.toString()) {
          results.push({
            status: 'forbidden',
            tempChapterId: op.tempChapterId || null,
            message: 'That doesn\'t belong to you',
          });
          continue;
        }

        // Enforce max chapters per book
        const chapterCount = await countChaptersByBook(op.bookId);
        if (chapterCount >= MAX_CHAPTERS_PER_BOOK) {
          results.push({
            status: 'forbidden',
            tempChapterId: op.tempChapterId || null,
            message: 'You\'ve reached the maximum number of chapters for this book',
          });
          continue;
        }

        // Compute next order (gapped: 0, 100, 200, ...)
        const maxOrder = await findMaxOrderByBook(op.bookId);
        const nextOrder = chapterCount === 0 ? 0 : maxOrder + 100;

        // Compute default title based on book language
        const chapterNumber = chapterCount + 1;
        const isPortuguese = book.language && book.language.startsWith('pt');
        const defaultTitle = isPortuguese
          ? `Capítulo ${chapterNumber}`
          : `Chapter ${chapterNumber}`;

        // Sanitize content
        const sanitized = op.content ? sanitizeChapterContent(op.content) : '';

        const chapter = await createChapter({
          bookId: op.bookId,
          order: nextOrder,
          title: op.title || defaultTitle,
          content: sanitized,
        });

        // Push chapter._id to book.chapterIds
        await pushChapterIdToBook(op.bookId, chapter._id);

        // Audit log (fire-and-forget)
        createActivityLog({
          actorId: childId,
          actorType: 'child',
          action: 'chapter.create',
          targetId: chapter._id,
          targetType: 'chapter',
        }).catch((err) => {
          logger.error({ err }, 'Audit log failed for action chapter.create (sync)');
        });

        results.push({
          status: 'ok',
          chapterId: chapter._id.toString(),
          tempChapterId: op.tempChapterId || null,
          serverVersion: 1,
          serverTimestamp: chapter.createdAt,
        });
        continue;
      }

      // ── chapter.update: existing sync logic ─────────────────────────────
      // a. Load chapter
      const chapter = await findChapterById(op.chapterId);
      if (!chapter) {
        results.push({
          chapterId: op.chapterId,
          status: 'not_found',
          message: 'Chapter not found',
        });
        continue;
      }

      // b. Verify ownership via parent book
      const book = await findBookById(chapter.bookId);
      if (!book) {
        results.push({
          chapterId: op.chapterId,
          status: 'not_found',
          message: 'Book not found',
        });
        continue;
      }

      if (book.authorId.toString() !== childId.toString()) {
        results.push({
          chapterId: op.chapterId,
          status: 'forbidden',
          message: 'That doesn\'t belong to you',
        });
        continue;
      }

      // c. Version comparison
      if (op.baseVersion === chapter._version) {
        // Clean update — no conflict
        const sanitized = sanitizeChapterContent(op.content);
        const plainText = sanitized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = plainText ? plainText.split(/\s+/).length : 0;

        const updated = await updateChapterByIdWithVersion(op.chapterId, {
          content: sanitized,
          wordCount,
        });

        createActivityLog({
          actorId: childId,
          actorType: 'child',
          action: 'chapter.sync',
          targetId: op.chapterId,
          targetType: 'chapter',
        }).catch((err) => {
          logger.error({ err }, 'Audit log failed for action chapter.sync');
        });

        results.push({
          chapterId: op.chapterId,
          status: 'ok',
          serverContent: updated.content,
          serverVersion: updated._version,
          serverTimestamp: updated.updatedAt,
        });
      } else {
        // d. Version mismatch — compare timestamps
        const clientTime = new Date(op.clientTimestamp).getTime();
        const serverTime = new Date(chapter.updatedAt).getTime();

        if (clientTime > serverTime) {
          // Last-write-wins: client is newer
          const sanitized = sanitizeChapterContent(op.content);
          const plainText = sanitized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const wordCount = plainText ? plainText.split(/\s+/).length : 0;

          const updated = await updateChapterByIdWithVersion(op.chapterId, {
            content: sanitized,
            wordCount,
          });

          createActivityLog({
            actorId: childId,
            actorType: 'child',
            action: 'chapter.sync',
            targetId: op.chapterId,
            targetType: 'chapter',
          }).catch((err) => {
            logger.error({ err }, 'Audit log failed for action chapter.sync (last-write-wins)');
          });

          results.push({
            chapterId: op.chapterId,
            status: 'ok',
            serverContent: updated.content,
            serverVersion: updated._version,
            serverTimestamp: updated.updatedAt,
          });
        } else {
          // Conflict — server is newer or equal timestamp
          results.push({
            chapterId: op.chapterId,
            status: 'conflict',
            serverContent: chapter.content,
            serverVersion: chapter._version,
            serverTimestamp: chapter.updatedAt,
          });
        }
      }
    } catch (err) {
      const identifier = op.type === 'chapter.create'
        ? { tempChapterId: op.tempChapterId, bookId: op.bookId }
        : { chapterId: op.chapterId };
      logger.error({ err, ...identifier, type: op.type }, 'Sync operation failed');
      results.push({
        ...(op.type === 'chapter.create'
          ? { tempChapterId: op.tempChapterId || null }
          : { chapterId: op.chapterId }),
        status: 'error',
        message: err.message || 'Internal sync error',
      });
    }
  }

  logger.info({ childId, opCount: operations.length }, 'Sync batch processed');
  return results;
}