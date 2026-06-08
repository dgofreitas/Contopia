// Contopia — Parent Dashboard HTTP Routes
import { Router } from 'express';
import { parentAuthMiddleware } from '../common/auth-middleware.js';
import { ok, fail } from '../common/response-envelope.js';
import * as parentManager from './parent-manager.js';

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