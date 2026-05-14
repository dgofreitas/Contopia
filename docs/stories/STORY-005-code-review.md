# Code Review Report — STORY-005 (2026-05-14) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | A- | B+ | B+ |

**Positive observations:**
- ✅ Strong ownership checks on all mutation paths (chapter-manager, book-manager)
- ✅ Child-friendly error messages in validation middleware
- ✅ Consistent envelope pattern (ok/paginated/fail) across all endpoints
- ✅ Fail-open Redis rate-limit (graceful degradation)
- ✅ Soft-delete cascade pattern on book delete
- ✅ Comprehensive indexes and partial filter expressions
- ✅ Clean separation: middleware → manager → DAO → model
- ✅ Zod transform normalizes `summary` → `description` (V2 schema)
- ✅ Fire-and-forget audit logging with error catch
- ✅ Rate limit tests are thorough (10 cases, all edge paths covered)

---

## 🔴 Critical Issues

None found.

---

## 🟡 Major Issues

### M1: DELETE + POST publish skip ObjectId validation
`book-router.js:91` — DELETE uses raw `req.params.bookId` without `validate(bookIdSchema, 'params')`.
`book-router.js:101` — POST publish same issue.

Malformed bookId reaches Mongoose → CastError → 500 fallback. Not a security leak (error handler masks details) but poor UX and inconsistent with all other routes.

**Fix**: Add `validate(bookIdSchema, 'params')` middleware to both routes:
```
router.delete('/:bookId', validate(bookIdSchema, 'params'), async (req, res) => {
  await bookManager.deleteBookManager(req._params.bookId, req.childId);
```
Same pattern for publish.

---

---

## 🔵 Minor Issues

### m1: Dynamic import in route handler
`book-router.js:60` — `const { findBookById } = await import('./book-dao.js')`. Node caches dynamic import after first call, so perf impact is negligible. But inconsistent with top-level static imports on all other routes.

**Fix**: Move `import { findBookById } from './book-dao.js'` to top of file.

### m2: Payload limit 10MB vs spec 1MB
`app.js:37` — `express.json({ limit: '10mb' })` exceeds spec requirement.

**Fix**: Change to `limit: '1mb'`.

### m4: `paginated()` omits `requestId` from meta
`response-envelope.js:19` — `paginated()` returns `{ data, meta: { pagination } }` without `requestId`. All other envelope responses include `requestId` in meta.

**Fix**: Accept optional meta parameter:
```js
export function paginated(data, pagination, meta = {}) {
  return { data, meta: { pagination, ...meta } };
}
```

---

### m5: Rate-limit comment says "sliding window" — implementation is fixed window
`rate-limit-middleware.js:12+25` — INCR + EXPIRE resets counter every 60s (fixed window). True sliding window requires sorted set + ZREMRANGEBYSCORE. Not a functional issue (still rate-limits correctly for 100 req/min), but docstring is misleading.

**Fix**: Update comment to say "fixed window" or "rolling window (INCR + TTL)".

---

### m6: Ownership check inline in GET /:bookId router — inconsistent pattern
`book-router.js:67` — Ownership checked directly in router handler. Every other endpoint delegates ownership check to the manager layer (book-manager, chapter-manager). Inconsistent pattern makes it harder to reason about authz.

**Fix**: Delegate to `bookManager` or extract shared ownership guard.

---

### m7: Test middleware chain doesn't match production
`book-router.test.js:57` — Test app mounts `[authMiddleware, rateLimitMiddleware, bookRouter]`. Production app.js mounts auth+rate-limit at `/api/v1` level then routers separately. Tests won't catch middleware ordering issues.

**Fix**: Mirror production mount pattern:
```js
testApp.use('/api/v1', authMiddleware, rateLimitMiddleware);
testApp.use('/api/v1/books', bookRouter);
```

---

### m8: Book router test coverage gaps
`book-router.test.js` — 7 tests for 9+ routes.

| Endpoint | Tested? |
|----------|---------|
| POST / | ✅ create happy + validation |
| GET / | ✅ list paginated + status filter |
| GET /:bookId | ❌ missing |
| PATCH /:bookId | ❌ missing |
| DELETE /:bookId | ❌ missing |
| POST /:bookId/publish | ❌ missing |
| GET /:bookId/chapters | ✅ happy + 403 |
| GET /:bookId/progress | ❌ missing |
| PUT /:bookId/progress | ❌ missing |
| GET /progress/all | ❌ missing |
| 401 Unauthenticated | ✅ single test |
| 403 Not owner | ✅ one case |

**Suggestion**: Add tests for PATCH, DELETE, GET /:bookId, publish, progress endpoints, and edge cases (404 not found, empty db).

---

## NFR Compliance

| NFR | Status | Evidence |
|-----|--------|----------|
| NFR-PERF-05 (<500ms) | ✅ | Pagination + compound indexes + lean queries |
| NFR-SEC-04 (input validation) | ✅ | Zod validation on all mutation routes |
| NFR-SEC-06 (rate limiting) | ✅ | Redis per-user rate-limit + global express-rate-limit |
| NFR-SEC-03 (auth/ownership) | ✅ | Ownership guard on every write path |
| NFR-SEC-02 (no info leak) | ✅ | 500 errors masked with generic message |
| NFR-SEC-01 (soft delete) | ✅ | deletedAt on all models + cascade |

---

## Test Results Summary

| Test Suite | Tests | Status |
|------------|-------|--------|
| rate-limit-middleware.test.js | 10 | ✅ Comprehensive |
| validation-middleware.test.js | 12 | ✅ Comprehensive |
| response-envelope.test.js | 6 | ✅ Sufficient |
| book-router.test.js | 7 | ⚠️ Gaps (see m8) |
| chapter-router.test.js | 3 | ⚠️ Could add edge cases |

Total: 38 tests. All suites use proper mocking (redis, pino, JWT), in-memory MongoDB, and supertest.

---

## QA Issue Acknowledgement

| # | Issue | Classification |
|---|-------|---------------|
| 1 | `paginated()` omits requestId | Minor (m4) |
| 2 | Global 404 uses flat envelope | Minor (n/a) |
| 3 | Global 500 uses flat envelope | Minor (n/a) |
| 4 | Payload limit 10MB vs 1MB | Minor (m2) |
| 5 | Double rate limiting on /api/v1 | Minor (m7 — test setup only) |

---

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| BackendDeveloper | backend/src/app/book/book-router.js:91 | Add `validate(bookIdSchema, 'params')` to DELETE route |
| BackendDeveloper | backend/src/app/book/book-router.js:101 | Add `validate(bookIdSchema, 'params')` to POST publish route |

---

`VERDICT: BLOCKED — requires rework`
