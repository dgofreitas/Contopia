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

// ── Deletion Confirmation i18n Strings (STORY-054) ──────────────────────────────
const DELETION_I18N = {
  'pt-BR': {
    subject: 'Contopia — Confirmação de exclusão de conta',
    greeting: 'Olá!',
    bodyIntro: 'Recebemos sua solicitação para excluir a conta de',
    bodyDetails: 'A conta será permanentemente excluída em 30 dias. Durante esse período, a conta ficará bloqueada e não poderá ser acessada.',
    cancelNote: 'Se mudou de ideia, entre em contato com nosso suporte para cancelar a exclusão.',
    supportContact: 'Suporte: suporte@contopia.com.br',
    lang: 'pt-BR',
    heading: 'Confirmação de Exclusão de Conta 📋',
  },
  en: {
    subject: 'Contopia — Account Deletion Confirmation',
    greeting: 'Hello!',
    bodyIntro: 'We received your request to delete the account for',
    bodyDetails: 'The account will be permanently deleted in 30 days. During this period, the account will be locked and cannot be accessed.',
    cancelNote: 'If you changed your mind, please contact our support to cancel the deletion.',
    supportContact: 'Support: support@contopia.com',
    lang: 'en',
    heading: 'Account Deletion Confirmation 📋',
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

// ── Deletion Confirmation Email (STORY-054) ──────────────────────────────────────

function getDeletionStrings(locale) {
  return DELETION_I18N[locale] || DELETION_I18N['pt-BR'];
}

/**
 * Build the deletion confirmation email HTML body.
 */
function buildDeletionHtml(childFirstName, expiresAt, locale = 'pt-BR') {
  const s = getDeletionStrings(locale);
  const expiryDate = new Date(expiresAt).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="${s.lang}">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <h2 style="color:#c0392b;">${s.heading}</h2>
  <p>${s.greeting}</p>
  <p>${s.bodyIntro} <strong>${childFirstName}</strong>.</p>
  <p>${s.bodyDetails}</p>
  <p><strong>${s.cancelNote}</strong></p>
  <p style="text-align:center;margin:20px 0;padding:12px;background:#fef9e7;border-radius:6px;">
    ${s.supportContact}
  </p>
  <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
  <p><small>Exclusão programada para: ${expiryDate}</small></p>
</body>
</html>`;
}

/**
 * Build the deletion confirmation email plain text fallback.
 */
function buildDeletionText(childFirstName, expiresAt, locale = 'pt-BR') {
  const s = getDeletionStrings(locale);
  const expiryDate = new Date(expiresAt).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `${s.heading}

${s.greeting} ${s.bodyIntro} ${childFirstName}.

${s.bodyDetails}

${s.cancelNote}

${s.supportContact}

---
Scheduled deletion date: ${expiryDate}`;
}

/**
 * Send a deletion confirmation email with retry logic (STORY-054).
 * Returns { success: boolean }.
 * Never throws — graceful fallback on SMTP unavailability.
 */
export async function sendDeletionConfirmationEmail({ to, childFirstName, expiresAt, locale = 'pt-BR' }) {
  const recipientHash = hashEmail(to);

  if (!transport) {
    logger.warn({ recipientHash }, 'SMTP unavailable — deletion confirmation email skipped');
    return { success: false };
  }

  const s = getDeletionStrings(locale);
  const mailOptions = {
    from: FROM_ADDRESS,
    to,
    subject: s.subject,
    html: buildDeletionHtml(childFirstName, expiresAt, locale),
    text: buildDeletionText(childFirstName, expiresAt, locale),
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await transport.sendMail(mailOptions);
      logger.info({ recipientHash, attempt, messageId: info.messageId }, 'Deletion confirmation email dispatched');
      return { success: true, messageId: info.messageId };
    } catch (err) {
      const isTransient = TRANSIENT_CODES.has(err.code);

      logger.warn(
        { recipientHash, attempt, errCode: err.code, isTransient },
        'Deletion email send attempt failed'
      );

      if (!isTransient || attempt === MAX_RETRIES) {
        logger.error({ recipientHash, errCode: err.code }, 'Deletion email delivery failed — giving up');
        return { success: false };
      }

      await sleep(BACKOFF_DELAYS[attempt - 1]);
    }
  }

  return { success: false };
}