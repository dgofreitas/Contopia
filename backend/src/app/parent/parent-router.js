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
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'Internal server error';

    if (status >= 500) {
      message = 'Something went wrong — please try again later';
    }

    return res.status(status).json(fail(code, message, { requestId }, requestId));
  }
});

export default router;