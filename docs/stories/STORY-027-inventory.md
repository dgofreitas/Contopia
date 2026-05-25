# STORY-027 Domain Inventory

**Created**: 2026-05-25  
**Branch**: feat/STORY-027  

---

## BACKEND
- [X] `backend/src/app/storage/image-processor.js` (NEW) — Thumbnail + cover-size generation with sharp
- [X] `backend/src/app/storage/color-extractor.js` (NEW) — Dominant color extraction using sharp stats
- [X] `backend/src/app/storage/storage-manager.js` (MODIFY) — Extend `uploadAssetManager()` for `type=cover` processing
- [X] `backend/src/app/storage/storage-router.js` (MODIFY) — Add `type` query param to upload route
- [X] `backend/src/app/storage/file-validator.js` (MODIFY) — Add SVG rejection (MIME + magic bytes)
- [X] `backend/src/app/book/book-model.js` (MODIFY) — Add `dominantColor`, `width`, `height` to Asset schema
- [X] `backend/src/app/book/book-manager.js` (MODIFY) — Add `coverAssetId` to `allowedFields`; extend `getBookForEditManager()` to populate cover asset URLs + dominantColor
- [X] `backend/src/app/common/validation-schemas.js` (MODIFY) — Add `coverAssetId` to `bookUpdateSchema`

## FRONTEND
- [X] `frontend/src/lib/image-upload-utils.js` (NEW) — Client-side file validation helpers
- [X] `frontend/src/hooks/useUploadCoverImage.js` (NEW) — XHR-based upload hook with progress tracking
- [X] `frontend/src/app/cover/ImageUploadSection.jsx` (NEW) — Upload section container
- [X] `frontend/src/app/cover/UploadButton.jsx` (NEW) — Upload button + hidden file input
- [X] `frontend/src/app/cover/UploadProgress.jsx` (NEW) — Progress bar with aria-live
- [X] `frontend/src/app/cover/ImagePreview.jsx` (NEW) — Thumbnail preview + remove button
- [X] `frontend/src/stores/cover-store.js` (MODIFY) — Add `coverImage`, `isUploading`, `uploadProgress`, `uploadError` state + actions; extend `getEffectiveSpineColor()` with dominantColor fallback
- [X] `frontend/src/app/cover/CoverPreview.jsx` (MODIFY) — Add image overlay layer (after pattern, before stickers)
- [X] `frontend/src/app/cover/CoverCustomizePage.jsx` (MODIFY) — Add ImageUploadSection; load existing coverImage from book data
- [X] `frontend/src/hooks/useSaveCoverCustomization.js` (MODIFY) — Add `coverAssetId` to PATCH payload
- [X] `frontend/src/i18n/locales/en/cover.json` (MODIFY) — Upload section i18n keys
- [X] `frontend/src/i18n/locales/pt-BR/cover.json` (MODIFY) — Upload section i18n keys in Portuguese

## TESTS
- [X] Backend unit tests: image-processor, color-extractor
- [X] Frontend unit tests: image-upload-utils, cover-store
- [X] Component tests: UploadButton, UploadProgress, ImagePreview, ImageUploadSection, CoverPreview
- [X] Integration tests: CoverCustomizePage upload flow, backend POST /assets?type=cover
- [X] Security tests: SVG rejection, EXIF stripping, file type validation

## GATE
All domains [DONE] → proceed to TestEngineer
