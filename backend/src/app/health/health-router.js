const express = require('express');

/**
 * /health responde 200 só quando o banco e o cache estão de pé, porque é o que
 * o healthcheck do Docker usa para decidir se o container está pronto.
 */
function createHealthRouter({ mongoose, redis }) {
  const router = express.Router();

  router.get('/health', async (req, res) => {
    const mongo = mongoose.connection.readyState === 1 ? 'ok' : 'down';
    let cache = 'down';
    try {
      cache = (await redis.ping()) === 'PONG' ? 'ok' : 'down';
    } catch {
      cache = 'down';
    }

    const healthy = mongo === 'ok' && cache === 'ok';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      mongo,
      redis: cache,
    });
  });

  return router;
}

module.exports = { createHealthRouter };
