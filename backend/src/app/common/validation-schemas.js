// Contopia — Validation Schemas (Zod)
import { z } from 'zod';

/**
 * Register schema — parent email + child first name.
 * childFirstName allows Unicode letters (accented names common in pt-BR).
 */
export const registerSchema = z.object({
  parentEmail: z.string().email(),
  childFirstName: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\p{L}]+$/u, 'First name must contain only letters'),
});

/**
 * Resend verification schema — just the parent email.
 */
export const resendSchema = z.object({
  parentEmail: z.string().email(),
});

/**
 * Child login schema — childId + parentId.
 */
export const childLoginSchema = z.object({
  childId: z.string().min(1).regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
  parentId: z.string().min(1).regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
});

/**
 * Login schema — discriminated union: password method or magic-link method.
 */
export const loginSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('password'),
    childId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
    password: z.string().min(4).max(20),
  }),
  z.object({
    method: z.literal('magic-link'),
    parentEmail: z.string().email(),
    childFirstName: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[\p{L}]+$/u, 'First name must contain only letters'),
  }),
]);

/**
 * Logout schema — sessionId echoed for audit (actual sessionId from JWT).
 */
export const logoutSchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * Refresh schema — refresh token string.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Book Validation Schemas ───────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;

export const bookIdSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
});

export const bookCreateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional().default(''),
  language: z.string().max(5).optional().default('pt-BR'),
});

export const bookUpdateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  language: z.string().max(5).optional(),
});

export const chapterCreateSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
  order: z.number().int().min(0),
  title: z.string().min(1).max(200).trim(),
  content: z.string().optional().default(''),
});

export const chapterUpdateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  content: z.string().optional(),
  order: z.number().int().min(0).optional(),
  wordCount: z.number().int().min(0).optional(),
});

export const progressUpdateSchema = z.object({
  lastChapterId: z.string().regex(objectIdRegex, 'Invalid chapter ID format').optional().nullable(),
  lastPosition: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
});

// ── STORY-005: New Schemas ────────────────────────────────────────────────────

/**
 * Query params for GET /api/v1/books (paginated list).
 */
export const bookListQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Params for GET /api/v1/books/:bookId/chapters.
 */
export const bookChaptersParamsSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
});

/**
 * Params for PUT /api/v1/chapters/:chapterId.
 */
export const chapterPutSchema = z.object({
  chapterId: z.string().regex(objectIdRegex, 'Invalid chapter ID format'),
});

/**
 * Body for PUT /api/v1/chapters/:chapterId.
 * At least one of title, content, or wordCount must be provided.
 */
export const chapterPutBodySchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  content: z.string().optional(),
  wordCount: z.number().int().min(0).optional(),
}).refine(
  (data) => data.title !== undefined || data.content !== undefined || data.wordCount !== undefined,
  { message: 'At least one field must be provided for update' },
);

/**
 * Body for POST /api/v1/books (V2 — accepts both summary and description).
 * Normalizes summary → description.
 */
export const bookCreateSchemaV2 = z.object({
  title: z.string().min(1).max(200).trim(),
  summary: z.string().max(2000).trim().optional().default(''),
  description: z.string().max(2000).trim().optional(),
  language: z.string().max(5).optional().default('pt-BR'),
}).transform((data) => ({
  title: data.title,
  description: data.summary || data.description || '',
  language: data.language,
}));