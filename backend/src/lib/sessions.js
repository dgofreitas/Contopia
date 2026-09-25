const crypto = require('crypto');

const COOKIE = 'contopia_sid';
const TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Sessões guardadas no Redis com um id aleatório no cookie. Diferente de um
 * JWT, dá para derrubar uma sessão na hora (logout, troca de senha).
 */
function createSessionStore(redis, { secureCookies }) {
  const key = (id) => `sess:${id}`;

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    path: '/',
    maxAge: TTL_SECONDS * 1000,
  };

  return {
    async create(res, data) {
      const id = crypto.randomBytes(32).toString('base64url');
      await redis.set(key(id), JSON.stringify(data), 'EX', TTL_SECONDS);
      res.cookie(COOKIE, id, cookieOptions);
      return id;
    },

    async update(id, data) {
      await redis.set(key(id), JSON.stringify(data), 'EX', TTL_SECONDS);
    },

    async destroy(req, res) {
      const id = req.cookies?.[COOKIE];
      if (id) await redis.del(key(id));
      res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
    },

    // Middleware: coloca req.session = { id, parentId, childId, role } ou null
    middleware() {
      return async (req, res, next) => {
        req.session = null;
        const id = req.cookies?.[COOKIE];
        if (!id) return next();
        try {
          const raw = await redis.get(key(id));
          if (raw) {
            req.session = { id, ...JSON.parse(raw) };
            await redis.expire(key(id), TTL_SECONDS);
          }
          next();
        } catch (err) {
          next(err);
        }
      };
    },
  };
}

module.exports = { createSessionStore, COOKIE };
