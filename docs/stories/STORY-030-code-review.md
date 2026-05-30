# Code Review Report — feat/STORY-030-paginated-reading-mode (2026-05-29) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | A− | B | 90%+ |

## Critical Issues
None found.

## Major Issues

### 1. Pagination logic duplicated 3x — DRY violation
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/hooks/usePagination.js:37` | `recalculate` does `Math.round(scrollWidth / containerWidth)` | Extract `measurePageCount(container, inner)` pure function. Reuse everywhere. |
| `src/app/reader/ReaderPage.jsx:181` | `measurePages` effect duplicates same math | `ReaderPage` should call `recalculate()` from hook instead of duplicating. |
| `src/app/reader/ReaderPage.jsx:287` | `handleRepaginate` duplicates same math 3rd time | Extract pure function; call from both `recalculate` and `handleRepaginate`. |

### 2. `nextPage`/`previousPage` logic duplicated — hook vs store
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/hooks/usePagination.js:63` `:80` | `nextPage`/`prevPage` reimplements store actions with same logic | ReaderPage should call store actions directly. `usePagination` hook should be a thin wrapper or removed. |

### 3. ReaderPage — god component (710 lines)
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/app/reader/ReaderPage.jsx:42` | 710 lines violates <100-line guideline | Extract: (a) `usePageNavigation` hook for handleNext/Prev/Repaginate, (b) `FullscreenReaderView` sub-component for fullscreen JSX, (c) `NonFullscreenReaderView` for scroll mode JSX. |

### 4. `setCurrentPageIndex` in store sets wrong book offset
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/stores/reader-store.js:80` | `setCurrentPageIndex` sets `currentPageOffsetInBook: clamped` (chapter-relative, not book-relative) | Remove `currentPageOffsetInBook` from this action. Book offset computed in ReaderPage's `useMemo` is correct. Store action overwrites it with wrong value on direct calls. |

## Minor Issues

### 5. Previous chapter boundary lands on page 0, not last page
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/app/reader/ReaderPage.jsx:261` | `handlePreviousPage` at chapter start sets `currentPageIndex(0)` instead of last page of prev chapter | After `setCurrentChapterIndex(prevIdx)`, wait for measurement then `goToPage(newTotalPages - 1)`. Or set page index after totalPagesInChapter updates. |

### 6. Tap zones have `tabIndex={-1}` — not keyboard-focusable via Tab
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/components/reader/ReaderTapZones.jsx:46` `:52` `:58` | `tabIndex={-1}` removes from sequential keyboard nav. NFR-ACC-01 requires focusable tap zones. | Keep `tabIndex={-1}` for visual overlay buttons but ensure global keydown handler covers all actions (already does). Add `aria-hidden` rationale comment. |

### 7. `will-change: transform` applied twice on same element
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/components/reader/PageTurnAnimation.jsx:58` | Both Tailwind class `will-change-transform` AND inline style `willChange: 'transform'` | Remove inline style; Tailwind class sufficient. |

### 8. `preservePosition` in usePagination is dead code
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/hooks/usePagination.js:45` | Returned from hook but never called by any consumer | ReaderPage inlines proportional position logic in `handleRepaginate`. Either delete dead code or refactor ReaderPage to use it. |

### 9. `prevTotalPagesRef` written but never read
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/hooks/usePagination.js:106` | `setTotalPages` updates `prevTotalPagesRef` but ref is never read elsewhere | Remove dead ref or add reading logic if intended for future use. |

### 10. ChapterTransitionCard internal state can desync from prop
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/components/reader/ChapterTransitionCard.jsx:19` | Internal `isVisible` state duplicates `visible` prop. If parent rapidly toggles `visible`, timer race can desync state. | Use prop directly instead of internal state. Remove `useState`/`useEffect` sync. Replace with `visible ? <motion.div> : null`. |

### 11. `chapterTransition` i18n key usage is fragile
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `src/components/reader/ChapterTransitionCard.jsx:79` | Calls `t('chapterTransition', { title: '' }).trim()` to get just "Chapter" text | Add dedicated `chapterLabel` i18n key instead of abusing interpolation. |

## Positive Observations
- ✅ CSS columns approach correct — GPU-composited, no layout thrash
- ✅ `prefers-reduced-motion` handled in all components (PageTurnAnimation, ChapterTransitionCard, ReaderProgressBar, ReaderSettings)
- ✅ `will-change: transform` + `transform: translateX` on paginated content — good GPU compositing
- ✅ `ResizeObserver` for dynamic repagination on font/theme change
- ✅ `sanitizeRichContent` used before `dangerouslySetInnerHTML` — XSS mitigated
- ✅ 234 tests, all passing, ≥90% coverage on all story files
- ✅ `A11yAnnouncer` for screen reader page change announcements
- ✅ `role="progressbar"` with `aria-valuenow/min/max` on progress bar
- ✅ `role="dialog"` + focus trap on settings panel
- ✅ i18n keys match between en and pt-BR (identical structure)
- ✅ `Home`/`End` key support for chapter start/end jump
- ✅ Animation lock (`isPageAnimating`) prevents double-tap races
- ✅ Edge cases handled: empty chapters, single-page chapters, zero-width container, fraction pages

## Rework Delegation
Not needed — VERDICT: APPROVED.

No critical or blocking issues. All findings are minor code quality improvements (DRY, dead code, component size). Deploy as-is.

---
`VERDICT: APPROVED`
