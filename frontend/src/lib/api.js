// Cliente da API. O cookie de sessão vai junto sozinho (mesma origem).
export class ApiError extends Error {
  constructor(status, code, details) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(method, path, body, file) {
  let headers;
  let payload;
  if (file) {
    headers = { 'Content-Type': file.type };
    payload = file;
  } else if (body !== undefined) {
    headers = { 'Content-Type': 'application/json' };
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api/v1${path}`, { method, credentials: 'same-origin', headers, body: payload });
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
  // Envia um arquivo cru; o Content-Type é o tipo dele (image/png etc.).
  upload: (path, file) => request('POST', path, undefined, file),
};

// Mensagens para as crianças e os pais, a partir dos códigos da API.
const MESSAGES = {
  INVALID_CREDENTIALS: 'E-mail ou senha não conferem.',
  EMAIL_TAKEN: 'Já existe uma conta com esse e-mail. Tente entrar.',
  FAMILY_CODE_TAKEN: 'Outra família já usa esse código. Tente outro.',
  FAMILY_NAME_TAKEN: 'Outra família já usa esse nome. Tente outro.',
  FAMILY_CODE_IS_NAME: 'O código e o nome da família não podem ser iguais: o nome é público e o código é segredo.',
  FAMILY_NAME_REQUIRED: 'Escolha primeiro o nome da sua família, para a outra família saber quem está convidando.',
  FAMILY_NAME_NOT_FOUND: 'Não achamos uma família com esse nome. Confira com o outro responsável.',
  SELF_LINK: 'Esse é o nome da sua própria família.',
  ALREADY_LINKED: 'Vocês já são amigos ou já existe um convite entre as duas famílias.',
  INVALID_SHARE: 'Só dá para mandar livros para crianças de famílias amigas.',
  SHARE_NOBODY: 'Escolha pelo menos um amigo para ler.',
  TOO_MANY_TRIES: 'Muitos códigos errados. Espere uns minutos e tente de novo.',
  INVALID_PICTURE_PASSWORD: 'Hmm, essas não são as suas figuras. Tente de novo!',
  INVALID_TEXT_PASSWORD: 'Hmm, essa não é a sua senha. Tente de novo!',
  LOGIN_METHOD_REQUIRED: 'A criança precisa de pelo menos um jeito de entrar: figuras ou senha.',
  CHILD_LOCKED: 'Muitas tentativas. Peça ajuda a um adulto ou espere 15 minutos.',
  FAMILY_NOT_FOUND: 'Não achamos esse código. Confira com um adulto.',
  TOO_MANY_CHILDREN: 'Cada família pode ter até 6 perfis.',
  VALIDATION_ERROR: 'Confira os campos e tente de novo.',
  IMAGE_TYPE: 'Essa imagem não dá. Use uma foto ou desenho em PNG, JPG, WebP ou GIF.',
  IMAGE_INVALID: 'Não consegui abrir essa imagem. Tente outra.',
  TOO_LARGE: 'Essa imagem é grande demais. O limite é 5 MB.',
  TOO_MANY_IMAGES: 'Este livro já tem 100 imagens. Tire alguma para colocar outra.',
};

export function messageFor(error) {
  if (error instanceof ApiError) return MESSAGES[error.code] || 'Algo deu errado. Tente de novo.';
  return 'Sem conexão com o Contopia. Confira a internet.';
}
