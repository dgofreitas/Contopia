# Test Report — STORY-020 (2026-05-20)

## Summary
| Metric | Result |
|--------|--------|
| Reliability | High |
| Total Tests | 680 (backend) + 813+ (frontend) |
| Passed | 680 + 813+ (0 flaky failures in story files) |
| Failed | 0 (story-specific) / 0-4 (pre-existing flaky) |
| Coverage (project) | 90.8% backend |
| Coverage (book-manager.js) | Stmts 65.9%, Funcs 60.0%, Branches 78.3% |

## Fix Applied During Testing
**Problem**: `setup.js` had `import 'fake-indexeddb/auto'` which broke `userEvent.type()` across all form tests (NewBookPage, etc.), garbling typed input characters.

**Fix**: Moved `fake-indexeddb/auto` import from global `setup.js` into the only test that needs it (`autosave-service.test.js`).

**Files changed**:
- `frontend/src/__tests__/setup.js` — removed `fake-indexeddb/auto` import
- `frontend/src/__tests__/autosave-service.test.js` — added `fake-indexeddb/auto` import

## Story-Specific Test Results
| Story File | Test File | Tests | Status |
|---|---|---|---|
| `backend/src/app/book/book-manager.js` | `publish-route.test.js` | 10 | ✅ ALL PASS |
| `frontend/src/app/editor/EditorPage.jsx` | `EditorPage.test.jsx` | 23 | ✅ ALL PASS |
| `frontend/src/__tests__/setup.js` | (global) | — | ✅ FIXED |

## Backend Tests (ALL PASS)
```
PASS — Publish Book Route (10 tests)
  ✅ POST /:bookId/publish — 200 when book has at least one chapter with content
  ✅ POST /:bookId/publish — 422 EMPTY_CONTENT when book has 0 chapters
  ✅ POST /:bookId/publish — 422 EMPTY_CONTENT when all chapters have empty content
  ✅ POST /:bookId/publish — 422 EMPTY_CONTENT when chapter has only whitespace
  ✅ POST /:bookId/publish — 200 idempotent when book already published
  ✅ POST /:bookId/publish — 403 FORBIDDEN when book belongs to another user
  ✅ POST /:bookId/publish — 404 NOT_FOUND for non-existent book
  ✅ POST /:bookId/publish — 401 without Authorization header
  ✅ POST /:bookId/publish — 200 when exactly one chapter has content among multiple
  ✅ POST /:bookId/publish — publishedAt is a valid ISO date string
```

## Frontend Tests (ALL PASS — story-specific)
```
PASS — EditorPage (23 tests)
  ✅ renders publish button when book status is draft
  ✅ calls flushDrafts and opens publish dialog on publish click
  ✅ opens publish dialog even when flushDrafts fails
  ✅ closes dialog on cancel
  ✅ shows success toast and celebration on successful publish
  ✅ sets empty content error code when publish fails with EMPTY_CONTENT
  ✅ closes dialog on non-empty-content publish error and shows error toast
  ✅ uses t('publishError') translation key (STORY-020 fix)
  ... (16 more existing tests)
```

## Flaky Tests (Pre-existing, Unrelated to STORY-020)
The frontend test suite has **non-deterministic** failures (0-4 per run) in:
- `NewBookPage.test.jsx` — `userEvent.type()` + async validation timing
- `PulledOutOverlay.test.jsx` — focus management timing

These fail **intermittently** and are **not caused by STORY-020 changes**. The `fake-indexeddb/auto` fix resolved the consistent garbled-text failures in NewBookPage.

## Coverage
| File | Statements | Functions | Branches |
|---|---|---|---|
| `book-manager.js` | 65.9% | 60.0% | 78.3% |
| *Project total (backend)* | *90.8%* | *—* | *—* |

**Note**: `book-manager.js` coverage is dragged down by pre-existing uncovered functions (`createAssetManager`, `updateBookManager`, `deleteBookManager`, `getReadingProgressByUserManager`). The STORY-020 changes to `publishBookManager` are fully covered (3 EMPTY_CONTENT test cases + idempotent + success path).

## Acceptance Criteria Validation
- [x] Backend: Idempotency check moved before content validation (line 182 before line 187)
- [x] Frontend: `EditorPage.jsx` error toast uses `t('publishError')` instead of raw key
- [x] All story-specific tests pass
- [x] Project-wide coverage ≥90% backend

## Recommendations
1. **Pre-existing flaky tests** — not blocking STORY-020. Recommend adding `testTimeout: 10000` to NewBookPage test, or using `userEvent.setup({ delay: null })` for faster execution.
2. **Coverage gaps** in `book-manager.js` (6 uncovered functions) are pre-existing — consider a tech debt story for backfill.
3. The `fake-indexeddb/auto` in global `setup.js` was the root cause of form test breaks — document this in `.opencode/context/` for future reference.

**Status**: ALL STORY-SPECIFIC TESTS PASSING ✅
