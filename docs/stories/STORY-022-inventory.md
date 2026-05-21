# STORY-022 Implementation Inventory

## Domain Inventory

### BACKEND
- [ ] `backend/src/app/book/book-model.js` — add `templateId` field (String, default null, trim, maxlength 50)
- [ ] `backend/src/app/book/book-manager.js` — add `templateId` to allowed update fields in `updateBookManager()`
- [ ] `backend/src/app/common/validation-schemas.js` — add `templateId` to `bookUpdateSchema` (optional string, max 50 chars)

### FRONTEND
- [ ] `frontend/src/lib/cover-templates.js` — 15 template definitions
- [ ] `frontend/src/stores/cover-store.js` — Zustand store for cover designer state
- [ ] `frontend/src/i18n/locales/en/cover.json` — English translations
- [ ] `frontend/src/i18n/locales/pt-BR/cover.json` — Portuguese translations
- [ ] `frontend/src/i18n/index.js` — register `cover` namespace
- [ ] `frontend/src/styles/cover.css` — template-specific CSS patterns
- [ ] `frontend/src/app/cover/TemplateCard.jsx` — single template thumbnail card
- [ ] `frontend/src/app/cover/TemplateGallery.jsx` — horizontal scroll / grid container
- [ ] `frontend/src/app/cover/CoverPreview.jsx` — live preview pane
- [ ] `frontend/src/app/cover/CoverDesignerActions.jsx` — skip / next buttons
- [ ] `frontend/src/app/cover/CoverDesignerPage.jsx` — page orchestrator
- [ ] `frontend/src/hooks/useSaveTemplate.js` — TanStack mutation hook
- [ ] `frontend/src/App.jsx` — add `/cover/:bookId` route
- [ ] `frontend/src/components/shelf/BookshelfGrid.jsx` — update `onDesignCover` navigation

## Gate
TestEngineer can be called only after all BACKEND and FRONTEND items are [DONE].
