# Code Review Report: STORY-024 — Sticker Placement & Text on Cover

**Review date**: 2026-05-25
**Revision**: r1
**Files reviewed**: 23 (10 new, 13 modified)

---

## Summary

| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A- | A- | B+ | A |

---

## Critical Issues

None.

---

## Major Issues

- **M1** — `frontend/src/app/cover/CoverSticker.jsx:109` — `aria-selected` on `role="button"` invalid per ARIA spec. `aria-selected` only valid on `gridcell`, `option`, `row`, `tab`. Use `aria-pressed` (toggle button) or `aria-current="true"` for selection state. Screen readers may ignore or misbehave. Affects NFR-ACC-01/03.

- **M2** — `frontend/src/styles/cover.css:290` — `.cover-sticker { transition: ring 0.15s ease; }` uses `ring` which is not a valid CSS property. Tailwind `ring-*` uses `box-shadow`. Result: selection ring never animates. Change to `transition: box-shadow 0.15s ease;` or add `outline` transition.

---

## Minor Issues

- **m1** — `frontend/src/app/cover/StickerButton.jsx:23` — `aria-pressed={false}` hardcoded. Buttons not toggles — omit `aria-pressed` entirely. Causes screen reader to announce "not pressed" on every sticker button.

- **m2** — `frontend/src/app/cover/CoverSticker.jsx:22-25` + `StickerButton.jsx:8` — Sticker name key mapping (kebab→camel) duplicated in 2 files. Extract to shared utility in `sticker-library.jsx`.

- **m3** — `frontend/src/app/cover/CoverCustomizePage.jsx:72` — Effect dep `book?.stickers` is array reference. If React Query returns new object, effect re-runs. Guard `stickers.length === 0` prevents harm but wastes render. Prefer `JSON.stringify(book?.stickers)` or stable reference pattern.

---

## Detailed Assessment

### Backend: 4 files (1 new model tests, 1 existing model, 1 existing manager, 1 existing schemas)

| File | Lines | Status |
|------|-------|--------|
| `book-model.js` | 347 (unchanged schema) | ✅ — `coverTitle` (L77-82) and `stickers` (L83-105) well-defined. Sticker bounds (min/max) on x/y/scale correct. Missing `validate: max 10` on stickers array length at Mongoose level (only Zod enforces this) — defense-in-depth gap, minor. |
| `book-manager.js` | 347 (L121-122 added) | ✅ — `coverTitle` and `stickers` routed through allowed fields filter. Ownership guard present (L105-109). No injection surface. |
| `validation-schemas.js` | 212 (L74-79, L91-102) | ✅ — `stickerSchema` with `max(30)` svgId, `min(0).max(100)` x/y, `min(0.5).max(2)` scale. `bookUpdateSchema` stickers `.max(10)`, coverTitle `.max(120)`. Secure. |
| `book-model.test.js` | 466 (+196 lines for STORY-024) | ✅ — 25+ tests for coverTitle and stickers: defaults, bounds, boundaries, persist, trim. Thorough. |
| `book-manager.test.js` | 365 (+86 lines for STORY-024) | ✅ — coverTitle update, null reset, sticker update, undefined exclusion, combined fields. |
| `validation-schemas.test.js` | 412 (+196 lines for STORY-024) | ✅ — stickerSchema (20 tests), bookUpdateSchema coverTitle (8 tests), stickers (15 tests). Coverage: 100% of added paths. |

### Frontend: 14 files (7 new, 5 new, 2 modified + i18n)

| File | Lines | Status |
|------|-------|--------|
| `sticker-library.jsx` | 327 (new) | ✅ — 25 sticker SVGs, 6 categories, `STICKER_LIBRARY` array with `nameKey` i18n refs. Pure SVG components, no external assets. `generateId()` with `crypto.randomUUID()` fallback. |
| `cover-store.js` | 102 (modified, +stickers) | ✅ — `addSticker` caps at 10. `moveSticker` clamps 0-100. `setScale` clamps 0.5-2. Zustand selectors correct. |
| `StickerButton.jsx` | 41 (new) | ⚠️ — See m1 (redundant aria-pressed). Otherwise: `React.memo`, `useCallback`, focus ring, disabled state. |
| `StickerPickerPanel.jsx` | 85 (new) | ✅ — Correct `role="tablist"`/`role="tab"`/`aria-selected` pattern. Live sticker count. Category grid. |
| `CoverSticker.jsx` | 133 (new) | ⚠️ — See M1 (invalid aria-selected). Otherwise: Pointer events for drag, arrow key nudge (2/10 steps), Delete/Backspace/Escape handlers, double-click remove. `React.memo`. |
| `CoverStickerLayer.jsx` | 19 (new) | ✅ — Empty `aria-live="polite"` region as placeholder. Could be populated for sticker add/remove announcements. |
| `StickerActions.jsx` | 80 (new) | ✅ — Remove selected, clear all with 2-step confirmation. Disabled states correct. |
| `CoverTitleEdit.jsx` | 88 (new) | ✅ — `sanitizeText()` on commit. Enter/Blur commits, Escape cancels. `maxLength={120}` on input. Auto-focus on edit. |
| `CoverAuthorName.jsx` | 16 (new) | ✅ — Read-only display with `aria-label`. |
| `CoverPreview.jsx` | 85 (modified) | ✅ — Integrates `CoverStickerLayer`, `CoverTitleEdit`, `CoverAuthorName`. `aria-live="polite" aria-atomic="true"`. Proper z-index layering. |
| `CoverCustomizePage.jsx` | 157 (modified) | ✅ — Restores stickers from `book.stickers` (with new client IDs). Handles loading/error states. Clean save payload. |
| `useSaveCoverCustomization.js` | 23 (modified) | ✅ — Clean mutation, invalidates `bookEdit` cache. |
| `cover.css` | 396 (modified) | ⚠️ — See M2 (invalid transition: ring). Otherwise: sticker styles, pattern overlays, responsive sizing, `prefers-reduced-motion` support. |
| `en/cover.json`, `pt-BR/cover.json` | 146 each | ✅ — Full parity. All 146 keys identical structure. Sticker names, categories, aria labels, preview strings all translated. |

