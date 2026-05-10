# STORY-006: Secure Asset Storage & CDN Setup

**Epic**: EPIC-010
**Persona**: Mãe da Julia — The Caring Parent
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-004

## User Story
As a caring parent, I want my child's drawings and book covers to be stored securely and delivered quickly, so that I never worry about data breaches or slow loading times.

## Acceptance Criteria
1. **GIVEN** an authenticated user uploads an image asset, **WHEN** the file reaches the server, **THEN** it is validated (MIME type, size ≤5MB), stripped of EXIF data, and stored in isolated user-scoped object storage.
2. **GIVEN** a stored asset, **WHEN** requested via its URL, **THEN** it is served over HTTPS through a CDN with edge caching and a time-limited or signed access URL.
3. **GIVEN** an asset belongs to User A, **WHEN** User B tries to access the direct URL, **THEN** access is denied (403) unless explicitly shared (sharing not in MVP).
4. **GIVEN** an uploaded file has an invalid MIME type (e.g., `.exe`, `.svg` with scripts), **WHEN** processed, **THEN** it is rejected before storage with a child-friendly error.
5. **GIVEN** an asset is stored, **WHEN** the user's account is deleted, **THEN** all associated assets are purged within 30 days (GDPR/LGPD compliance).

## Related NFRs
- **NFR-SEC-02**: Assets encrypted at rest (AES-256 or provider-managed).
- **NFR-SEC-05**: Uploaded images validated for MIME type, EXIF stripped, capped at 5MB, executables rejected.
- **NFR-SCL-04**: Static assets served via CDN with edge caching.
- **NFR-PRV-02**: Right to erasure — asset deletion within 30 days.
- **NFR-PRV-03**: Data minimization — only uploaded covers/spines/edges retained.

## Technical Notes
- Object storage: S3-compatible (AWS S3, Cloudflare R2, DigitalOcean Spaces, or MinIO).
- Storage path pattern: `users/{user_id}/books/{book_id}/assets/{asset_id}.{ext}`.
- Use a CDN (Cloudflare, AWS CloudFront, etc.) with cache TTL 1 year for immutable assets; invalidation on re-upload.
- Image processing: generate thumbnails (spine previews) on upload if needed.
- EXIF stripping via server-side library (e.g., `sharp`, `Pillow`, `exiftool`).
- Access control: signed URLs or token-based proxy; avoid public bucket listings.

## QA Notes
- Upload test files: valid JPG/PNG, oversized file (>5MB), corrupted file, `.exe` renamed to `.png`, SVG with embedded `<script>`.
- Verify EXIF data is removed by inspecting uploaded file metadata.
- Confirm CDN caching headers and edge delivery speed.
- Test unauthorized access attempt to another user's asset URL.
- Test asset lifecycle: upload → retrieval → account deletion → confirm purge.
