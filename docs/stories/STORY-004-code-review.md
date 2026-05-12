# Code Review Report — STORY-004 (2026-05-12) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | B | B | 95%+ |

## Critical Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `book-model.js:75` | Text index specifies `collation: { locale: 'simple' }`. MongoDB text indexes do NOT support collation option. Will throw `IndexOptionsConflict` at schema sync. | Remove `collation` from text index. Text indexes have own language handling via `default_language` and `language_override`. Change to: `bookSchema.index({ title: 'text' }, { language_override: 'searchLanguage' })` |
| `migrations/001-create-collections.js:38` | Text index creation omits `language_override: 'searchLanguage'` (model line 75 has it). Without it, MongoDB interprets doc's `language` field (`'pt-BR'`) as text index language. `'pt-BR'` is NOT a valid MongoDB language code — only `'pt'` is. Seed data will fail with `language unsupported` error. | Add `language_override: 'searchLanguage'` option. Same fix as model: `{ title: 'text' }, { language_override: 'searchLanguage' }`. Remove `collation` — invalid on text indexes. |
| `migrations/002-seed-dev.js:20,28,35` | Seed books use `language: 'pt-BR'`. Combined with migration 001 text index that lacks `language_override`, MongoDB reads `language` field as text language → crash. This is root cause of QA DEF-001. | Either change to `language: 'pt'` (valid MongoDB code for Portuguese), OR (better) fix migration 001 first to add `language_override: 'searchLanguage'` so the `language` field is ignored by text index. |

## Major Issues

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `migrations/001-create-collections.js:38` | Text index `collation` option is invalid on text indexes in MongoDB 7.1+. Will fail in production-like environments. | Remove `{ collation: { locale: 'simple' } }` — text indexes have built-in language handling. |
| `book-dao.js:153` | `createActivityLog` returns raw Mongoose doc. All other `create*` DAO functions (lines 7, 44, 76, 115) properly call `.toObject()` to return plain objects. Inconsistency breaks DAO contract per `nodejs-domain-structure.md`. | Change to: `const doc = await ActivityLog.create(data); return doc.toObject();` |
| `book-manager.js:59,130` | Fire-and-forget audit logging uses `.catch(() => {})` — swallows ALL errors silently. If ActivityLog collection is down, no visibility. Violates security.md error handling pattern (log errors with context). | Change to: `.catch((err) => { logger.error({ err, action: 'audit_log_failed' }, 'Failed to create activity log'); })` |
| `book-manager.js:115-119` | Cascade soft-delete uses `Promise.all`. If one child collection fails (e.g., network blip on sharded cluster), Book IS soft-deleted but some children remain active. Inconsistent state under partial failure. | Wrap cascade + book soft-delete in MongoDB transaction (replica set). Or at minimum: sequential awaits with rollback on first failure. |
| `book-manager.js` (missing) | No `restoreBookManager` function. Soft-delete pattern incomplete — can soft-delete but cannot undo. Future admin tooling will need this. | Add `restoreBookManager(bookId, authorId)` that sets `deletedAt: null` on book + cascades to children. |
| `book-model.js:228-231` | `actorId` in ActivityLog schema has no `ref` or comment explaining polymorphism. Can reference Child, Parent, or System. Future devs may assume it refs Child. | Add inline comment: `// Polymorphic — can ref Child, Parent, or System. No `ref` due to multiple target collections.` |

## Minor Issues

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `book-model.js:75` | `language_override: 'searchLanguage'` references a field `searchLanguage` not defined in schema. Works (MongoDB falls back to default `'english'`) but opaque. | Either add hidden `searchLanguage: { type: String, default: 'portuguese' }` to schema, or add comment explaining fallback behavior. |
| `book-dao.js:84-88` | `findAssetsByBook` has no pagination (no `limit`/`skip`). Books with many cover art variants could return large result sets. | Add `{ limit = 50, skip = 0 }` params matching pattern in `findBooksByAuthor` and `findChaptersByBook`. |
| `migrations/002-seed-dev.js:117` | Production guard checks `process.env.NODE_ENV === 'production'`. Staging environments also should NOT run seed data. | Change to: `if (process.env.NODE_ENV !== 'development')` or add explicit staging check. |
| `migrations/002-seed-dev.js:58-68` | Only 1 asset seeded (for Book 1). Tech analysis specifies 1 asset PER book. Books 2 and 3 have no cover assets. | Add assets for Book 2 and Book 3 (even if placeholder URLs). |
| `book-manager.js:22` | `MAX_BOOKS_PER_USER = 100` matches NFR-SCL-02 but no constant file (`book-constants.js`) per `nodejs-domain-structure.md` contract. | Extract to `book-constants.js` with `UPPER_SNAKE_CASE`. Import in manager. |
| `book-dao.js:25-28` | `softDeleteBook` updates `deletedAt` but does NOT cascade `coverAssetId = null`. If book is restored, coverAssetId references a still-soft-deleted Asset. | Add `coverAssetId: null` to soft-delete update for referential consistency. |

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| BackendDeveloper | `migrations/001-create-collections.js:38` | Text index missing `language_override`, has invalid `collation`. Root cause of DEF-001. |
| BackendDeveloper | `book-model.js:75` | Text index has invalid `collation` option. |
| BackendDeveloper | `book-dao.js:153` | `createActivityLog` returns Mongoose doc, not plain object. |
| BackendDeveloper | `book-manager.js:59,130` | Silent error swallowing in audit logging. |
| BackendDeveloper | `book-manager.js:115-119` | Cascade soft-delete lacks transaction. |

---
`VERDICT: BLOCKED — requires rework`
