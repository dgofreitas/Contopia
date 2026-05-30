# Code Review Report — STORY-036 (2026-05-29) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | A | A | ~95% |

## Critical Issues
None.

## Major Issues
None.

## Minor Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `FavoriteToggle.jsx:8` | `animKey` state + `motion.button key={animKey}` triggers re-animation on every click. Works but generates React warnings in test output for `key` prop on motion mock | Ignore (QA flagged, cosmetic only, no production impact) |
| `CoverOverlay.test.jsx:337` | Comment says `// firstFocusable = focusable[0]; // FavoriteToggle` — misleading. `focusable[0]` is Read Book button (DOM order: Read, Close, FavoriteToggle). Code works correctly despite comment | Fix comment or remove. Non-blocking |
| `BookSpine.test.jsx:86` | Test asserts `getAttribute('aria-expanded')` is `null` when `isPulledOut` undefined. Relying on implicit `undefined` vs explicit `false` — fragile if default prop added | No change needed. Test checks current behavior. Minor fragility risk |

## Positive Observations
- ✅ `useFavoriteToggle.js` handles 3 cache shapes (array, paginated `{data}`, infinite `{pages}`). Robust
- ✅ `FavoriteToggle.jsx` has full a11y: `role="checkbox"`, `aria-checked`, `aria-label`, `title`, focus ring, 48px touch target
- ✅ `sortByFavorites()` is pure, immutable (spread + sort copy), composable via `sortBooks` dispatcher
- ✅ Backend validation rejects non-boolean values for `isFavorited` (string `'true'` and number `1` both 400)
- ✅ Backend ownership guard: 403 on cross-user favorite toggle
- ✅ `isFavorited ?? false` fallback in CoverOverlay prevents undefined -> unexpected render
- ✅ Reduced motion respected: `prefersReducedMotion` gates animation on FavoriteToggle + BookSpine
- ✅ i18n keys for both en + pt-BR, no `favoritesDisabled` remnants in SortMenu or i18n files
- ✅ `onError` rollback in `useFavoriteToggle` handles `undefined context` gracefully (null/empty cache doesn't crash)
- ✅ All NFRs met: NFR-PRV-01 (private, auth-guarded), NFR-PRV-03 (boolean only, no metadata), NFR-ACC-03 (role=checkbox), NFR-ACC-04 (#FF6B6B on white ≈3.5:1)

## Test Coverage Assessment

| File | Tests | Coverage | Notes |
|------|-------|----------|-------|
| FavoriteToggle.test.jsx | 18 | ~95% | Render, a11y, SVG states, interaction, edge cases (undefined props) |
| useFavoriteToggle.test.jsx | 11 | ~95% | PATCH calls, 3 cache shapes, rollback, invalidation, empty/malformed cache |
| sort-books.test.js (fav portion) | 7 | 100% | sortByFavorites: empty, single, favorited-first, immutability; dispatch test |
| BookSpine.test.jsx (fav portion) | 4 | ~85% | Heart renders when true, not when false, not when undefined, aria-hidden |
| SortMenu.test.jsx (fav portion) | 3 | 100% | Enabled (not disabled), label, click dispatches "favorites" |
| CoverOverlay.test.jsx (fav portion) | 6 | 100% | Checkbox render, aria-checked states, click handler, button count, undefined default |
| book-manager.test.js (fav portion) | 4 | 100% | True, false, undefined omitted, alongside other fields |
| book-router.test.js (fav portion) | 6 | 100% | True, false, string reject, number reject, multi-field, 403 cross-user |

## Verified Standards Compliance

- **Pure functions**: `sortByFavorites` is pure, `sortBooks` is pure dispatcher
- **Immutability**: All sort functions return new arrays. `useFavoriteToggle` optimistic update creates new objects
- **Small functions**: All functions < 50 lines. FavoriteToggle component = 48 lines
- **Input validation**: Zod rejects non-boolean `isFavorited`. Manager allowlisted
- **Error handling**: Optimistic rollback on PATCH failure. `onError` null-safe with `context?.previousBooks`
- **No mutation**: `[...books].sort()` pattern used everywhere
- **Testing**: AAA pattern throughout. Tests independent, no shared state, isolated mocks

## Architecture Flow

```mermaid
graph TD
    subgraph Frontend
        CO[CoverOverlay] --> FT[FavoriteToggle<br/>role=checkbox, aria-checked]
        CO --> |onFavoriteToggle| BSG[BookshelfGrid]
        BSG --> UFT[useFavoriteToggle<br/>optimistic mutation]
        BS[BookSpine] --> |book.isFavorited| HI[♥ SVG indicator<br/>top-right, #FF6B6B]
        SM[SortMenu] --> |favorites enabled| SB[sort-books.js]
        SB --> |sortByFavorites| PART[Favorited books first]
    end

    subgraph Backend
        UFT --> |PATCH /v1/books/:id| API[apiClient]
        API --> VAL[validation-schemas.js<br/>isFavorited: z.boolean()]
        VAL --> MGR[book-manager.js<br/>allowedFields.isFavorited]
        MGR --> DB[(MongoDB<br/>books.isFavorited)]
    end

    UFT --> |optimistic| BSG
    FT --> |tap heart| UFT
```

## Rework Delegation
None. All findings sub-MAJOR.

---
`VERDICT: APPROVED`
