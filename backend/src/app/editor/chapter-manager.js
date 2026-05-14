// Contopia — Chapter Update Business Logic
import pino from 'pino';
import { findChapterById, updateChapterById } from '../book/book-dao.js';
import { findBookById } from '../book/book-dao.js';
import { createActivityLog } from '../book/book-dao.js';

const logger = pino({ name: 'chapter-manager', level: process.env.LOG_LEVEL || 'info' });

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