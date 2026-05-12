# Code Review Report — STORY-004 (2026-05-12) [r2]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | B | B | A |

## Category Ratings
| Category | Rating | Notes |
|----------|--------|-------|
| Schema Correctness | ✅ | All 5 schemas match Section 2 specs. Correct deviation: no `users` collection per stack override |
| Index Design | ⚠️ | Migration text index missing `language_override`. Model vs migration mismatch |
| Soft Delete Pattern | ✅ | Consistent `deletedAt` across all entities. ActivityLog correctly excluded. Cascade via manager |
| Business Logic | ⚠️ | Cascade correct. Quota enforcement constant declared but dead (not wired). Missing restore functions |
| Migration Safety | ⚠️ | Up/down idempotent. Text index bug blocks seed with `pt-BR`. Drop order correct |
| Code Clarity | A | Clean DAO/Manager separation. Consistent naming. Small focused functions |
| NFR Compliance | ⚠️ | PERF-05 ✅ (index covers sort). SCL-02 partial (book limit works, asset quota constant dead). SCL-03 ✅. PRV-03 ✅. AVL-02 ✅ |

## Critical Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `migrations/001-create-collections.js:38` | Text index missing `language_override: 'searchLanguage'`. Model (`book-model.js:75`) has it. Migration creates `{ title: 'text' }` without this option → seed with `language: 'pt-BR'` fails. Root cause of QA DEF-001 | Add `language_override: 'searchLanguage'` to the text index `createIndex` call. Match the model definition exactly |
| `backend/src/app/book/book-manager.js:23` | `ASSET_QUOTA_BYTES = 524_288_000` defined but never referenced. `sumAssetBytesByAuthor` NOT imported (not in lines 2-18 imports). Quota enforcement against 500MB is **declared but not wired** — dead code | Either import `sumAssetBytesByAuthor` and enforce quota on asset upload, or remove dead constant. If quota enforcement lives in storage module, move constant there and remove from manager |

## Major Issues

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `backend/src/app/book/book-manager.js:59,124,165` | Fire-and-forget `createActivityLog().catch(() => {})` silently swallows audit log errors. Audit trail gaps go undetected | Log the error at minimum: `.catch(err => logger.error({ err }, 'Audit log failed'))`. Or make audit non-fire-and-forget with queue |
| `backend/src/app/book/book-manager.js` | No `restoreBookManager()` function. Soft-delete (set `deletedAt = null`) is possible via DAO (`updateBookById`) but manager has no restore operation | Add `restoreBookManager(bookId, authorId)` with ownership check → sets `deletedAt: null` + cascade restore children |
| `backend/src/app/book/book-dao.js` | No DAO-level `restore` functions. Only `softDelete` and `hardDelete` exist for Book/Chapter/Asset/ReadingProgress | Add `restoreBook(id)`, `restoreChapter(id)`, etc. (set `deletedAt: null` via `findOneAndUpdate`) |
| `backend/src/app/book/book-manager.js` | No asset upload endpoint in manager. Quota cannot be enforced here even if wired — no upload function exists | Add `uploadAssetManager` or integrate quota check into storage module. Constant has no consumer |
| `backend/migrations/002-seed-dev.js:20,28,35` | Seed assigns `language: 'pt-BR'` to books. This is the trigger for DEF-001 — MongoDB text index interprets `language` field as text language override. `pt-BR` is not valid | Either: (a) change seed to `language: 'pt'`, or (b) add `language_override: 'searchLanguage'` to migration's text index (fix Critical). Seed data should avoid triggering this bug |

## Minor Issues

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `backend/src/app/book/book-manager.js:23` | Dead code: `ASSET_QUOTA_BYTES` defined in manager but no asset operations exist here. Misleading | Move to storage module or add asset operations to manager |
| `backend/src/app/book/book-dao.js` | No `softDeleteReadingProgressByUser(userId)` function. If user is soft-deleted, individual progress records can't be cascade-deleted by userId | Add for completeness (though Child cascade is in auth module) |
| `backend/migrations/002-seed-dev.js:117-119` | Production guard `if (NODE_ENV === 'production')` uses loose equality string check. Works but fragile — case-sensitive | Consider `process.env.NODE_ENV?.toLowerCase() === 'production'` |
| `backend/migrations/002-seed-dev.js:206-210` | Validation logs `countDocuments()` across all collections but doesn't throw if counts are wrong. Manual check only | Add assertions: `if (count !== expected) throw new Error(...)` for automated validation |
| `backend/src/app/book/book-model.js:63-74` | Book indexes 1-3 all use `{ deletedAt: 1 }` in key pattern WITH `partialFilterExpression: { deletedAt: null }`. This adds 12 bytes per index entry. Acceptable for correctness but adds index size | Consider: partial filter alone suffices for query matching. The `deletedAt: 1` in key can be dropped from compound keys if always filtered by `deletedAt: null`. Benefit: smaller index keys. Risk: `explain()` may not always prefer partial index — test before changing |
| `backend/src/app/book/book-dao.js:91-96` | `sumAssetBytesByAuthor` aggregate not indexed for `authorId` alone — relies on `{ authorId: 1, deletedAt: 1 }` partial index. `$match` uses `authorId + deletedAt: null` which aligns. Correct but verify with `explain()` | Confirm index covers this aggregation at scale |

## Missing Features (Not Blocking)

| Feature | Expected | Location |
|---------|----------|----------|
| Child→Book cascade | Tech Analysis Section 3.1 specifies Child soft-delete cascades to Books/ReadingProgress | Auth module (STORY-001). Not in STORY-004 scope. Tracked as DEF-002 |
| Chapter reorder logic | Tech analysis mentions integer gaps (100) for cheap reorder | No reorder function in manager. Expected in future story |
| Asset upload endpoint | Tech analysis references quota enforcement on upload | Storage module (not created yet per scaffolding plan) |

## Rework Delegation
| Agent | File:Line | Issue |
|-------|-----------|-------|
| BackendDeveloper | `migrations/001-create-collections.js:38` | Critical: add `language_override: 'searchLanguage'` to text index |
| BackendDeveloper | `backend/src/app/book/book-manager.js:2-18` | Critical: import `sumAssetBytesByAuthor` + wire quota enforcement |
| BackendDeveloper | `backend/migrations/002-seed-dev.js:20,28,35` | Major: update seed data to avoid `pt-BR` (or fix migration index first) |
| BackendDeveloper | `backend/src/app/book/book-manager.js` | Major: add restore functions (manager + DAO) |
| BackendDeveloper | `backend/src/app/book/book-manager.js:59,124,165` | Major: don't silently swallow audit log errors |

---
`VERDICT: BLOCKED — requires rework`
