// Contopia — Email Transport Configuration
import { createTransport } from 'nodemailer';
import pino from 'pino';

const logger = pino({ name: 'email-config', level: process.env.LOG_LEVEL || 'info' });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_ADDRESS = process.env.PARENT_EMAIL_FROM || 'noreply@estantedigital.example';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'privacy@estantedigital.app';

/**
 * Create and export the Nodemailer transport.
 * If SMTP_HOST is not configured, returns null — callers must handle gracefully.
 */
const transport = SMTP_HOST
  ? createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    })
  : null;

if (!transport) {
  logger.warn('SMTP_HOST not set — email delivery is disabled');
}

export { transport, FROM_ADDRESS, SUPPORT_EMAIL };