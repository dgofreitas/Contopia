# Domain Inventory — STORY-024

## BACKEND:
- [x] `backend/src/app/book/book-model.js` — add `coverTitle` (String, trim, maxlength 120, default null) and `stickers` (Array of Mixed sub-docs: svgId, x, y, scale) → BackendDeveloper
- [x] `backend/src/app/book/book-manager.js` — add `coverTitle`, `stickers` to `allowedFields` in `updateBookManager` → BackendDeveloper
- [x] `backend/src/app/common/validation-schemas.js` — add `coverTitle` + `stickers` array with `stickerSchema` (svgId, x, y, scale validation, max 10) → BackendDeveloper

## FRONTEND:
### Phase A — Data Layer (can run parallel with backend)
- [x] `frontend/src/lib/sticker-library.js` — 25 inline SVG sticker components + categories → FrontendDeveloperReact
- [x] `frontend/src/stores/cover-store.js` — extend with `stickers`, `coverTitle`, `selectedStickerId`, actions → FrontendDeveloperReact
- [x] `frontend/src/i18n/locales/en/cover.json` + `pt-BR/cover.json` — sticker names, aria labels, titles → FrontendDeveloperReact
- [x] `frontend/src/styles/cover.css` — Nunito font preloading → FrontendDeveloperReact

### Phase B — Components + Integration (depends on Phase A)
- [x] `frontend/src/app/cover/StickerButton.jsx` → FrontendDeveloperReact
- [x] `frontend/src/app/cover/StickerPickerPanel.jsx` → FrontendDeveloperReact
- [x] `frontend/src/app/cover/CoverStickerLayer.jsx` → FrontendDeveloperReact
- [x] `frontend/src/app/cover/CoverSticker.jsx` → FrontendDeveloperReact
- [x] `frontend/src/app/cover/StickerActions.jsx` → FrontendDeveloperReact
- [x] `frontend/src/app/cover/CoverTitleEdit.jsx` → FrontendDeveloperReact
- [x] `frontend/src/app/cover/CoverAuthorName.jsx` → FrontendDeveloperReact
- [x] `frontend/src/app/cover/CoverPreview.jsx` — modify → FrontendDeveloperReact
- [x] `frontend/src/app/cover/CoverCustomizePage.jsx` — modify → FrontendDeveloperReact
- [x] `frontend/src/hooks/useSaveCoverCustomization.js` — extend mutation payload → FrontendDeveloperReact

## GATE: All domains [DONE] → proceed to TestEngineer
