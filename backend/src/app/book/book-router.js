// Contopia — Book HTTP Routes
import { Router } from 'express';
import pino from 'pino';
import { authMiddleware } from '../common/auth-middleware.js';
import {
  bookIdSchema,
  bookCreateSchema,
  bookUpdateSchema,
  chapterCreateSchema,
  chapterUpdateSchema,
  progressUpdateSchema,
} from '../common/validation-schemas.js';
import * as bookManager from './book-manager.js';

const logger = pino({ name: 'book-router', level: process.env.LOG_LEVEL || 'info' });

const router = Router();

// All book routes require authentication
router.use(authMiddleware);

// ── POST / — Create a book ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = bookCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const book = await bookManager.createBookManager({
      authorId: req.childId,
      ...parsed.data,
    });

    return res.status(201).json({ data: book, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET / — List books by author ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  const requestId = req.id;

  try {
    const status = req.query.status || undefined;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = parseInt(req.query.skip, 10) || 0;

    const books = await bookManager.getBooksByAuthorManager(req.childId, { status, limit, skip });

    return res.status(200).json({ data: books, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /:bookId — Get a single book ──────────────────────────────────────────
router.get('/:bookId', async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = bookIdSchema.safeParse({ bookId: req.params.bookId });
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    // Import dao directly for simple fetch
    const { findBookById } = await import('./book-dao.js');
    const book = await findBookById(req.params.bookId);

    if (!book) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Book not found' },
        meta: { requestId },
      });
    }

    // Verify ownership
    if (book.authorId.toString() !== req.childId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not authorized to view this book' },
        meta: { requestId },
      });
    }

    return res.status(200).json({ data: book, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── PATCH /:bookId — Update a book ───────────────────────────────────────────
router.patch('/:bookId', async (req, res) => {
  const requestId = req.id;

  try {
    const idParsed = bookIdSchema.safeParse({ bookId: req.params.bookId });
    if (!idParsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: idParsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const bodyParsed = bookUpdateSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: bodyParsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const book = await bookManager.updateBookManager(req.params.bookId, req.childId, bodyParsed.data);

    return res.status(200).json({ data: book, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── DELETE /:bookId — Soft-delete a book and cascade ──────────────────────────
router.delete('/:bookId', async (req, res) => {
  const requestId = req.id;

  try {
    await bookManager.deleteBookManager(req.params.bookId, req.childId);

    return res.status(204).end();
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /:bookId/publish — Publish a book ────────────────────────────────────
router.post('/:bookId/publish', async (req, res) => {
  const requestId = req.id;

  try {
    const book = await bookManager.publishBookManager(req.params.bookId, req.childId);

    return res.status(200).json({ data: book, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /:bookId/chapters — Get chapters for a book ──────────────────────────
router.get('/:bookId/chapters', async (req, res) => {
  const requestId = req.id;

  try {
    const chapters = await bookManager.getChaptersByBookManager(req.params.bookId);

    return res.status(200).json({ data: chapters, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /:bookId/chapters — Create a chapter (placeholder) ───────────────────
router.post('/:bookId/chapters', async (req, res) => {
  // Full chapter CRUD is part of the editor story (STORY-005+)
  return res.status(200).json({
    data: { message: 'Chapter creation endpoint — editor story implementation pending' },
    meta: { requestId: req.id },
  });
});

// ── PATCH /:bookId/chapters/:chapterId — Update a chapter (placeholder) ───────
router.patch('/:bookId/chapters/:chapterId', async (req, res) => {
  // Full chapter update is part of the editor story (STORY-005+)
  return res.status(200).json({
    data: { message: 'Chapter update endpoint — editor story implementation pending' },
    meta: { requestId: req.id },
  });
});

// ── DELETE /:bookId/chapters/:chapterId — Delete a chapter (placeholder) ─────
router.delete('/:bookId/chapters/:chapterId', async (req, res) => {
  // Full chapter delete is part of the editor story (STORY-005+)
  return res.status(200).json({
    data: { message: 'Chapter delete endpoint — editor story implementation pending' },
    meta: { requestId: req.id },
  });
});

// ── GET /:bookId/progress — Get reading progress ─────────────────────────────
router.get('/:bookId/progress', async (req, res) => {
  const requestId = req.id;

  try {
    const progress = await bookManager.getReadingProgressManager(req.childId, req.params.bookId);

    if (!progress) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'No reading progress found' },
        meta: { requestId },
      });
    }

    return res.status(200).json({ data: progress, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── PUT /:bookId/progress — Update reading progress ───────────────────────────
router.put('/:bookId/progress', async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = progressUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join('; ') },
        meta: { requestId },
      });
    }

    const progress = await bookManager.updateReadingProgressManager(
      req.childId,
      req.params.bookId,
      parsed.data,
    );

    return res.status(200).json({ data: progress, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /progress — Get all reading progress for user ────────────────────────
router.get('/progress/all', async (req, res) => {
  const requestId = req.id;

  try {
    const progress = await bookManager.getReadingProgressByUserManager(req.childId);

    return res.status(200).json({ data: progress, meta: { requestId } });
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── Error Handler ─────────────────────────────────────────────────────────────
function handleError(err, req, res) {
  const requestId = req.id;
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    logger.error({ err, requestId }, 'Unhandled book error');
  }

  return res.status(status).json({
    error: { code, message },
    meta: { requestId },
  });
}

export default router;