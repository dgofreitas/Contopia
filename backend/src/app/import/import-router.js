// Contopia — Import HTTP Routes
import { Router } from 'express';
import multer from 'multer';
import pino from 'pino';
import { ok, fail } from '../common/response-envelope.js';
import { importTxtBookManager, importPdfBookManager } from './import-manager.js';

const logger = pino({ name: 'import-router', level: process.env.LOG_LEVEL || 'info' });

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB for imports
});

const router = Router();

// ── POST /txt — Import TXT file ─────────────────────────────────────────────
router.post('/txt', importUpload.single('file'), async (req, res) => {
  const requestId = req.id;

  try {
    const { book, chapter } = await importTxtBookManager({
      authorId: req.childId,
      file: req.file,
    });

    return res.status(201).json(ok({ book, chapter }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── POST /pdf — Import PDF file ─────────────────────────────────────────────
router.post('/pdf', importUpload.single('file'), async (req, res) => {
  const requestId = req.id;

  // Multer doesn't attach file if no multipart form or empty field
  if (!req.file) {
    return res.status(400).json(fail('NO_FILE', 'No file provided', { requestId }, requestId));
  }

  try {
    const { book, chapter } = await importPdfBookManager({
      authorId: req.childId,
      file: req.file,
    });

    return res.status(201).json(ok({ book, chapter }, { requestId }));
  } catch (err) {
    return handleError(err, req, res);
  }
});

// ── Multer error handler (file size limit) ──────────────────────────────────
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(
      fail('PAYLOAD_TOO_LARGE', 'This file is too big — maximum size is 25MB.', { requestId: req.id }, req.id),
    );
  }
  next(err);
});

// ── Error Handler ─────────────────────────────────────────────────────────────
function handleError(err, req, res) {
  const requestId = req.id;
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong — please try again later';

  if (status === 500) {
    message = 'Something went wrong — please try again later';
    logger.error({ err, requestId }, 'Unhandled import error');
  }

  return res.status(status).json(fail(code, message, { requestId }, requestId));
}

export default router;