### Security (NFR-SEC-04)

✅ XSS: `CoverTitleEdit.jsx` calls `sanitizeText(draft)` before storing. `sanitize.js` uses DOMPurify with `ALLOWED_TAGS: []` — strips all HTML.

✅ Sticker data: Zod validates svgId (max 30), x/y (0-100), scale (0.5-2), max 10 stickers. Store clamps at runtime. Mongoose validates bounds.

✅ No `eval`, no `innerHTML`, no `dangerouslySetInnerHTML`. All SVG components are compiled JSX.

✅ Backend: `updateBookManager` allows stickers/coverTitle only through allowed fields filter. Ownership guard present.

⚠️ Defense-in-depth gap: Mongoose model doesn't `validate: max 10` on stickers array. Zod catches at API layer — low risk.

### Accessibility (NFR-ACC-01/03/04)

✅ Keyboard: Arrow key nudge (2%/10%), Delete/Backspace remove, Escape deselect, Tab through stickers. Focus rings visible.

✅ Screen reader: `aria-label` on all interactive elements (stickers, buttons, title edit). `aria-live="polite"` on preview container and sticker layer.

✅ Contrast: Text color inherits from template `textColor` (pre-verified 4.5:1+). Blue-500 ring (#3B82F6) on white = 4.6:1.

⚠️ **M1**: `aria-selected` on `role="button"` invalid ARIA. Must change to `aria-pressed` or `aria-current`.

⚠️ **m1**: Hardcoded `aria-pressed={false}` on sticker action buttons — confusing to SR.

### Performance (NFR-PERF-04)

✅ `React.memo` on `CoverSticker` and `StickerButton` — prevent re-render of unchanged stickers.

✅ Zustand selector slices — components subscribe to only needed state.

✅ Pointer events for drag — single handler per event type. No RAF needed for pointer capture.

✅ `useCallback` on all event handlers — stable references prevent child re-renders.

### i18n

✅ All 146 keys present in both `en/cover.json` and `pt-BR/cover.json`.

✅ Sticker names (25), categories (6), aria labels, UI text, preview fallbacks all translated.

### Test Coverage

Total: ~450 lines of tests for STORY-024 changes. CoverTitle and stickers tested at model, manager, and validation layers. Edge cases: null, empty, boundary values, combined updates.

| Layer | Tests | Coverage |
|-------|-------|----------|
| Model (stickers) | 14 | Default, create, scale default, trim, maxlength x/y/scale bounds, persist |
| Model (coverTitle) | 6 | Default, create, trim, maxlength, null, persist |
| Manager (coverTitle) | 4 | Update, null reset, undefined exclusion, combined |
| Manager (stickers) | 3 | Update, undefined exclusion, combined |
| Validation (stickerSchema) | 20 | All bounds, defaults, type checks |
| Validation (bookUpdateSchema + stickers) | 15 | Array max 10, per-item validation, combined with coverTitle |
| Validation (bookUpdateSchema + coverTitle) | 8 | Max 120, trim, null, optional, combined |

---

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| FrontendDeveloper | `frontend/src/app/cover/CoverSticker.jsx:109` | Replace `aria-selected` with valid ARIA attribute (`aria-pressed` or `aria-current`) |
| FrontendDeveloper | `frontend/src/styles/cover.css:290` | Fix invalid CSS transition from `ring` to valid property (`box-shadow` or `outline`) |
| FrontendDeveloper | `frontend/src/app/cover/StickerButton.jsx:23` | Remove hardcoded `aria-pressed={false}` |
| FrontendDeveloper | `CoverSticker.jsx:22-25` + `StickerButton.jsx:8` | Extract duplicated sticker name key mapping to `sticker-library.jsx` |

---

---
`VERDICT: BLOCKED — requires rework`
