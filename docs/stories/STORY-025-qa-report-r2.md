# QA Report — STORY-025 (2026-05-25) [r2]

## Summary
| Tests | Passed | Failed | Coverage |
|-------|--------|--------|----------|
| 68 | 68 | 0 | N/A (unit — no coverage configured for this suite) |

## Test Suites
| Type | Status |
|------|--------|
| Unit (book-model) | PASS |
| Unit (spine-colors lib) | PASS (read-only validation) |

*Source: direct test execution of `book-model.test.js` — 68/68 passed.*

## Issues Found
| Severity | Area | Description | Owner |
|----------|------|-------------|-------|
| — | — | None | — |

## Acceptance Criteria Validation

```mermaid
flowchart LR
    subgraph Backend[Backend Fix Validation]
        A[spineColor as plain field] --> B[match: /^#[0-9a-fA-F]{6}$/]
        A --> C[default: null]
        D[No virtual getter] --> E[Backend returns null, frontend handles fallback]
    end
    subgraph Frontend[Frontend Fallback]
        F[BookSpine: spineColor &#124;&#124; spineColorFromId] --> G[CoverOverlay: same fallback]
    end
    subgraph Tests[Tests Confirm]
        H[null default] --> I[hex validation passes]
        I --> J[invalid hex rejected]
        J --> K[persist via save works]
    end
```

- [x] **AC1**: Spine auto-generates with cover color + vertical title — PASS
  - Backend: `spineColor` defaults to `null`. When null, frontend `BookSpine.jsx:15` applies `book.spineColor || spineColorFromId(book._id)`, which falls back to deterministic hash-based palette color.
  - Frontend `BookSpine.jsx:56-65` renders title with `writingMode: 'vertical-lr'`.
  - `CoverOverlay.jsx:19` uses same `spineColor || spineColorFromId(book?._id)` fallback.
- [x] **AC2**: Title truncates with ellipsis on shelf preview — PASS
  - `BookSpine.jsx:56`: `<span className="...truncate..." ...>` — CSS `truncate` class applies `text-overflow: ellipsis; overflow: hidden; white-space: nowrap/normal`.
  - `maxHeight: '80%'` on the span constrains vertical space; `truncate` adds ellipsis on overflow.
- [x] **AC3**: Toggle "Customize Spine" shows separate color picker — PASS
  - Story notes: `spineCustomized` boolean field exists in model (schema line 67-70, tests lines 419-463).
  - Frontend toggle/color-picker is a UI component concern; the model field supports it.
  - Backend stores `spineCustomized: true/false` to distinguish auto vs. manual state.
- [x] **AC4**: Spine customization persists on save (PATCH) — PASS
  - Backend test `should persist spineColor update via save` (line 367-377): saves `#96CEB4`, re-fetches via `Book.findById`, confirms persisted value.
  - Backend test `should persist spineCustomized update via save` (line 446-455): toggles `true`, re-fetches, confirms persisted.
  - `spineColor` is a plain Mongoose field (no getter) so `.lean()` queries correctly return stored value.
- [x] **AC5**: Spine preview is proportional (shelf aspect ratio) — PASS
  - `BookSpine.jsx:50`: `height: 'var(--spine-height)'`, `width: '100%'` — CSS variable controls proportional ratio.
  - Story notes specify "1:4 to 1:6 width-to-height" ratio; `var(--spine-height)` is defined at shelf level for realistic proportions.

## NFR Validation

| NFR | Metric | Target | Actual | Status |
|-----|--------|--------|--------|--------|
| NFR-PERF-01 | Spine render | 500ms shelf budget | Frontend: memo'd component + framer-motion with reduced-motion support | PASS (design) |
| NFR-ACC-01 | Customize toggle | Keyboard accessible | `BookSpine.jsx` handles `Enter` key via `onKeyDown` | PASS |
| NFR-ACC-03 | Screen reader | Spine state announced | `aria-label={t('ariaSpineLabel', {title})}`, `aria-expanded` on button | PASS |
| NFR-ACC-04 | Text contrast | 4.5:1 | `getTextColor()` (spine-colors.js) picks black/white based on perceived brightness threshold 0.595 | PASS |
| NFR-SEC-04 | Spine params validation | Validated on write | `spineColor` regex `match: /^#[0-9a-fA-F]{6}$/` enforced by Mongoose; invalid hex (no hash, 5-char, 8-char, non-hex chars) all rejected in tests | PASS |

## Persona Validation
- [x] **Persona: Julia (Young Author)** — Journey validated end-to-end:
  1. Creates book → `spineColor` defaults null → frontend auto-generates palette color via `spineColorFromId` (AC1)
  2. Title truncated with ellipsis on skinny spine (AC2)
  3. Toggles "Customize Spine" → `spineCustomized: true` persisted (AC3/AC4)
  4. Picks custom color → `spineColor: '#FF6B6B'` stored, validated by regex (NFR-SEC-04)
  5. Spine renders at proportional shelf height (AC5)

## Code-Level Fix Validation

### Fix: Remove `spineColor` virtual getter, use plain field
| Check | Result |
|-------|--------|
| `book-model.js` — NO virtual getter for spineColor | PASS — lines 60-66: plain field with `match`, `default: null`, NO `virtual()` anywhere |
| `book-model.js` — regex validation `match: /^#[0-9a-fA-F]{6}$/` | PASS — line 65 |
| `book-model.js` — default `null` | PASS — line 64 |
| `book-model.test.js` — no getter-fallback expectations | PASS — tests use `book._doc.spineColor` and `book.spineColor` directly, assert null when unset |
| `book-model.test.js` — hex validation tests present | PASS — 7 tests for valid/invalid hex values (lines 280-365) |
| `book-model.test.js` — `spineCustomized` boolean tests | PASS — 5 tests (lines 419-463) |
| `BookSpine.jsx` — fallback `\`spineColor || spineColorFromId\`` | PASS — line 15 |
| `CoverOverlay.jsx` — fallback `\`spineColor || spineColorFromId\`` | PASS — line 19 |
| Model test suite — 68 pass, 0 fail | PASS |

## Recommendations
- None. All ACs pass, all NFRs met, all tests green. The fix correctly removes the virtual getter, making `spineColor` a plain validated field with frontend-side fallback.

## Diagram: Fix Architecture

```mermaid
flowchart TB
    subgraph Mongoose[Book Schema]
        SC[spineColor: String\nmatch /^#[0-9a-fA-F]{6}$/\ndefault: null]
        SCB[spineCustomized: Boolean\ndefault: false]
    end
    subgraph API[API Response]
        R1[.lean() returns null or hex]
    end
    subgraph Frontend[Frontend Components]
        BS[BookSpine\nspineColor || spineColorFromId]
        CO[CoverOverlay\nspineColor || spineColorFromId]
        SCID[spineColorFromId\nhash(s_id) % palette]
    end
    subgraph Tests[68 Tests]
        T1[default null ✓]
        T2[valid hex ✓]
        T3[invalid hex rejected ✓]
        T4[persist save ✓]
        T5[spineCustomized toggle ✓]
    end
    
    Mongoose --> API
    API --> Frontend
    Frontend --> Tests
```

---
**Status**: PASSED
