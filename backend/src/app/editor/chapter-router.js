// Contopia — Chapter HTTP Routes (PUT /api/v1/chapters/:chapterId)
import { Router } from 'express';
import pino from 'pino';
import { validate } from '../common/validation-middleware.js';
import { ok, fail } from '../common/response-envelope.js';
import { chapterPutSchema, chapterPutBodySchema } from '../common/validation-schemas.js';
import * as chapterManager from './chapter-manager.js';

const logger = pino({ name: 'chapter-router', level: process.env.LOG_LEVEL || 'info' });

const router = Router();

// ── PUT /:chapterId — Update chapter content ────────────────────────────────
router.put(
  '/:chapterId',
  validate(chapterPutSchema, 'params'),
  validate(chapterPutBodySchema, 'body'),
  async (req, res) => {
    try {
      const { chapterId } = req._params;
      const updated = await chapterManager.updateChapterManager(
        req.childId,
        chapterId,
        req._body,
      );
      return res.status(200).json(ok(updated, { requestId: req.id }));
    } catch (err) {
      return handleError(err, req, res);
    }
  },
);

// ── Error Handler ─────────────────────────────────────────────────────────────
function handleError(err, req, res) {
  const requestId = req.id;
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong — please try again later';

  if (status === 500) {
    message = 'Something went wrong — please try again later';
    logger.error({ err, requestId }, 'Unhandled chapter error');
  }

  return res.status(status).json(fail(code, message, { requestId }, requestId));
}

export default router;