// Contopia — Validation Middleware Factory (Zod)
import { fail } from './response-envelope.js';

/**
 * Child-friendly Zod error message mapping.
 * Maps Zod issue codes/messages to user-facing messages.
 */
const FRIENDLY_MESSAGES = {
  too_small: {
    string: 'Please give your book a title',
    number: 'That doesn\'t look right — please try again',
  },
  too_big: {
    string: 'Sorry, that\'s too long — try a shorter one!',
    number: 'That doesn\'t look right — please try again',
  },
  invalid_string: 'That doesn\'t look right — please try again',
  invalid_type: 'That doesn\'t look right — please try again',
  invalid_enum_value: 'That doesn\'t look right — please try again',
  custom: 'That doesn\'t look right — please try again',
};

function mapZodIssue(issue) {
  // Path-based overrides (check before keyword-based fallback)
  const path = issue.path || [];
  const pathStr = path.join('.');

  if (issue.code === 'invalid_type' && pathStr === 'title') return 'Please give your book a title';
  if (issue.code === 'invalid_type' && /^(bookId|chapterId|childId|parentId)$/.test(pathStr)) return 'That doesn\'t look right — please try again';

  // Specific keyword-based overrides
  const msg = issue.message?.toLowerCase() || '';

  if (msg.includes('required title')) return 'Please give your book a title';
  if (msg.includes('at least one field')) return 'Please provide something to update';
  if (msg.includes('invalid') && msg.includes('id')) return 'That doesn\'t look right — please try again';
  if (msg.includes('invalid book id')) return 'That doesn\'t look right — please try again';
  if (msg.includes('invalid chapter id')) return 'That doesn\'t look right — please try again';
  if (msg.includes('title') && msg.includes('120')) return 'Try a shorter title — under 120 characters works best!';
  if (msg.includes('summary') && msg.includes('500')) return 'Keep your summary under 500 characters — short and sweet!';
  if (msg.includes('description') && msg.includes('500')) return 'Keep your summary under 500 characters — short and sweet!';

  // Type-specific mapping
  const typeMap = FRIENDLY_MESSAGES[issue.code];
  if (typeMap && typeof typeMap === 'object') {
    const typedMsg = typeMap[issue.expected?.toLowerCase?.()];
    if (typedMsg) return typedMsg;
  }
  if (typeof typeMap === 'string') return typeMap;

  // Fallback
  return 'That doesn\'t look right — please try again';
}

/**
 * Generic Zod validation middleware factory.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} source - Where to find the data on the request
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const messages = result.error.issues.map(mapZodIssue);
      const combined = messages.join('; ');
      return res.status(400).json(
        fail('VALIDATION_ERROR', combined, { requestId: req.id }),
      );
    }
    // Attach parsed data for downstream handlers
    req[`_${source}`] = result.data;
    next();
  };
}