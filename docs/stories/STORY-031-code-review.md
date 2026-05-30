# Code Review Report — STORY-031 (2026-05-29) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | A | B | 91.5% |

**Reviewed**: 7 files — reader-store.js, ReaderPage.jsx, ScrollChapterMarker.jsx, ReaderSettings.jsx, ReaderProgressBar.jsx, ReaderToolbar.jsx, useScrollProgress.js

**QA status**: PASSED (235 tests, 0 failures)

---

## Critical Issues
*None found.*

---

## Major Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `ReaderPage.jsx:44-878` | **God component** — 835 lines, violates `<100 lines` standard. Contains store bindings, data fetching, keyboard nav, mode switching, scroll/paginated logic, position preservation, The End screen, progress sync, repagination, and rendering. | Extract: (1) keyboard nav → `useReaderKeyboardNav` hook, (2) progress sync → reuse `useProgressSync` (already imported), (3) scroll mode rendering → `ScrollReaderContent` component, (4) position preservation → `useReadingModeTransition` hook |

---

## Minor Suggestions

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `useScrollProgress.js:13` | Dead param `_chapters` — underscore-prefixed, unused but kept for "API consistency". Misleading to maintainers. | Remove `_chapters` param. If API stability needed, document in JSDoc only. |
| `ScrollChapterMarker.jsx:53-70` | 3rd `useEffect` creates `IntersectionObserver` with empty deps `[]`. Observer lives forever — never disconnected on unmount correctly. | Remove this effect. Reuse `onVisible` callback (already in effect at L27-42) for SR announcement. Or add cleanup. |
| `ReaderPage.jsx:166` | `effectiveProgress` computed inline every render instead of `useMemo`. | Wrap in `useMemo` for consistency: `const effectiveProgress = useMemo(() => syncedProgress \|\| progress, [syncedProgress, progress])` |
| `ReaderPage.jsx:161` | Position preservation effect returns cleanup for paginated→scroll (clearTimeout) but NOT for scroll→paginated branch. | Add `return` so both branches have proper cleanup, or restructure with an early cleanup return. |
| `ReaderPage.jsx:438-513` | Keyboard handler large (75 lines), handles both scroll + paginated mode in single monolithic `handleKeyDown`. | Extract into two smaller functions: `handleScrollKeyDown` + `handlePaginatedKeyDown`. |

---

## Positive Observations

- ✅ **Security** — `dangerouslySetInnerHTML` correctly paired with `sanitizeRichContent()` in all 3 usage sites. No XSS vector.
- ✅ **Coverage** — 91.5% overall, meets mandatory ≥90% threshold. All 7 targeted files tested.
- ✅ **State management** — Zustand store clean: scroll-related additions (`readingMode`, `scrollPosition`) minimal and focused.
- ✅ **Hook isolation** — `useScrollProgress` properly encapsulates IntersectionObserver + debounced scroll logic. Clean return shape.
- ✅ **Accessibility** — `aria-pressed` on mode toggles, `role="progressbar"` on progress bar, `aria-live` on The End screen, `tabIndex={0}` on scroll container, keyboard nav (Home/End/PageDown/PageUp), `useReducedMotion()` respected throughout.
- ✅ **Immutability** — Zustand `set()` uses shallow merge (immutable by convention).
- ✅ **i18n** — All new strings in both `en/reader.json` and `pt-BR/reader.json`. No hardcoded user-facing text.
- ✅ **DRY** — `FONT_SIZE_CLASSES` / `THEME_CONTENT_CLASSES` shared patterns; no duplication.
- ✅ **No hardcoded secrets** — store config, API keys absent.

---

## Rework Delegation
*None — no Critical issues. Major issues are refactoring suggestions, not blockers.*

---

## Recommendations

1. **Refactor ReaderPage.jsx** into smaller units next iteration — split keyboard nav, scroll content, and position preservation. 835-line components are a maintenance burden.
2. **Add E2E tests** (Cypress/Playwright) for real scroll behavior — jsdom cannot test `IntersectionObserver` or `scrollTo` natively.
3. **Plan for virtual scrolling** if book word count exceeds 50k → `react-window` `VariableSizeList` (flagged in tech analysis).

---

`VERDICT: APPROVED`
