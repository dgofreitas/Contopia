// Contopia — Email Service (Singleton, retry, PII-safe logging)
import crypto from 'node:crypto';
import pino from 'pino';
import { transport, FROM_ADDRESS } from '../../config/email.js';

const logger = pino({ name: 'email-service', level: process.env.LOG_LEVEL || 'info' });

const TRANSIENT_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET', 'ECONNECTION']);
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

/**
 * SHA-256 hash of an email address — safe for logging.
 */
function hashEmail(email) {
  return crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
}

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the verification email HTML body.
 */
function buildVerificationHtml(childFirstName, verificationLink) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <h2 style="color:#2d6a4f;">Confirme sua conta no Contopia 📚</h2>
  <p>Olá!</p>
  <p>Estamos quase lá! Confirme a conta da criança <strong>${childFirstName}</strong> clicando no botão abaixo:</p>
  <p style="text-align:center;margin:30px 0;">
    <a href="${verificationLink}" style="background:#2d6a4f;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;">Confirmar conta</a>
  </p>
  <p><small>Este link expira em <strong>72 horas</strong>.</small></p>
  <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;">
  <p style="font-size:12px;color:#888;">
    <strong>Aviso de Privacidade (COPPA):</strong> Este serviço coleta informações pessoais de crianças menores de 13 anos somente com o consentimento verificável dos pais, conforme a Lei de Proteção da Privacidade Online de Crianças (COPPA). Seu consentimento é necessário antes de qualquer coleta, uso ou divulgação de dados da criança. Você pode retirar seu consentimento a qualquer momento entrando em contato conosco.
  </p>
</body>
</html>`;
}

/**
 * Build plain text fallback.
 */
function buildVerificationText(childFirstName, verificationLink) {
  return `Confirme sua conta no Contopia

Estamos quase lá! Confirme a conta da criança ${childFirstName} acessando o link abaixo:

${verificationLink}

Este link expira em 72 horas.

---
Aviso de Privacidade (COPPA): Este serviço coleta informações pessoais de crianças menores de 13 anos somente com o consentimento verificável dos pais, conforme a Lei de Proteção da Privacidade Online de Crianças (COPPA). Seu consentimento é necessário antes de qualquer coleta, uso ou divulgação de dados da criança. Você pode retirar seu consentimento a qualquer momento entrando em contato conosco.`;
}

/**
 * Send a verification email with retry logic.
 * Returns { success: boolean, messageId?: string }.
 * Never throws — graceful fallback on SMTP unavailability.
 */
export async function sendVerificationEmail({ to, childFirstName, verificationLink }) {
  const recipientHash = hashEmail(to);

  // Guard: no transport configured (dev mode)
  if (!transport) {
    logger.warn({ recipientHash }, 'SMTP unavailable — verification email skipped');
    return { success: false };
  }

  const mailOptions = {
    from: FROM_ADDRESS,
    to,
    subject: 'Confirme sua conta no Contopia',
    html: buildVerificationHtml(childFirstName, verificationLink),
    text: buildVerificationText(childFirstName, verificationLink),
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await transport.sendMail(mailOptions);
      logger.info({ recipientHash, attempt, messageId: info.messageId }, 'Verification email dispatched');
      return { success: true, messageId: info.messageId };
    } catch (err) {
      const isTransient = TRANSIENT_CODES.has(err.code);

      logger.warn(
        { recipientHash, attempt, errCode: err.code, isTransient },
        'Email send attempt failed'
      );

      if (!isTransient || attempt === MAX_RETRIES) {
        logger.error({ recipientHash, errCode: err.code }, 'Email delivery failed — giving up');
        return { success: false };
      }

      await sleep(BACKOFF_DELAYS[attempt - 1]);
    }
  }

  return { success: false };
}