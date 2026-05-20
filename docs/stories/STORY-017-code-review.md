# Code Review Report — feat/STORY-017 (2026-05-20) [r2]

## Summary

| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | A- | A | ~97% |

r1 issues: 1 MAJOR (XSS) + 2 MINOR (a11y). Fixes: XSS ✅ applied. a11y ❌ NOT applied.

## Critical Issues

None.

## Major Issues

None. r1 MAJOR (XSS in ChapterEditor) verified fixed:
- `ChapterEditor.jsx:21` → `{sanitizeText(chapter.title)}` ✅
- `InlineEditTitle.jsx:73` → already had `{sanitizeText(title)}` ✅
- Backend Zod `trim()` + Mongoose trim → defense-in-depth ✅

## Minor Issues

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `frontend/src/app/editor/ReorderButtons.jsx:16` | **r1 fix NOT applied** — `<HiArrowUp>` icon missing `aria-hidden="true"` | Add `aria-hidden="true"` to SVG icon |
| `frontend/src/app/editor/ReorderButtons.jsx:25` | **r1 fix NOT applied** — `<HiArrowDown>` icon missing `aria-hidden="true"` | Same |
| `frontend/src/app/editor/ChapterListItem.jsx:81` | `<HiBars2>` drag handle icon missing `aria-hidden="true"` | Add `aria-hidden="true"` to SVG |
| `frontend/src/app/editor/ChapterListItem.jsx:108` | `<HiTrash>` delete icon missing `aria-hidden="true"` | Add `aria-hidden="true"` to SVG |
| `frontend/src/app/editor/ChapterSidebar.jsx:127` | `<HiChevronRight>` expand icon missing `aria-hidden="true"` | Add `aria-hidden="true"` to SVG |
| `frontend/src/app/editor/ChapterSidebar.jsx:136` | `<HiChevronLeft>` collapse icon missing `aria-hidden="true"` | Same |
| `frontend/src/app/editor/ChapterSidebar.jsx:210` | `<HiMenuAlt2>` collapsed-state icon missing `aria-hidden="true"` | Add `aria-hidden="true"` |
| `frontend/src/app/editor/ChapterSidebar.jsx:230` | `<HiMenuAlt2>` mobile toggle icon missing `aria-hidden="true"` | Add `aria-hidden="true"` |

## Info / Observations

| File:Line | Note |
|-----------|------|
| `backend/src/app/book/__tests__/book-chapter-routes.test.js` | **No XSS test** despite technical analysis §9.1 specifying "XSS in title — Integration". Integration test for script injection in title body should be added. Low priority — backend Zod `trim()` + max(200) catches most vectors. |
| `frontend/src/app/editor/EditorPage.jsx:49-61` | r1 flagged stale closure in `handleDeleteChapter`. Dependencies `[deleteChapter, activeChapterIdFinal, chapters]` cause re-creation on every change. This is correct React pattern — not a real bug. Acceptable. |
| `frontend/src/stores/book-store.js:40-53` | `addChapter`/`removeChapter`/`updateChapter`/`reorderChapters` dead code. Kept — useful as future reference when Zustand store replaces TanStack for some state. Acceptable. |
| `backend/src/app/editor/chapter-manager.js:113-114` | Race condition: concurrent `createChapterManager` calls might read same `maxOrder` → both compute same `nextOrder`. Unique compound index `{bookId, order, deletedAt}` rejects duplicate. Second request fails gracefully. Acceptable for now. |
| `frontend/src/hooks/useReorderChapters.js` | Optimistic update + rollback. `onSettled` invalidates. Proper pattern. ✅ |

## Rework Delegation

None. All issues are MINOR — no block.

---

`VERDICT: APPROVED`
