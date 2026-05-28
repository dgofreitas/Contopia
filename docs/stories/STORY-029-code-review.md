# Code Review Report — STORY-029 (2026-05-28) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| C | A | A | B |

151 tests passing (STORY-029 scope). 12 pre-existing failures in unrelated files (CoverOverlay, NewBookPage, useUpdateReadingProgress).

## Files Reviewed (8)
1. `frontend/src/app/reader/ReaderPage.jsx` — 377 lines
2. `frontend/src/stores/reader-store.js` — 66 lines
3. `frontend/src/hooks/useFullscreen.js` — 88 lines
4. `frontend/src/components/reader/ReaderToolbar.jsx` — 137 lines
5. `frontend/src/components/reader/ReaderProgressBar.jsx` — 29 lines
6. `frontend/src/components/reader/ReaderTapZones.jsx` — 58 lines
7. `frontend/src/components/reader/ReaderSettings.jsx` — 188 lines
8. `frontend/src/i18n/locales/{en,pt-BR}/reader.json` — 36 keys each

## Critical Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| ReaderPage.jsx:274 | `dangerouslySetInnerHTML` on `currentChapter.content` with NO sanitization. Project has `sanitizeRichContent()` in `lib/sanitize.js` (DOMPurify) but ReaderPage never calls it. XSS vector if chapter content contains malicious HTML. | Import `sanitizeRichContent` from `../../lib/sanitize`. Wrap content: `sanitizeRichContent(currentChapter.content || '')` |
| ReaderPage.jsx:357 | Same issue — normal (non-fullscreen) mode also uses `dangerouslySetInnerHTML` without sanitization. | Same fix: wrap content through `sanitizeRichContent()`. |

**Defense-in-depth principle**: Even if backend sanitizes on save, render-time sanitization is mandatory for `dangerouslySetInnerHTML`. DOMPurify is already a dependency and used elsewhere in the project.

## Major Issues

*None found.*

## Minor Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| ReaderToolbar.jsx:83-85 | `fadeIn` and `fadeOut` both set to `{ opacity: 1 }` when `prefersReducedMotion`. They should differ for semantic clarity. | `fadeIn` = `{ opacity: 1 }`; `fadeOut` = `{ opacity: 1 }` (same, correct behavior) — no functional issue, pure naming nit. |
| ReaderPage.jsx:96-102 | Announcement effect triggers on chapter/index change but doesn't guard against chapter content being the same as previous. Could re-announce same chapter on re-render. | Add `prevChapterId` ref check: only announce if chapter ID actually changed. |
| useFullscreen.js:50-56 | `toggleFullscreen` has 0% function coverage (50% overall func coverage). Untested code path. | Add test or remove if unused by UI. Currently called by no component. |
| ReaderPage.jsx | Statement coverage 80%, branch coverage 70% — below 90% threshold. Pre-existing, not regressed. | Add integration tests for: empty chapters, fullscreen toggle paths, error states. |
| ReaderToolbar.jsx | Branch coverage 81%. Pre-existing. | Add tests for mouse enter/leave timeout paths. |

## Accessibility Check

| Criteria | Status | Notes |
|----------|--------|-------|
| Keyboard nav (arrows, space, escape) | ✅ PASS | Keydown handler covers all shortcuts. Toolbar focus trap works. |
| Screen reader announcement | ✅ PASS | `A11yAnnouncer` + `readingAnnouncement` with real `book?.title`. |
| `role="article"` + `aria-labelledby="chapter-title"` | ✅ PASS | Fullscreen mode. |
| `tabIndex={0}` on content div | ✅ PASS | Content focusable for screen reader traversal. |
| `aria-hidden="true"` on decorative elements | ✅ PASS | Icons, book title span in toolbar. |
| `role="progressbar"` with `aria-valuenow/min/max` | ✅ PASS | ReaderProgressBar. |
| `role="dialog"` + `aria-label` | ✅ PASS | ReaderSettings panel. |
| `prefers-reduced-motion` | ✅ PASS | All Framer Motion components check `useReducedMotion()`. |
| Non-fullscreen mode — no `aria-labelledby` | 🔵 nit | Normal mode `<article>` lacks `aria-labelledby`. Add for parity. |

## i18n Completeness

| Check | EN keys | PT-BR keys | Match |
|-------|---------|------------|-------|
| Exact key count | 36 | 36 | ✅ |
| All keys present | — | — | ✅ |
| All PT-BR values non-empty | — | — | ✅ |
| Unused keys | `backToShelfFullscreen` — used in ReaderToolbar. `exitConfirmation` — used in popstate handler. `readingAnnouncement` — used in A11yAnnouncer. `toolbarAutoHide` — defined but never rendered in any component. | — | ⚠️ `toolbarAutoHide` defined in both locales but never used in any component. Consider removing or implementing tooltip. |

