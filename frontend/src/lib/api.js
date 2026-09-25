// Cliente da API. O cookie de sessão vai junto sozinho (mesma origem).
export class ApiError extends Error {
  constructor(status, code, details) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(method, path, body) {
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error?.code || 'UNKNOWN', data.error?.details);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};

// Mensagens para as crianças e os pais, a partir dos códigos da API.
const MESSAGES = {
  INVALID_CREDENTIALS: 'E-mail ou senha não conferem.',
  EMAIL_TAKEN: 'Já existe uma conta com esse e-mail. Tente entrar.',
  INVALID_PICTURE_PASSWORD: 'Hmm, essas não são as suas figuras. Tente de novo!',
  CHILD_LOCKED: 'Muitas tentativas. Peça ajuda a um adulto ou espere 15 minutos.',
  FAMILY_NOT_FOUND: 'Não achamos esse código. Confira com um adulto.',
  TOO_MANY_CHILDREN: 'Cada família pode ter até 6 perfis.',
  VALIDATION_ERROR: 'Confira os campos e tente de novo.',
};

export function messageFor(error) {
  if (error instanceof ApiError) return MESSAGES[error.code] || 'Algo deu errado. Tente de novo.';
  return 'Sem conexão com o Contopia. Confira a internet.';
}
