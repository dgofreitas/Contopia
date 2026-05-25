# Code Review Report — feat/STORY-025 (2026-05-25)

## Summary
STORY-025 implements spine auto-generation + manual override across backend model, validation, manager, and frontend UI components. Backend spineColor getter provides deterministic fallback from book ID; frontend has equivalent fallback in BookSpine/CoverOverlay. All files reviewed: backend model/manager/validation/tests, frontend components/store/hooks/utils/tests. Code is well-structured with solid test coverage for model and manager. Main concern: Mongoose getter for spineColor fallback is effectively dead code in API responses because DAO uses `.lean()` which strips getters — frontend already compensates with equivalent fallback, but backend getter creates misleading expectation. Zod validation tests for spine fields are missing. Minor a11y redundancy in SpineToggle.

## Assessment: Needs Work

---

## Issues Found

### 🟡 Warnings (Should Fix)

#### 1. Mongoose spineColor getter dead code via `.lean()` DAO queries
- **File:** `backend/src/app/book/book-dao.js:13,22,140`
- **Issue:** DAO methods use `.lean()` which strips Mongoose getters. `spineColor` getter (providing deterministic fallback) never fires on API responses.
  - `findBookById`: `.lean({ virtuals: true })` — virtuals only, no getters
  - `findBooksByAuthor`: `.lean({ virtuals: true })` — same
  - `updateBookById`: `.lean()` — no options at all
  - `findBookWithChapters`: aggregation pipeline — no getters
- **Impact:** Getter-defined fallback never reaches API consumers. Feature works because frontend has compensating fallback (`book.spineColor || spineColorFromId(book._id)` in BookSpine/CoverOverlay), but backend getter creates misleading maintenance burden.
- **Fix (option A):** Remove getter from model, rely on frontend fallback. Update doc comment on `book-model.js:66-72` clarifying frontend owns fallback.
- **Fix (option B):** Apply getters in DAO via `.lean({ getters: true })` (Mongoose 7+) so API responses include fallback. Remove equivalent frontend fallback logic.

#### 2. spineColor getter uses `this._id` — fragile on new unsaved documents
- **File:** `backend/src/app/book/book-model.js:70`
- **Issue:** Getter accesses `this._id` for hash calculation. On new unsaved Mongoose documents, `_id` may be undefined or a temporary placeholder, causing `this._id.toString()` to throw or return unexpected value.
- **Impact:** Low in practice (getter only fires on fetched documents where `_id` is guaranteed), but violates robustness principle.
- **Fix:** Add null guard: `const id = this._id ? this._id.toString() : 'default';`

### 🔵 Suggestions (Nice to Have)

#### 3. Missing Zod validation tests for spineColor/spineCustomized
- **File:** `backend/src/__tests__/validation-schemas.test.js`
- **Issue:** `bookUpdateSchema` includes `spineColor` and `spineCustomized` fields, but no dedicated test section validates their behavior. TemplateId, coverTitle, and stickers all have dedicated describe blocks.
- **Suggestion:** Add `describe('bookUpdateSchema — spineColor & spineCustomized')` block testing:
  - spineColor valid hex
  - spineColor invalid hex
  - spineColor nullable (null clears it)
  - spineCustomized boolean true/false
  - spineCustomized rejects non-boolean

#### 4. SpineToggle has redundant `aria-checked` with Flowbite's `checked`
- **File:** `frontend/src/app/cover/SpineToggle.jsx:15`
- **Issue:** `ToggleSwitch` from flowbite-react likely manages `aria-checked` internally from the `checked` prop. Explicit `aria-checked` may conflict or be redundant.
- **Suggestion:** Remove `aria-checked` prop unless Flowbite component does not auto-set it. Verify via aXe or manual ARIA inspection.

#### 5. CoverCustomizePage effect deps use `book?.stickers?.length` — confusing
- **File:** `frontend/src/app/cover/CoverCustomizePage.jsx:72`
- **Issue:** Effect dependency `book?.stickers?.length` is derived data. Combined with the guard `stickers.length === 0` (reading from store, not book), the intent is correct but the asymmetry between dependency source (book) and condition source (store) is confusing.
- **Suggestion:** Use `book?.stickers` (full array) as dependency so any change to the array triggers re-evaluation. Or add a comment explaining the asymmetry.

#### 6. SpineCustomizeSection not memoized
- **File:** `frontend/src/app/cover/SpineCustomizeSection.jsx`
- **Issue:** Component is a default export with no `React.memo` wrapper. Child `SpinePreview` is memoized, but parent section and `SpineColorPicker` re-render on every CoverCustomizePage render.
- **Suggestion:** Wrap with `React.memo` or rely on parent memoization if CoverCustomizePage is stable.

#### 7. SpineColorPicker uses COVER_COLOR_PALETTE — light colors may lack contrast on spine
- **File:** `frontend/src/app/cover/SpineColorPicker.jsx:2`
- **Issue:** Palette includes very light colors (`#F1F5F9` snow, `#FBCFE8` cotton-candy, `#FED7AA` peach, `#A7F3D0` mint). `getTextColor` correctly selects dark text, but contrast ratio on near-white backgrounds may still be below WCAG AA for small text.
- **Suggestion:** Consider curated `SPINE_COLOR_PALETTE` with fewer light pastels, or set minimum brightness threshold in `isLightColor`.

---

## Positive Observations
- ✅ Backend model tests are comprehensive: hex validation (length, chars, case, leading hash), fallback determinism, persistence, null handling
- ✅ Backend manager tests cover spineColor/spineCustomized alongside other fields in combined update
- ✅ Frontend store tests cover all getEffectiveSpineColor scenarios including template-only fallback
- ✅ `deriveSpineColor` utility is a pure function with full test coverage (25 lines, 4 tests)
- ✅ XSS prevention: title in BookSpine uses `sanitizeText`, React JSX auto-escapes in SpinePreview
- ✅ BookSpine has keyboard support (Enter), aria-label, aria-expanded, focus ring styles
- ✅ CoverPreview hides spine from a11y tree via `aria-hidden` (good — main cover has same title)
- ✅ Consistent use of `getTextColor` for light/dark text on spine backgrounds
- ✅ Both backend (`spineColorFromId`) and frontend (`deriveSpineColor → spineColorFromId`) use same deterministic hash algorithm for fallback

---

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| BackendDeveloper | `backend/src/app/book/book-dao.js:13` | spineColor getter dead code — decide: remove getter or add `lean({ getters: true })` |
| BackendDeveloper | `backend/src/app/book/book-model.js:70` | getter null-guard for `this._id` |
| QAAnalyst | `backend/src/__tests__/validation-schemas.test.js` | Add spineColor/spineCustomized Zod validation tests |
| FrontendDeveloper | `frontend/src/app/cover/SpineToggle.jsx:15` | Verify/remove redundant `aria-checked` |

---

`VERDICT: BLOCKED — requires rework`
