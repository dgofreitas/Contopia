# Code Review Report — feat/STORY-021-edit-existing-book (2026-05-21) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | D | B | A |

## Critical Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `frontend/src/hooks/useCreateChapter.js:15-17` | **Cache invalidation gap** — `onSuccess` invalidates `['chapters', bookId]` but NOT `['bookEdit', bookId]`. After creating a chapter in the editor, the new chapter won't appear in sidebar until manual refresh. Same issue in `useDeleteChapter.js:12-14`, `useReorderChapters.js:35-37`, `useUpdateChapter.js:12-14` (only latter invalidates `['books']`, still not `bookEdit`). | Add `queryClient.invalidateQueries({ queryKey: ['bookEdit', bookId] })` to **all four** mutation hooks' `onSuccess`/`onSettled` callbacks. Without it, EditorPage shows stale data after any chapter mutation. |
| `frontend/src/hooks/useUpdateChapter.js:12-14` | **Incorrect invalidation scope** — invalidates `['books']` (broad — hits all book lists) but not `['bookEdit', bookId]` (the specific cache powering EditorPage). Draft list word count will refresh, but editor won't see updated totalWordCount or chapter list. | Replace `['books']` with `['bookEdit', bookId]`. Or use both: `['bookEdit', bookId]` for editor + `['books']` for shelf. Current approach misses the most important invalidation. |

## Major Issues

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `frontend/src/__tests__/useDraftsQuery.test.js:63-72` | **Dead/orphaned test code** — Lines 63-72 sit outside any `it()` block inside the `describe()` body. They reference `capturedFn` which was `let`-scoped inside the previous `it()` on line 45 — throws ReferenceError at module load. Test runner may crash or silently skip. | Remove lines 63-72 entirely. They duplicate the test at lines 44-62. |
| `frontend/src/app/editor/ChapterSidebar.jsx:87` | **Redundant sort** — `sortedChapters` sorts chapters by `order`, but EditorPage already sorts them in `useMemo` at line 31 (`[...bookEditData.chapters].sort((a, b) => a.order - b.order)`). Passing pre-sorted chapters to sidebar means the second sort is a no-op but adds cognitive overhead. | Remove `sortedChapters` and use `chapters` prop directly. Document that caller must pre-sort. Or remove the sort from EditorPage and let sidebar own the sort. |

## Minor Suggestions

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `frontend/src/app/editor/EditorPage.jsx:193-195` | **Duplicate live region** — `A11yAnnouncer` already renders `<span aria-live="polite" role="status" className="sr-only">`. The inline `<span className="sr-only" aria-live="polite">` at line 193 adds a second live region with the same role. Two live regions = redundant announcements. | Remove the inline span at 193-195. Use `A11yAnnouncer` for all screen-reader announcements. |
| `frontend/src/__tests__/useDraftsQuery.test.js:14` | **Import after mock** — `import { useQuery }` at line 14 is placed after `vi.mock()` calls. ES module hoisting makes this work, but violates convention (imports always hoist to top). Confusing for maintainers. | Move `import { useQuery }` to top of file, before `vi.mock()` calls. Not harmful but inconsistent. |
| `frontend/src/__tests__/useDraftsQuery.test.js:55-56` | **Confusing comment** — Comment says "axios response shape: { data: <responseBody> }" and "hook does: const { data } = await apiClient.get(...) → data = responseBody". Tests mock the implementation detail of axios response shape, testing internal wiring rather than behavior. | Prefer mocking at the network level or testing integration-style. Current approach is brittle — if the api-client wrapper changes shape, tests break. |
| `frontend/src/components/shelf/PulledOutBookCard.jsx` | **Long-press timeout** — `handleTouchStart` uses 300ms timeout. For screen reader / keyboard users, the explicit "Edit" button provides equivalent action. No keyboard equivalent for long-press gesture exists — acceptable since explicit button is present. | Consider adding `aria-describedby` to link long-press behavior for power users. Purely advisory. |
| `backend/src/app/book/book-dao.js:30-84` | **Aggregation pipeline complexity** — `findBookWithChapters` uses 7-stage aggregation pipeline (`$match → $lookup → $unwind → $match → $group → $replaceRoot → $addFields`) with in-memory JS sorting after (line 74). Complex pipeline for what could be simpler: query book + find chapters in parallel. | Consider: `const [book, chapters] = await Promise.all([findBookById(bookId), findChaptersByBook(bookId)])`. Simpler, testable, same result. Current pipeline is more MongoDB-native but harder to debug. |
| `frontend/src/__tests__/useBookEditQuery.test.js` | **No error test** — Hook tests cover happy path, queryKey shape, and enabled=null. No test for what happens when API returns error (network failure, 404, 403). | Add test: mock `mockGet.mockRejectedValue(...)` and verify `useQuery` receives error. |

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| **FrontendDeveloper** | `useCreateChapter.js:15-17` | Add `['bookEdit', bookId]` invalidation |
| **FrontendDeveloper** | `useDeleteChapter.js:12-14` | Add `['bookEdit', bookId]` invalidation |
| **FrontendDeveloper** | `useUpdateChapter.js:12-14` | Replace `['books']` with `['bookEdit', bookId]` |
| **FrontendDeveloper** | `useReorderChapters.js:35-37` | Add `['bookEdit', bookId]` invalidation |
| **FrontendDeveloper** | `useDraftsQuery.test.js:63-72` | Remove orphaned dead code |
| **FrontendDeveloper** | `EditorPage.jsx:193-195` | Remove duplicate live region span |
| **FrontendDeveloper** | `ChapterSidebar.jsx:87` | Remove redundant sort (or deduplicate with EditorPage) |

---
`VERDICT: BLOCKED — requires rework`
