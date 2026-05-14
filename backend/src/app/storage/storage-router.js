// Contopia — Storage HTTP Routes
import { Router } from 'express';
import multer from 'multer';
import pino from 'pino';
import { ok, fail } from '../common/response-envelope.js';
import { validate } from '../common/validation-middleware.js';
import { z } from 'zod';
import * as storageManager from './storage-manager.js';

const logger = pino({ name: 'storage-router', level: process.env.LOG_LEVEL || 'info' });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const objectIdRegex = /^[a-f\d]{24}$/i;

const bookIdParamSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
});

const assetIdParamSchema = z.object({
  assetId: z.string().regex(objectIdRegex, 'Invalid asset ID format'),
});

const router = Router();

// ── POST /books/:bookId/assets — Upload Asset ──────────────────────────────────
router.post(
  '/books/:bookId/assets',
  validate(bookIdParamSchema, 'params'),
  upload.single('file'),
  async (req, res) => {
    const requestId = req.id;

    try {
      if (!req.file) {
        return res.status(400).json(fail('INVALID_FILE_TYPE', 'No file uploaded', { requestId }));
      }

      const { assetId, url, expiresAt } = await storageManager.uploadAssetManager({
        childId: req.childId,
        bookId: req._params.bookId,
        file: req.file,
      });

      return res.status(201).json(ok({ assetId, url, expiresAt }, { requestId }));
    } catch (err) {
      return handleError(err, req, res);
    }
  },
);

// ── GET /assets/:assetId — Download Asset (redirect to presigned URL) ───────────
router.get(
  '/assets/:assetId',
  validate(assetIdParamSchema, 'params'),
  async (req, res) => {
    const requestId = req.id;

    try {
      const { url } = await storageManager.getSignedUrlManager({
        childId: req.childId,
        assetId: req._params.assetId,
      });

      return res.redirect(302, url);
    } catch (err) {
      return handleError(err, req, res);
    }
  },
);

// ── Multer error handler ──────────────────────────────────────────────────────
function handleMulterError(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(
      fail('PAYLOAD_TOO_LARGE', 'This file is too big! Try a smaller picture.', { requestId: req.id }),
    );
  }
  next(err);
}

router.use(handleMulterError);

// ── Error Handler ──────────────────────────────────────────────────────────────
function handleError(err, req, res) {
  const requestId = req.id;
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong — please try again later';

  if (status === 500) {
    message = 'Something went wrong — please try again later';
    logger.error({ err, requestId }, 'Unhandled storage error');
  }

  return res.status(status).json({
    error: { code, message },
    meta: { requestId },
  });
}

export default router;