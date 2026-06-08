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

// ── Parent Auth Schemas (STORY-052) ──────────────────────────────────────────────

/**
 * Parent login schema — email + password.
 */
export const parentLoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Parent setup password schema — token + password (min 8, 1 uppercase, 1 number).
 */
export const parentSetupPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Parent refresh schema — refresh token (from cookie or body).
 */
export const parentRefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Book Validation Schemas ───────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;

/**
 * Sticker schema — positioned sticker on a book cover.
 * Normalized coordinates (0–100%) relative to cover dimensions.
 */
export const stickerSchema = z.object({
  svgId: z.string().trim().max(30),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  scale: z.number().min(0.5).max(2).default(1),
});

export const bookIdSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
});

export const bookCreateSchema = z.object({
  title: z.string().min(1).max(120).trim(),
  description: z.string().max(500).trim().optional().default(''),
  language: z.string().max(5).optional().default('pt-BR'),
});

export const bookUpdateSchema = z.object({
  title: z.string().min(1).max(120).trim().optional(),
  description: z.string().max(500).trim().optional(),
  language: z.string().max(5).optional(),
  templateId: z.string().max(50).trim().optional().nullable(),
  coverColor: z.string().trim().max(7).regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  coverPattern: z.enum(["none", "stripes", "dots", "stars", "chevron", "waves"]).optional().nullable(),
  spineColor: z.string().trim().max(7).regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  spineCustomized: z.boolean().optional(),
  isFavorited: z.boolean().optional(),
  edgeColor: z.string().trim().max(7).regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  edgePattern: z.enum(['solid', 'gradient', 'marbling', 'dots', 'chevron']).optional(),
  default_font: z.enum(['sans-serif', 'serif']).optional(),
  coverTitle: z.string().trim().max(120).optional().nullable(),
  stickers: z.array(stickerSchema).max(10).optional().default([]),
  coverAssetId: z.string().regex(objectIdRegex, 'Invalid asset ID format').optional().nullable(),
});

export const chapterCreateSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
  order: z.number().int().min(0),
  title: z.string().min(1).max(200).trim(),
  content: z.string().optional().default(''),
});

/**
 * Body schema for POST /api/v1/books/:bookId/chapters — create chapter.
 * Title and content are optional; defaults are computed in the manager.
 */
export const chapterCreateBodySchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  content: z.string().optional().default(''),
});

/**
 * Params schema for DELETE /api/v1/books/:bookId/chapters/:chapterId.
 */
export const chapterDeleteParamsSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
  chapterId: z.string().regex(objectIdRegex, 'Invalid chapter ID format'),
});

/**
 * Body schema for PATCH /api/v1/books/:bookId/chapters/reorder.
 * Accepts an array of chapter IDs with their new order values.
 */
export const chapterReorderSchema = z.object({
  chapters: z.array(
    z.object({
      id: z.string().regex(objectIdRegex, 'Invalid chapter ID format'),
      order: z.number().int().min(0),
    }),
  ).min(1).max(50),
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
  finished: z.boolean().optional(),
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
 * Params for GET /api/v1/books/:bookId/edit.
 */
export const bookEditParamsSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
});

/**
 * Params for GET /api/v1/reader/:bookId/chapters (public reader endpoint).
 */
export const readerChaptersParamsSchema = z.object({
  bookId: z.string().regex(objectIdRegex, 'Invalid book ID format'),
});

/**
 * Body for POST /api/v1/books (V2 — accepts both summary and description).
 * Normalizes summary → description.
 */
export const bookCreateSchemaV2 = z.object({
  title: z.string().min(1).max(120).trim(),
  summary: z.string().max(500).trim().optional().default(''),
  description: z.string().max(500).trim().optional(),
  language: z.string().max(5).optional().default('pt-BR'),
}).transform((data) => ({
  title: data.title,
  description: data.summary || data.description || '',
  language: data.language,
}));

// ── Reader Preferences Schemas (STORY-032) ──────────────────────────────────────

/**
 * Sync operation schema — single operation in a sync batch.
 * Discriminated union supporting 'chapter.update' and 'chapter.create'.
 */
export const syncOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chapter.update'),
    chapterId: z.string().regex(objectIdRegex, 'Invalid chapter ID format'),
    content: z.string(),
    clientTimestamp: z.string().datetime({ offset: true }),
    baseVersion: z.number().int().min(1),
  }),
  z.object({
    type: z.literal('chapter.create'),
    bookId: z.string().min(1),
    title: z.string().min(1).max(100).optional(),
    content: z.string().optional(),
    clientTimestamp: z.string().datetime({ offset: true }).optional(),
    tempChapterId: z.string().min(1).optional(),
  }),
]);

/**
 * POST /api/v1/chapters/sync — batch sync request schema.
 * Max 50 operations per batch to prevent abuse.
 */
export const syncBodySchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(50),
});

/**
 * Reader preferences update schema — partial update.
 * Only whitelist enum values; missing fields are kept as-is.
 */
export const readerPreferencesSchema = z.object({
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  theme: z.enum(['light', 'sepia', 'dark']).optional(),
  readingMode: z.enum(['paginated', 'scroll']).optional(),
}).strict().refine(
  (data) => data.fontSize !== undefined || data.theme !== undefined || data.readingMode !== undefined,
  { message: 'At least one preference field must be provided' },
);

// ── Reading Session Schema (STORY-053) ────────────────────────────────────────

/**
 * Body schema for POST /api/v1/books/:bookId/reading-session.
 * durationMs: 1s–24h in milliseconds. startedAt/endedAt are optional ISO datetime strings.
 */
export const readingSessionSchema = z.object({
  durationMs: z.number().int().min(1000).max(86400000),
  startedAt: z.string().datetime({ offset: true }).optional(),
  endedAt: z.string().datetime({ offset: true }).optional(),
});