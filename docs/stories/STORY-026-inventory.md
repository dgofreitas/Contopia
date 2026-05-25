# Domain Inventory — STORY-026 Edge Design

## BACKEND
- [x] `backend/src/app/book/book-model.js` — add `edgeColor` (String, trim, maxlength 7, match hex, default null) + `edgePattern` (String, trim, maxlength 30, default 'solid')
- [x] `backend/src/app/book/book-manager.js` — add `edgeColor` + `edgePattern` to allowed update fields
- [x] `backend/src/app/common/validation-schemas.js` — add `edgeColor` (optional nullable hex) + `edgePattern` (optional enum ['solid','gradient','marbling','dots','chevron']) to `bookUpdateSchema`

## FRONTEND DATA LAYER
- [x] `frontend/src/lib/edge-patterns.js` — new, 5 edge pattern defs: `{ id, nameKey, type, cssClass }`
- [x] `frontend/src/lib/edge-utils.js` — new, `deriveEdgeColor({ edgeColor, spineColor, coverColor, template, bookId })`
- [x] `frontend/src/stores/cover-store.js` — add: `edgeColor`, `edgePattern`, `edgeCustomized`, `setEdgeColor`, `setEdgePattern`, `setEdgeCustomized`, `getEffectiveEdgeColor`, update `resetCustomization`/`resetStore`
- [x] `frontend/src/i18n/locales/en/cover.json` — add edge section keys + aria keys
- [x] `frontend/src/i18n/locales/pt-BR/cover.json` — add edge section keys + aria keys in Portuguese

## FRONTEND CSS
- [x] `frontend/src/styles/cover.css` — add `.cover-edge` inline strip, `.cover-edge-preview` standalone, pattern CSS classes for solid/gradient/marbling/dots/chevron, `.pulled-out-cover` mini book, reduced-motion rules

## FRONTEND NEW COMPONENTS
- [ ] `frontend/src/app/cover/EdgePreview.jsx`
- [ ] `frontend/src/app/cover/EdgeToggle.jsx`
- [ ] `frontend/src/app/cover/EdgeColorPicker.jsx`
- [ ] `frontend/src/app/cover/EdgePatternPicker.jsx`
- [ ] `frontend/src/app/cover/EdgeCustomizeSection.jsx`

## FRONTEND MODIFIED COMPONENTS
- [ ] `frontend/src/app/cover/CoverPreview.jsx` — add edge strip on right side
- [ ] `frontend/src/app/cover/CoverCustomizePage.jsx` — add `EdgeCustomizeSection` after spine section
- [ ] `frontend/src/components/shelf/PulledOutBookCard.jsx` — replace gray placeholder with `PulledOutBookCover` (cover + spine + edge)
- [ ] `frontend/src/hooks/useSaveCoverCustomization.js` — add `edgeColor` + `edgePattern` to payload

## GATE
All items [DONE] → call TestEngineer