## Performance

| Check | Status | Notes |
|-------|--------|-------|
| Unnecessary re-renders | ✅ OK | Zustand selectors are atomic. `useCallback` on event handlers. |
| Effect cleanup | ✅ OK | All 3 useEffects in ReaderPage return cleanup fns. popstate/beforeunload removed on unmount. |
| `useMemo` usage | ⚠️ Minor | Content font/prose classes computed inline (L229-231) instead of memoized. Trivial cost — OK. |
| Framer Motion with conditional render | ✅ OK | `prefersReducedMotion` gates animation durations. |

## Per-File Review

### ReaderPage.jsx
- **Structure**: Clean. Two render branches (fullscreen vs normal) with shared state. No duplication of i18n keys.
- **Bug fix code paths verified**:
  - `useBookEditQuery(bookId)` — L59. Returns `book.title` for announcements + toolbar. ✅
  - `role="article"` + `aria-labelledby="chapter-title"` — L267-268. ✅
  - `tabIndex={0}` on content div — L275. ✅
  - Popstate handler — L149-176. Push state on mount → popstate fires on back → confirm dialog → exit or re-push. ✅
  - Beforeunload handler — L163-166. Native browser dialog. ✅
  - Cleanup — L172-175. Both listeners removed. ✅
- **🔴 Critical**: Missing `sanitizeRichContent()` on L274 and L357.
- **🔵 Minor**: L96-102 announcement effect could re-announce same chapter on unrelated re-render.

### reader-store.js
- Clean zustand store. 64 lines. Simple.
- `showToolbar`/`hideToolbar`/`toggleToolbar` all properly clear existing timeouts before setting new ones.
- `exitFullscreen` also clears toolbar timeout and resets settings. ✅
- No stale closure issues — all `get()` calls are inside actions. ✅

### useFullscreen.js
- Fullscreen API with CSS fallback (`reader-fullscreen-fallback` class on body).
- `fullscreenchange` + `webkitfullscreenchange` listeners. Proper cleanup. ✅
- Cleanup effect (L79-83) removes fallback class on unmount. ✅
- `toggleFullscreen` (L50-56) unused by any component. 🔵 nit — remove or keep as public API.
- No memory leaks. ✅
- **Note**: On iOS Safari, Fullscreen API is not supported — CSS fallback handles it. This is correct per risk assessment.

### ReaderToolbar.jsx
- Clean auto-hide logic with mouse enter pause + mouse leave restart.
- Focus trap on Tab/Shift+Tab within toolbar when visible. ✅
- Escape key hides toolbar. ✅
- `AnimatePresence` handles mount/unmount animation. ✅
- `prefersReducedMotion` respected. ✅
- `bookTitle` prop rendered with `aria-hidden="true"` (decorative). ✅
- `aria-label` on all buttons. ✅
- `role="toolbar"` on container. ✅

### ReaderProgressBar.jsx
- Minimal, clean. 29 lines.
- Renders `null` when `totalChapters <= 0`. ✅
- Proper ARIA: `role="progressbar"`, `aria-valuenow/min/max`. ✅
- `prefersReducedMotion` gates animation duration. ✅

### ReaderTapZones.jsx
- Three transparent buttons: left (15%), center (70%), right (15%).
- `aria-hidden="true"` on container — correct for decorative overlay. ✅
- `tabIndex={-1}` on buttons — correct: keyboard nav handled by keydown listener, not tap zones. ✅
- `aria-label` on each button for screen reader context when focused. ✅

### ReaderSettings.jsx
- Bottom sheet panel with backdrop. Framer Motion slide-in animation.
- `role="dialog"`, `aria-label="settings"` ✅
- Focus trap for Tab/Shift+Tab. ✅
- Escape key closes panel. ✅
- Backdrop click closes panel (checks `e.target === e.currentTarget`). ✅
- Font size 3 presets with `aria-pressed`. ✅
- Theme 3 presets with `aria-pressed`. ✅
- `prefersReducedMotion` respected — empty variants when reduced. ✅
- **🔵 Minor**: No focus restore to trigger button after panel closes.

### i18n (en/reader.json, pt-BR/reader.json)
- All 36 keys present in both locales. ✅
- PT-BR translations are accurate. ✅
- `toolbarAutoHide` key defined but never rendered in any component. 🔵 nit — dead code.

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| FrontendDeveloperReact | ReaderPage.jsx:274,357 | Add `sanitizeRichContent()` wrapper for both `dangerouslySetInnerHTML` usages |

---
`VERDICT: BLOCKED — requires rework`
