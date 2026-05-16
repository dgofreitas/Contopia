// Contopia — Centralized Error Codes & Child-Friendly Messages (STORY-008)

export const ERROR_CODES = {
  VALIDATION_ERROR:    { status: 400, message: { pt: 'Algo não está certo — tente novamente', en: "That doesn't look right — please try again" } },
  UNAUTHORIZED:        { status: 401, message: { pt: 'Você precisa entrar primeiro', en: 'You need to sign in first' } },
  TOKEN_EXPIRED:       { status: 401, message: { pt: 'Sua sessão expirou — entre novamente', en: 'Your session expired — please sign in again' } },
  TOKEN_REVOKED:       { status: 401, message: { pt: 'Sua sessão foi encerrada — entre novamente', en: 'Your session was signed out — please sign in again' } },
  FORBIDDEN:           { status: 403, message: { pt: 'Você não tem permissão para fazer isso', en: "You don't have permission to do that" } },
  NOT_FOUND:           { status: 404, message: { pt: 'Não conseguimos encontrar isso — tente voltar', en: "We couldn't find that — try going back" } },
  RATE_LIMITED:        { status: 429, message: { pt: 'Devagar — tente novamente em um minuto', en: 'Slow down — try again in a minute' } },
  PAYLOAD_TOO_LARGE:   { status: 413, message: { pt: 'Esse arquivo é grande demais! Tente uma imagem menor.', en: 'This file is too big! Try a smaller picture.' } },
  SESSION_EXPIRED:     { status: 401, message: { pt: 'Sua sessão expirou', en: 'Your session has expired' } },
  SESSION_TIMEOUT:     { status: 419, message: { pt: 'Sua sessão vai expirar por inatividade', en: 'Your session is about to expire due to inactivity' } },
  SERVICE_UNAVAILABLE: { status: 503, message: { pt: 'Algo não está funcionando agora — tente novamente em breve', en: "Something's not working right now — try again soon" } },
  INTERNAL_ERROR:      { status: 500, message: { pt: 'Algo deu errado — tente novamente mais tarde', en: 'Something went wrong — please try again later' } },
  NETWORK_ERROR:       { status: 0,  message: { pt: 'Sem internet — seu trabalho está salvo! Tente novamente.', en: 'No internet — your work is safe! Try again.' } },
  TIMEOUT_ERROR:       { status: 0,  message: { pt: 'Demorou muito para responder — tente novamente.', en: "It's taking too long to respond — try again." } },
};

/**
 * Get the child-friendly error message for an error code.
 * @param {string} code - Error code key from ERROR_CODES
 * @param {'pt'|'en'} lang - Language (defaults to 'en')
 * @returns {string} Child-friendly error message
 */
export function getErrorMessage(code, lang = 'en') {
  const entry = ERROR_CODES[code] || ERROR_CODES.INTERNAL_ERROR;
  return entry.message[lang] || entry.message.en;
}