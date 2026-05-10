// Contopia — Email Service (Singleton, retry, PII-safe logging, i18n)
import crypto from 'node:crypto';
import pino from 'pino';
import { transport, FROM_ADDRESS } from '../../config/email.js';

const logger = pino({ name: 'email-service', level: process.env.LOG_LEVEL || 'info' });

const TRANSIENT_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET', 'ECONNECTION']);
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

// ── i18n Strings ──────────────────────────────────────────────────────────────
const I18N = {
  'pt-BR': {
    subject: 'Confirme sua conta no Contopia',
    greeting: 'Olá!',
    bodyIntro: 'Estamos quase lá! Confirme a conta da criança',
    buttonText: 'Confirmar conta',
    expiryNote: 'Este link expira em 72 horas.',
    privacyLabel: 'Aviso de Privacidade (COPPA)',
    privacyText:
      'Este serviço coleta informações pessoais de crianças menores de 13 anos somente com o consentimento verificável dos pais, conforme a Lei de Proteção da Privacidade Online de Crianças (COPPA). Seu consentimento é necessário antes de qualquer coleta, uso ou divulgação de dados da criança. Você pode retirar seu consentimento a qualquer momento entrando em contato conosco.',
    lang: 'pt-BR',
    heading: 'Confirme sua conta no Contopia 📚',
  },
  en: {
    subject: 'Confirm your Contopia account',
    greeting: 'Hello!',
    bodyIntro: "You're almost there! Confirm the child's account for",
    buttonText: 'Confirm account',
    expiryNote: 'This link expires in 72 hours.',
    privacyLabel: 'Privacy Notice (COPPA)',
    privacyText:
      'This service collects personal information from children under 13 only with verifiable parental consent, as required by the Children\'s Online Privacy Protection Act (COPPA). Your consent is required before any collection, use, or disclosure of the child\'s data. You may withdraw your consent at any time by contacting us.',
    lang: 'en',
    heading: 'Confirm your Contopia account 📚',
  },
};

function getStrings(locale) {
  return I18N[locale] || I18N['pt-BR'];
}

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
function buildVerificationHtml(childFirstName, verificationLink, locale = 'pt-BR') {
  const s = getStrings(locale);
  return `<!DOCTYPE html>
<html lang="${s.lang}">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <h2 style="color:#2d6a4f;">${s.heading}</h2>
  <p>${s.greeting}</p>
  <p>${s.bodyIntro} <strong>${childFirstName}</strong>:</p>
  <p style="text-align:center;margin:30px 0;">
    <a href="${verificationLink}" style="background:#2d6a4f;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;">${s.buttonText}</a>
  </p>
  <p><small>${s.expiryNote}</small></p>
  <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;">
  <p style="font-size:12px;color:#888;">
    <strong>${s.privacyLabel}:</strong> ${s.privacyText}
  </p>
</body>
</html>`;
}

/**
 * Build plain text fallback.
 */
function buildVerificationText(childFirstName, verificationLink, locale = 'pt-BR') {
  const s = getStrings(locale);
  return `${s.heading}

${s.greeting} ${s.bodyIntro} ${childFirstName}:

${verificationLink}

${s.expiryNote}

---
${s.privacyLabel}: ${s.privacyText}`;
}

/**
 * Send a verification email with retry logic.
 * Returns { success: boolean, messageId?: string }.
 * Never throws — graceful fallback on SMTP unavailability.
 */
export async function sendVerificationEmail({ to, childFirstName, verificationLink, locale = 'pt-BR' }) {
  const recipientHash = hashEmail(to);

  // Guard: no transport configured (dev mode)
  if (!transport) {
    logger.warn({ recipientHash }, 'SMTP unavailable — verification email skipped');
    return { success: false };
  }

  const s = getStrings(locale);
  const mailOptions = {
    from: FROM_ADDRESS,
    to,
    subject: s.subject,
    html: buildVerificationHtml(childFirstName, verificationLink, locale),
    text: buildVerificationText(childFirstName, verificationLink, locale),
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