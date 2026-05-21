# QA Report — STORY-020: Publish Book to Shelf (2026-05-20) [r2]

## Summary
| Tests | Passed | Failed | Coverage |
|-------|--------|--------|----------|
| 33 (10 backend + 23 frontend) | 33 | 0 | ~98.2% avg (verified in r1) |

**Source: TestEngineer (r1) — re-run confirmed ✅**

## Test Suites
| Type | Status |
|------|--------|
| Backend Integration — `publish-route.test.js` (10 tests) | ✅ PASS |
| Frontend — `EditorPage.test.jsx` (23 tests) | ✅ PASS |

## Re-validation Scope

This is a **targeted re-validation** confirming two specific fixes from the original QA report (r1):

| # | Fix | File | Status |
|---|-----|------|--------|
| Fix 1 | Idempotency check runs BEFORE chapter content validation | `backend/src/app/book/book-manager.js` lines 182-184 | ✅ CONFIRMED |
| Fix 2 | Error toast passes localized message `t('publishError')` instead of raw key | `frontend/src/app/editor/EditorPage.jsx` line 124 | ✅ CONFIRMED |

### Fix 1 — Idempotency Check Placement (book-manager.js)

```javascript
// Lines 182-184 — NOW BEFORE content validation
if (book.status === 'published') {
  return book; // Idempotent early return  ✅
}

// Lines 186-194 — Only reached if NOT already published
const chapters = await findChaptersByBook(bookId);
const hasContent = chapters.some(ch => (ch.content || '').trim().length > 0);
```

**Before (r1 issue):** Content validation ran first → re-publishing an already-published book with no chapters returned 422 instead of 200.

**After (r2 fix):** `if (book.status === 'published') return book;` at line 182 returns immediately with 200 before any chapter query or content check. The chapter query only runs for draft books.

### Fix 2 — Localized Toast Message (EditorPage.jsx)

```javascript
// Line 124 — NOW uses localized translation
addToast('PUBLISH_ERROR', t('publishError'));  // ✅
```

**Before (r1):** `addToast('PUBLISH_ERROR', 'PUBLISH_ERROR')` — rendered the raw key string `'PUBLISH_ERROR'` to the user.

**After (r2):** `addToast('PUBLISH_ERROR', t('publishError'))` — renders the localized message `"Something went wrong. Please try again."` via i18n.

## Test Results

### Backend: publish-route.test.js (10/10 PASS)
```
✓ POST /:bookId/publish — 200 when book has at least one chapter with content
✓ POST /:bookId/publish — 422 EMPTY_CONTENT when book has 0 chapters
✓ POST /:bookId/publish — 422 EMPTY_CONTENT when all chapters have empty content
✓ POST /:bookId/publish — 422 EMPTY_CONTENT when chapter has only whitespace
✓ POST /:bookId/publish — 200 idempotent when book already published
✓ POST /:bookId/publish — 403 FORBIDDEN when book belongs to another user
✓ POST /:bookId/publish — 404 NOT_FOUND for non-existent book
✓ POST /:bookId/publish — 401 without Authorization header
✓ POST /:bookId/publish — 200 when exactly one chapter has content among multiple
✓ POST /:bookId/publish — publishedAt is a valid ISO date string
```

### Frontend: EditorPage.test.jsx (23/23 PASS)
```
✓ renders sidebar and editor
✓ renders publish button for draft books
✓ does not render publish button for published books
✓ opens publish dialog when button is clicked
✓ closes publish dialog on cancel
✓ closes publish dialog on Escape
✓ calls publishBook.mutateAsync on confirm
✓ shows loading state during publish
✓ shows success toast after publish
✓ navigates to shelf after 2s delay
✓ shows error toast on publish failure
✓ shows empty content error in dialog
✓ (remaining 11 tests — all passed)
```

## Acceptance Criteria Validation (re-validated)
| AC | Description | Status | Notes |
|----|-------------|--------|-------|
| AC-1 | Confirmation dialog appears on publish | ✅ PASS | Unchanged |
| AC-2 | Book appears on shelf (newest first) | ✅ PASS | Unchanged |
| AC-3 | Default spine/cover if no custom cover | ✅ PASS | Unchanged |
| AC-4 | Empty content prevented with gentle message | ✅ PASS | Unchanged |
| AC-5 | Custom cover updates later | ✅ PASS | Unchanged |
| AC-6 | Screen reader announces success + focus | ✅ PASS | Unchanged |

## Issues from r1 — Re-validation Status
| r1 Issue | Severity | Fix Applied | r2 Status |
|----------|----------|-------------|-----------|
| Content validation runs before idempotency check | MINOR | ✅ Idempotency check moved to line 182, before chapter query | **RESOLVED** |

## NFR Validation (unchanged from r1)
| NFR | Metric | Target | Actual | Status |
|-----|--------|--------|--------|--------|
| NFR-PERF-05 | Response time | P95 < 500ms | ⚪ Not benchmarked | ⚪ NOT VERIFIED |
| NFR-ACC-01 | Keyboard accessibility | WCAG 2.1 AA | — | ✅ PASS |
| NFR-ACC-03 | Screen reader announcements | aria-live | — | ✅ PASS |
| NFR-ACC-04 | Text contrast 4.5:1 | 4.5:1 | — | ✅ PASS |
| NFR-SEC-04 | Server-side validation | Auth + content guards | — | ✅ PASS |

## Validation Flow
```mermaid
flowchart TD
    A[Fix 1: Idempotency reorder] --> B[Read book-manager.js lines 166-204]
    B --> C{book.status === 'published'?}
    C -->|Yes| D[return book immediately ✅]
    C -->|No| E[Query chapters → validate content]
    E -->|Has content| F[Update status to published ✅]
    E -->|Empty| G[Throw 422 EMPTY_CONTENT ✅]

    H[Fix 2: Localized toast] --> I[Read EditorPage.jsx line 124]
    I --> J{addToast param}
    J -->|'PUBLISH_ERROR', t('publishError')| K[✅ Localized message shown]
    J -->|'PUBLISH_ERROR', 'PUBLISH_ERROR'| L[❌ Raw key shown]

    M[Re-run backend tests] --> N{10/10 pass?}
    N -->|Yes| O[✅ publish-route]
    P[Re-run frontend tests] --> Q{23/23 pass?}
    Q -->|Yes| R[✅ EditorPage]
```

## Recommendations
1. ✅ **r1 MINOR issue resolved** — Idempotency check now correctly placed before content validation.
2. ✅ **r1 LOW issue resolved** — Error toast now passes `t('publishError')` instead of raw key.
3. ⚪ **NFR-PERF-05** still not benchmarked (unchanged from r1 — out of scope for re-validation).
4. **No new issues found.** All 10 backend + 23 frontend tests pass.

---

**Status**: PASSED ✅ — Both fixes confirmed, all tests green.
