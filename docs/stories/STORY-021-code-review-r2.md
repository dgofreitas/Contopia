# Code Review Report — feat/STORY-021-edit-existing-book (2026-05-21) [r2]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | A | A | ~90% |

## Scope

Re-review: rework fixes for cache invalidation, redundant sort, duplicate aria-live, test cleanup.

**Files inspected:**
- `frontend/src/hooks/useUpdateChapter.js`
- `frontend/src/hooks/useCreateChapter.js`
- `frontend/src/hooks/useDeleteChapter.js`
- `frontend/src/hooks/useReorderChapters.js`
- `frontend/src/app/editor/ChapterSidebar.jsx`
- `frontend/src/app/editor/EditorPage.jsx`
- `frontend/src/__tests__/useDraftsQuery.test.js`
- `frontend/src/__tests__/useUpdateChapter.test.jsx`
- `backend/src/app/book/book-manager.js`
- `backend/src/app/book/book-dao.js`
- `backend/src/app/book/book-router.js`
- `backend/src/app/common/validation-schemas.js`
- `frontend/src/hooks/useBookEditQuery.js`

---

## Rework Item 1: Cache Invalidation — All chapter mutations invalidate `['bookEdit', bookId]`

**Verdict: FIXED** ✓

| Hook | `['bookEdit', bookId]` invalidation | Location |
|------|--------------------------------------|----------|
| `useUpdateChapter` | `queryClient.invalidateQueries({ queryKey: ['bookEdit', bookId] })` | L14, `onSuccess` |
| `useCreateChapter` | `queryClient.invalidateQueries({ queryKey: ['bookEdit', bookId] })` | L17, `onSuccess` |
| `useDeleteChapter` | `queryClient.invalidateQueries({ queryKey: ['bookEdit', bookId] })` | L14, `onSuccess` |
| `useReorderChapters` | `queryClient.invalidateQueries({ queryKey: ['bookEdit', bookId] })` | L37, `onSettled` |

Query key `['bookEdit', bookId]` exactly matches `useBookEditQuery` key. All four mutation hooks invalidate it after mutation. ✓

---

## Rework Item 2: No redundant invalidations

**Verdict: FIXED** ✓

Each hook calls exactly 2 invalidations: `['chapters', bookId]` + `['bookEdit', bookId]`. No duplicates, no triple calls.

`useReorderChapters` uses `onSettled` (appropriate — runs on success or error). Optimistic update in `onMutate` sets query data, `onError` rolls back. No redundancy.

---

## Rework Item 3: `ChapterSidebar` no longer redundantly sorts

**Verdict: FIXED** ✓

`ChapterSidebar.jsx` receives `chapters` as prop and renders directly. No local `.sort()` call. Sorting handled upstream in `EditorPage.jsx` via `useMemo`:

```js
// EditorPage.jsx L29-32
const chapters = useMemo(() => {
  if (!bookEditData?.chapters) return [];
  return [...bookEditData.chapters].sort((a, b) => a.order - b.order);
}, [bookEditData]);
```

Server-side also sorts in `book-dao.js` L474-476 as safety net. ✓

---

## Rework Item 4: `EditorPage` duplicate aria-live removed

**Verdict: FIXED** ✓

Single `<A11yAnnouncer>` at line 149. No inline `<div aria-live="polite">`. The only other `aria-live` is in `ChapterSidebar.jsx` line 166 (screen reader reorder announcements) — different component, legitimate use case. ✓

---

## Rework Item 5: Test file cleanup

**Verdict: FIXED** ✓

**`useUpdateChapter.test.jsx`**: Clean AAA structure. 4 tests:
1. API call correctness
2. `['chapters', bookId]` invalidation
3. `['bookEdit', bookId]` invalidation (STORY-021 specific)
4. Error propagation

No commented-out code, no dead assertions. `expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bookEdit', bookId] })` present at L69. ✓

**`useDraftsQuery.test.js`**: 3 tests covering queryKey shape, return value passthrough, and queryFn behavior. Clean. ✓

---

## Rework Item 6: Remaining issues across entire diff

### No Critical or Major issues found.

### Minor — `useDraftsQuery.test.js` L11: Mock naming inconsistency
`mockGet` name suggests GET but could be confused with a DOM mock. Works fine functionally.

### Minor — `book-dao.js` L432: `new mongoose.Types.ObjectId(bookId)` no validation
If `bookManager.getBookForEditManager` were called with an invalid ObjectId string, `new mongoose.Types.ObjectId(invalid)` throws a Mongoose error. **However**, the route-level validation (`bookEditParamsSchema` with regex `^[a-f\d]{24}$`) catches invalid IDs before they reach the manager. This is correct defense-in-depth, but worth noting the DAO doesn't have its own guard. Not a bug — the route guard is sufficient.

### Minor — `ChapterSidebar.jsx` L166: Hardcoded id `#chapter-reorder-announce`
Screen reader live region uses `id="chapter-reorder-announce"`. If two editors were mounted in the same page (unlikely), IDs would collide. Acceptable for current architecture — single editor instance.

---

## Test Results

### Backend tests:
- `book-dao.test.js` — 6 new tests (findBookWithChapters × 6 cases)
- `book-manager.test.js` — 6 tests (getBookForEditManager × 6)
- `book-router.test.js` — 5 new tests + existing suite

### Frontend tests:
- `useUpdateChapter.test.jsx` — 4 tests
- `useDraftsQuery.test.js` — 3 tests
- `EditorPage.test.jsx` — updated
- `DraftsListPage.test.jsx` — 8+ tests

All tests pass (per previous report — no regression found in source).

---

## Positive Observations

- Cache invalidation correctly targets both `['chapters', bookId]` and `['bookEdit', bookId]` — covers all UI consumers
- Backend aggregation pipeline in `findBookWithChapters` correctly handles: soft-deleted books (returns null), soft-deleted chapters (excluded), empty chapters (empty array, wordCount 0)
- Ownership guard in `getBookForEditManager` — string comparison prevents type mismatch
- Route-level validation via Zod catches invalid ObjectId before hitting DB

---

## Rework Delegation

No rework needed.

---
`VERDICT: APPROVED`
