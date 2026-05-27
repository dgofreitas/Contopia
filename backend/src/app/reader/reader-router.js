// Contopia — Reader HTTP Routes
import { Router } from 'express';
import pino from 'pino';
import { validate } from '../common/validation-middleware.js';
import { ok, fail } from '../common/response-envelope.js';
import { readerChaptersParamsSchema } from '../common/validation-schemas.js';
import * as readerManager from './reader-manager.js';

const logger = pino({ name: 'reader-router', level: process.env.LOG_LEVEL || 'info' });

const router = Router();

// ── GET /:bookId/chapters — Public chapter list for reading ─────────────────
router.get('/:bookId/chapters', validate(readerChaptersParamsSchema, 'params'), async (req, res) => {
  const requestId = req.id;

  try {
    const chapters = await readerManager.getChaptersForReading(req._params.bookId, req.childId);
    return res.status(200).json(ok(chapters, { requestId }));
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
    logger.error({ err, requestId }, 'Unhandled reader error');
  }

  return res.status(status).json(fail(code, message, { requestId }, requestId));
}

export default router;