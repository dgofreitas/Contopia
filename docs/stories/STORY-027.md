# STORY-027: Image Upload for Cover

**Epic**: EPIC-004
**Persona": Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies": STORY-006, STORY-022

## User Story
As a young author, I want to upload a photo or drawing from my device to use as my book cover, so that my book can feature my own artwork.

## Acceptance Criteria
1. **GIVEN** Julia is in the cover designer, **WHEN** she taps "Upload My Picture," **THEN** a file picker opens accepting JPG and PNG files.
2. **GIVEN** Julia selects a valid image (<=5MB, JPG/PNG), **WHEN** uploaded, **THEN** the image appears on the cover preview, EXIF data is stripped, and a matching spine color is auto-extracted from the dominant color.
3. **GIVEN** Julia selects an oversized image (>5MB), **WHEN** she tries to upload, **THEN** a friendly message explains the size limit and suggests resizing.
4. **GIVEN** Julia selects an invalid file type (e.g., .exe, .pdf), **WHEN** she tries to upload, **THEN** the file is rejected with a clear, child-friendly error.
5. **GIVEN** the upload succeeds, **WHEN** the image is processed, **THEN** a thumbnail and full-size version are stored securely in user-scoped object storage (STORY-006).
6. **GIVEN** a screen reader is active, **WHEN** Julia triggers upload, **THEN** progress is announced (e.g., "Uploading... 50 percent... Done") using `aria-live="polite"`.

## Related NFRs
- **NFR-SEC-05**: Images validated for MIME type, EXIF stripped, capped at 5MB; executables rejected.
- **NFR-SEC-02**: Uploaded assets encrypted at rest.
- **NFR-PERF-07**: Image upload/processing within 60 seconds for 5MB files.
- **NFR-ACC-01**: WCAG 2.1 AA — upload button keyboard accessible.
- **NFR-ACC-03**: Screen reader announces upload progress.
- **NFR-ACC-04**: Error messages have sufficient contrast.

## Technical Notes
- Client-side validation: check file type and size before upload to provide instant feedback.
- Server-side validation: re-check MIME type (magic bytes), strip EXIF with server library, scan for embedded scripts.
- Image processing: generate a cover-sized image (e.g., 600x900px) and a thumbnail; store both.
- Color extraction: use a lightweight library (e.g., `node-vibrant`, `color-thief`) to extract dominant color for spine auto-generation.
- Upload via `POST /api/books/:id/assets` with multipart/form-data; return asset IDs and URLs.
- Progress tracking: show a circular or linear progress indicator; announce to screen reader at 25%, 50%, 75%, 100%.
- If upload fails, allow retry without losing other cover design state.

## QA Notes
- Upload test files: valid JPG/PNG under 5MB, valid file over 5MB, corrupted image, .exe renamed to .png, SVG with embedded script.
- Verify EXIF removal by inspecting uploaded file metadata.
- Test upload on mobile (camera roll) and desktop (file picker).
- Test keyboard-only upload flow (focus upload button, Enter, navigate file picker with Tab/Arrow).
- Screen reader: verify progress announcements.
- Verify dominant-color extraction produces reasonable spine colors across various images.
- Test network interruption mid-upload and verify retry works.
