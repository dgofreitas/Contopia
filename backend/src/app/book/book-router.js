// Contopia — Book HTTP Routes
import { Router } from 'express';
import pino from 'pino';
import { validate } from '../common/validation-middleware.js';
import { ok, paginated, fail } from '../common/response-envelope.js';
import {
  bookIdSchema,
  bookCreateSchemaV2,
  bookUpdateSchema,
  bookListQuerySchema,
  bookChaptersParamsSchema,
  progressUpdateSchema,
} from '../common/validation-schemas.js';
import * as bookManager from './book-manager.js';

const logger = pino({ name: 'book-router', level: process.env.LOG_LEVEL || 'info' });

const router = Router();

// ── POST / — Create a book ───────────────────────────────────────────────────
router.post('/', validate(bookCreateSchemaV2, 'body'), async (req, res) => {
  const requestId = req.id;

  try {
    const book = await bookManager.createBookManager({
      authorId: req.childId,
      ...req._body,
    });

    return res.status(201).json(ok(book, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET / — List books by author (paginated) ─────────────────────────────────
router.get('/', validate(bookListQuerySchema, 'query'), async (req, res) => {
  const _requestId = req.id;

  try {
    const { status, page, pageSize } = req._query;
    const result = await bookManager.getBooksByAuthorManager(req.childId, { status, page, pageSize });

    return res.status(200).json(paginated(result.books, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /:bookId — Get a single book ──────────────────────────────────────────
router.get('/:bookId', validate(bookIdSchema, 'params'), async (req, res) => {
  const requestId = req.id;

  try {
    const { findBookById } = await import('./book-dao.js');
    const book = await findBookById(req._params.bookId);

    if (!book) {
      return res.status(404).json(fail('NOT_FOUND', 'We couldn\'t find that book', { requestId }));
    }

    if (book.authorId.toString() !== req.childId) {
      return res.status(403).json(fail('FORBIDDEN', 'That doesn\'t belong to you', { requestId }));
    }

    return res.status(200).json(ok(book, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── PATCH /:bookId — Update a book ───────────────────────────────────────────
router.patch('/:bookId', validate(bookIdSchema, 'params'), validate(bookUpdateSchema, 'body'), async (req, res) => {
  const requestId = req.id;

  try {
    const book = await bookManager.updateBookManager(req._params.bookId, req.childId, req._body);

    return res.status(200).json(ok(book, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── DELETE /:bookId — Soft-delete a book and cascade ──────────────────────────
router.delete('/:bookId', validate(bookIdSchema, 'params'), async (req, res) => {
  try {
    await bookManager.deleteBookManager(req.params.bookId, req.childId);
    return res.status(204).end();
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /:bookId/publish — Publish a book ────────────────────────────────────
router.post('/:bookId/publish', validate(bookIdSchema, 'params'), async (req, res) => {
  const requestId = req.id;

  try {
    const book = await bookManager.publishBookManager(req.params.bookId, req.childId);
    return res.status(200).json(ok(book, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /:bookId/chapters — Get chapters for a book (ownership guard) ───────
router.get('/:bookId/chapters', validate(bookChaptersParamsSchema, 'params'), async (req, res) => {
  const requestId = req.id;

  try {
    const chapters = await bookManager.getChaptersByBookManager(req._params.bookId, req.childId);
    return res.status(200).json(ok(chapters, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /:bookId/chapters — Create a chapter (placeholder) ───────────────────
router.post('/:bookId/chapters', async (req, res) => {
  return res.status(200).json({
    data: { message: 'Chapter creation endpoint — editor story implementation pending' },
    meta: { requestId: req.id },
  });
});

// ── PATCH /:bookId/chapters/:chapterId — Update a chapter (placeholder) ──────
router.patch('/:bookId/chapters/:chapterId', async (req, res) => {
  return res.status(200).json({
    data: { message: 'Chapter update endpoint — editor story implementation pending' },
    meta: { requestId: req.id },
  });
});

// ── DELETE /:bookId/chapters/:chapterId — Delete a chapter (placeholder) ──────
router.delete('/:bookId/chapters/:chapterId', async (req, res) => {
  return res.status(200).json({
    data: { message: 'Chapter delete endpoint — editor story implementation pending' },
    meta: { requestId: req.id },
  });
});

// ── GET /:bookId/progress — Get reading progress ─────────────────────────────
router.get('/:bookId/progress', validate(bookIdSchema, 'params'), async (req, res) => {
  const requestId = req.id;

  try {
    const progress = await bookManager.getReadingProgressManager(req.childId, req._params.bookId);

    if (!progress) {
      return res.status(404).json(fail('NOT_FOUND', 'No reading progress found', { requestId }));
    }

    return res.status(200).json(ok(progress, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── PUT /:bookId/progress — Update reading progress ───────────────────────────
router.put('/:bookId/progress', validate(bookIdSchema, 'params'), validate(progressUpdateSchema, 'body'), async (req, res) => {
  const requestId = req.id;

  try {
    const progress = await bookManager.updateReadingProgressManager(
      req.childId,
      req._params.bookId,
      req._body,
    );

    return res.status(200).json(ok(progress, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── GET /progress/all — Get all reading progress for user ────────────────────
router.get('/progress/all', async (req, res) => {
  const requestId = req.id;

  try {
    const progress = await bookManager.getReadingProgressByUserManager(req.childId);
    return res.status(200).json(ok(progress, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── Error Handler ─────────────────────────────────────────────────────────────
function handleError(err, req, res) {
  const requestId = req.id;
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong — please try again later';

  // Override for 500 errors to never leak details
  if (status === 500) {
    message = 'Something went wrong — please try again later';
    logger.error({ err, requestId }, 'Unhandled book error');
  }

  return res.status(status).json(fail(code, message, { requestId }, requestId));
}

export default router;