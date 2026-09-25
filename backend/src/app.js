const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { createHealthRouter } = require('./app/health/health-router');
const { createAuthRouter } = require('./app/auth/auth-router');
const { createChildrenRouter } = require('./app/children/children-router');
const { createBooksRouter } = require('./app/books/books-router');
const { createSessionStore } = require('./lib/sessions');
const { HttpError } = require('./lib/errors');

/**
 * Monta o app Express sem abrir porta nem conexões, para os testes poderem
 * injetar dependências.
 */
function createApp({ mongoose, redis, config = {} }) {
  const app = express();

  // Atrás de dois proxies (Caddy e nginx): o IP real vem no X-Forwarded-For.
  app.set('trust proxy', 2);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.use(createHealthRouter({ mongoose, redis }));

  const sessions = createSessionStore(redis, { secureCookies: Boolean(config.isProduction) });

  const api = express.Router();
  api.use(sessions.middleware());

  // Proteção contra CSRF: além do cookie SameSite=Lax, toda escrita precisa ser
  // JSON, o que um formulário de outro site não consegue enviar.
  api.use((req, res, next) => {
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const hasBody = Number(req.headers['content-length'] || 0) > 0 || Boolean(req.headers['transfer-encoding']);
    if (isWrite && hasBody && !req.is('application/json')) {
      return res.status(415).json({ error: { code: 'JSON_REQUIRED' } });
    }
    next();
  });

  api.get('/', (req, res) => res.json({ name: 'contopia', status: 'ok' }));
  api.use('/auth', createAuthRouter({ sessions, redis }));
  api.use('/children', createChildrenRouter());
  api.use('/books', createBooksRouter());
  app.use('/api/v1', api);

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND' } });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, details: err.details } });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON' } });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'TOO_LARGE' } });
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  });

  return app;
}

module.exports = { createApp };
