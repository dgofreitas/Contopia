// Contopia — Parent Dashboard HTTP Routes
import { Router } from 'express';
import pino from 'pino';
import { parentAuthMiddleware } from '../common/auth-middleware.js';
import { ok, fail } from '../common/response-envelope.js';
import { deletionRequestSchema, deletionCancelSchema } from '../common/validation-schemas.js';
import * as parentManager from './parent-manager.js';

const logger = pino({ name: 'parent-router', level: process.env.LOG_LEVEL || 'info' });

const router = Router();

// ── GET /dashboard ───────────────────────────────────────────────────────────
router.get('/dashboard', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const result = await parentManager.getChildActivitySummary(req.parentId);

    return res.status(200).json(ok(result, { requestId }));
  } catch (err) {
    return handleParentError(err, req, res);
  }
});

// ── GET /activity/summary — Weekly activity summary (STORY-053) ──────────────
router.get('/activity/summary', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const result = await parentManager.getChildActivitySummary(req.parentId);
    return res.status(200).json(ok(result, { requestId }));
  } catch (err) {
    return handleParentError(err, req, res);
  }
});

// ── GET /activity/books — Child's book list (titles + covers only) (STORY-053)
router.get('/activity/books', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const result = await parentManager.getChildBookList(req.parentId, { limit, skip });
    return res.status(200).json(ok(result, { requestId }));
  } catch (err) {
    return handleParentError(err, req, res);
  }
});

// ── GET /export — Download all child data as ZIP (STORY-054) ─────────────────
router.get('/export', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const { archive, childFirstName } = await parentManager.exportChildData(req.parentId);

    // Format date as YYYY-MM-DD
    const date = new Date().toISOString().slice(0, 10);
    const filename = `contopia-export-${childFirstName}-${date}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    archive.pipe(res);

    archive.on('error', (err) => {
      logger.error({ err, requestId }, 'ZIP archive stream error');
      if (!res.headersSent) {
        return handleParentError(err, req, res);
      }
    });
  } catch (err) {
    return handleParentError(err, req, res);
  }
});

// ── GET /deletion-request/status — Check if account deletion is pending (STORY-054 FIX) ─
router.get('/deletion-request/status', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const result = await parentManager.getDeletionStatus(req.parentId);
    return res.status(200).json(ok(result, { requestId }));
  } catch (err) {
    return handleParentError(err, req, res);
  }
});

// ── POST /deletion-request — Request account deletion (STORY-054) ────────────
router.post('/deletion-request', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = deletionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const { confirmText } = parsed.data;
    const deletionResult = await parentManager.requestAccountDeletion({
      parentId: req.parentId,
      confirmText,
    });

    return res.status(200).json(ok(deletionResult, { requestId }));
  } catch (err) {
    return handleParentError(err, req, res);
  }
});

// ── POST /deletion-request/cancel — Cancel account deletion (STORY-054) ──────
router.post('/deletion-request/cancel', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const parsed = deletionCancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), { requestId }));
    }

    const { childId } = parsed.data;
    const cancelResult = await parentManager.cancelAccountDeletion({
      parentId: req.parentId,
      childId,
    });

    return res.status(200).json(ok(cancelResult, { requestId }));
  } catch (err) {
    return handleParentError(err, req, res);
  }
});

// ── GET /privacy-policy — Privacy policy content (STORY-055) ─────────────────
router.get('/privacy-policy', parentAuthMiddleware, async (req, res) => {
  const requestId = req.id;

  try {
    const result = await parentManager.getPrivacyPolicy();
    return res.status(200).json(ok(result, { requestId }));
  } catch (err) {
    return handleParentError(err, req, res);
  }
});

// ── Error Handler ─────────────────────────────────────────────────────────────
function handleParentError(err, req, res) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';

  if (status >= 500) {
    message = 'Something went wrong — please try again later';
  }

  return res.status(status).json(fail(code, message, { requestId: req.id }, req.id));
}

export default router;