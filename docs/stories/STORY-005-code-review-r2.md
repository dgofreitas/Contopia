# Code Review Report — feat/STORY-005-core-rest-api (2026-05-14) [r2]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | B+ | B | B |

## Context

R1 (prior report) found 1 Major issue (M1): DELETE + POST publish missing `validate(bookIdSchema, 'params')`. **Blocking fix applied** — both routes now include validation middleware at `book-router.js:91` and `:101`.

All 489 tests pass. No new test failures.

---

## Critical Issues

None.

---

## Major Issues

### M1: GET + PUT progress routes skip bookId param validation
`book-router.js:149` `GET /:bookId/progress` — no `validate(bookIdSchema, 'params')`.
`book-router.js:166` `PUT /:bookId/progress` — body validated via `progressUpdateSchema` but params unvalidated.

Same defect class as r1's M1 (now fixed). Invalid bookId reaches Mongoose → CastError → 500 fallback. Error handler masks internals (no leak) but inconsistent with all other `:bookId` routes. Breaks project standard: "validate all user input."

**Fix:** Add `validate(bookIdSchema, 'params')` to both:
```js
router.get('/:bookId/progress', validate(bookIdSchema, 'params'), async (req, res) => {
  const progress = await bookManager.getReadingProgressManager(req.childId, req._params.bookId);
```
```js
router.put('/:bookId/progress', validate(bookIdSchema, 'params'), validate(progressUpdateSchema, 'body'), async (req, res) => {
  const progress = await bookManager.updateReadingProgressManager(req.childId, req._params.bookId, req._body);
```

---

## Minor Issues

### m1: DELETE + POST publish use `req.params` instead of `req._params`
`book-router.js:93` `req.params.bookId` — should be `req._params.bookId` (parsed by `validate`).
`book-router.js:105` Same pattern.

Other routes with param validation (`GET /:bookId:56`, `PATCH /:bookId:78`, `GET /:bookId/chapters:117`) all use `req._params` convention. Not a functional bug (Zod passes strings through unchanged for regex-only schemas) but breaks established pattern.

### m2: Dynamic import in route handler (unresolved from r1)
`book-router.js:60` — `const { findBookById } = await import('./book-dao.js')`. Node caches after first call so perf is fine, but inconsistent with top-level static imports on all other routes.

### m3: Payload limit 10MB vs spec 1MB (unresolved from r1)
`app.js:37` — `express.json({ limit: '10mb' })`. Should be `limit: '1mb'`.

### m4: `paginated()` omits `requestId` from meta (unresolved from r1)
`response-envelope.js:19` — returns `{ data, meta: { pagination } }` without `requestId`. All other envelope responses include it.

### m5: Rate-limit docstring says "sliding window" (unresolved from r1)
`rate-limit-middleware.js:1` — INCR + EXPIRE is fixed window, not sliding. Update comment.

### m6: Ownership check inline in `GET /:bookId` router (unresolved from r1)
`book-router.js:67` — ownership checked directly in handler. All other endpoints delegate to manager layer. Inconsistent authz pattern.

### m7: Test middleware chain doesn't mirror production (unresolved from r1)
`book-router.test.js:57` — mounts `[auth, rateLimit, bookRouter]` as single middleware chain. Production mounts auth+rateLimit at `/api/v1` level, router separately. Won't catch ordering regressions.

### m8: Test coverage gaps (unresolved from r1)
`book-router.test.js` — 7 tests for 13 routes. Missing: PATCH, DELETE, GET /:bookId, POST publish, progress endpoints, 404 edge cases.
`chapter-router.test.js` — 3 tests. Missing: 404 not found, invalid chapterId edge cases.

---

## Positive Observations

- ✅ R1 blocking fix (M1) applied correctly — DELETE + POST publish now validate bookId
- ✅ All 489 tests pass, 0 failures
- ✅ Strong ownership checks on all mutation paths
- ✅ Consistent envelope (ok/paginated/fail) across endpoints
- ✅ Clean layered architecture: router → manager → DAO → model
- ✅ Fail-open Redis rate limit with graceful degradation
- ✅ No sensitive data leakage in error responses
- ✅ Fire-and-forget audit logging with error catch

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| rate-limit-middleware | 10 | ✅ Comprehensive |
| validation-middleware | 12 | ✅ Comprehensive |
| response-envelope | 6 | ✅ Sufficient |
| book-router | 7 | ⚠️ Gaps (m8) |
| chapter-router | 3 | ⚠️ Light |

**Total: 489 tests, 0 failures** (includes non-STORY-005 tests)

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| BackendDeveloper | backend/src/app/book/book-router.js:149 | M1: Add `validate(bookIdSchema, 'params')` to `GET /:bookId/progress` |
| BackendDeveloper | backend/src/app/book/book-router.js:166 | M1: Add `validate(bookIdSchema, 'params')` to `PUT /:bookId/progress` |
| BackendDeveloper | backend/src/app/book/book-router.js:93 | m1: Use `req._params.bookId` instead of `req.params.bookId` |
| BackendDeveloper | backend/src/app/book/book-router.js:105 | m1: Use `req._params.bookId` instead of `req.params.bookId` |

---

`VERDICT: BLOCKED — requires rework`
