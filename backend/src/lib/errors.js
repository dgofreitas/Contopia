class HttpError extends Error {
  constructor(status, code, details) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (code, details) => new HttpError(400, code, details);
const unauthorized = (code = 'UNAUTHENTICATED') => new HttpError(401, code);
const forbidden = (code = 'FORBIDDEN') => new HttpError(403, code);
const notFound = (code = 'NOT_FOUND') => new HttpError(404, code);
const conflict = (code) => new HttpError(409, code);
const tooMany = (code) => new HttpError(429, code);

// Envolve handlers async para que erros cheguem ao middleware de erro.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Valida o corpo com um schema zod e devolve os dados já limpos.
function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest('VALIDATION_ERROR', result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  return result.data;
}

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany, wrap, parse };
