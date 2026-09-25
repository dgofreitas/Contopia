const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { createHealthRouter } = require('./app/health/health-router');

/**
 * Monta o app Express sem abrir porta nem conexões, para os testes poderem
 * injetar dependências falsas.
 */
function createApp({ mongoose, redis }) {
  const app = express();

  // Atrás de dois proxies (Caddy e nginx): o IP real vem no X-Forwarded-For.
  app.set('trust proxy', 2);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.use(createHealthRouter({ mongoose, redis }));

  const api = express.Router();
  api.get('/', (req, res) => res.json({ name: 'contopia', status: 'ok' }));
  app.use('/api/v1', api);

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND' } });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  });

  return app;
}

module.exports = { createApp };
