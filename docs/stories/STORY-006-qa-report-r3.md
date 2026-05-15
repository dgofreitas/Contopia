# QA Report — STORY-006 (2026-05-14) [r3]

## Summary

| Tests | Passed | Failed | Coverage (key modules) |
|-------|--------|--------|------------------------|
| 543   | 543    | 0      | 85-100% across storage, auth, gdpr |

## Test Suites

| Type | Status |
|------|--------|
| All 221 test suites (543 tests) | PASS (543/543) |

## Fix Validation — Each listed fix verified by code review

| Fix | Module | What Changed | Verified |
|-----|--------|--------------|----------|
| **CRIT-1** | `storage-config.js` | Startup validation: throws if `S3_ACCESS_KEY`/`S3_SECRET_KEY`/`S3_BUCKET` missing, skipped in test env (`NODE_ENV === 'test'`) | ✅ Lines 10–17 |
| **CRIT-2** | `auth-router.js` | ALL 10 routes (`/register`, `/verify/:token`, `/resend-verification`, `/child-login`, `/login`, `/logout`, `/refresh`, `/me`, `/account`, rate-limit handler) + `handleError` use `ok()`/`fail()` from `response-envelope.js` | ✅ 0 raw JSON shapes; every response path uses envelope helpers |
| **CRIT-3** | `storage-manager.js` | Upload reordered: `putObject` to S3 (line 72) FIRST, then `createAssetRecord` (line 75) — no orphan DB records on S3 failure. `SAFE_ID_REGEX` (line 58) validates `childId`/`bookId` as MongoDB ObjectId hex strings before path construction | ✅ Order verified; path traversal defense present |
| **MAJ-2** | `app.js` | Global error handler (line 94–103) uses `fail('INTERNAL_ERROR', 'Something went wrong...', { requestId })` with proper envelope shape | ✅ Line 102: `fail()` from `response-envelope.js` |
| **MAJ-4** | `gdpr-cleanup.js` | Batch pagination: `BATCH_SIZE = 100`, `while (hasMore)` loop with `Child.find({ deletedAt: { $lt: cutoff } }).limit(BATCH_SIZE)` until exhausted | ✅ Lines 16, 24–58 |

## Acceptance Criteria Validation

### AC1 — Upload validated (MIME, size ≤5MB), EXIF stripped, user-scoped storage
**Status: PASSED** ✅ *(unchanged from r2)*

| Step | File | Verified |
|------|------|----------|
| MIME whitelist (PNG, JPEG, WebP) | `file-validator.js:8` | ✅ |
| Magic bytes check | `file-validator.js:10–14` | ✅ |
| Size ≤5MB (multer + validateFile) | `file-validator.js:6`, `storage-router.js:14` | ✅ |
| EXIF stripping via sharp | `exif-stripper.js:15–17` | ✅ |
| User-scoped path: `users/{childId}/books/{bookId}/assets/{assetId}.ext` | `storage-manager.js:69` | ✅ |
| S3 upload before DB record (NO orphans) | `storage-manager.js:72` → `75` | ✅ **NEW** |
| Path traversal defense (`SAFE_ID_REGEX`) | `storage-manager.js:58–64` | ✅ **NEW** |
| Quota enforcement (500MB) | `storage-manager.js:46–52` | ✅ |
| S3 credentials validated at startup | `storage-config.js:10–17` | ✅ **NEW** |

### AC2 — Presigned URL with TTL, HTTPS, CDN edge caching headers
**Status: PASSED** ✅ *(previously PARTIAL — acceptable for MVP)*

| Step | File | Verified |
|------|------|----------|
| Presigned URL (3600s TTL) | `storage-service.js:34–43` | ✅ |
| Cache-Control on upload | `storage-service.js:21` | ✅ |
| Cache-Control on download | `storage-service.js:38` | ✅ |
| HTTPS via configurable endpoint | `storage-config.js:4` | ✅ |

> **Note:** No explicit CDN provider config (CloudFront/Cloudflare) — system relies on S3-compatible endpoint pointing to CDN. Cache headers are correct for edge-caching. MVP-appropriate.

### AC3 — Ownership guard — 403 if non-owner accesses asset
**Status: PASSED** ✅ *(unchanged from r2)*

| Guard | File | Verified |
|-------|------|----------|
| Download ownership: `asset.authorId !== childId → 403` | `storage-manager.js:104–109` | ✅ |
| Upload ownership: `book.authorId !== childId → 403` | `storage-manager.js:38–43` | ✅ |
| Route-level auth via `req.childId` from `authMiddleware` | `storage-router.js:43,64` | ✅ |
| DELETE /account: authMiddleware protects endpoint | `auth-router.js:354–364` | ✅ |

### AC4 — Invalid file types rejected with child-friendly errors
**Status: PASSED** ✅ *(unchanged from r2)*

| Rejection layer | Message | Verified |
|-----------------|---------|----------|
| MIME whitelist | "Oops! We only accept pictures (PNG, JPG, WebP)." | ✅ `file-validator.js:47–52` |
| Magic bytes | "Oops! We only accept pictures (PNG, JPG, WebP)." | ✅ `file-validator.js:54–60` |
| Size >5MB | "This file is too big! Try a smaller picture." | ✅ `file-validator.js:39–44` |
| Multer pre-parse | 413 via `handleMulterError` | ✅ `storage-router.js:76–83` |

### AC5 — Account deletion triggers asset purge within 30 days (GDPR)
**Status: PASSED** ✅ *(unchanged from r2 — all fixes maintained)*

| Component | File | Verified |
|-----------|------|----------|
| `deleteAccountManager` → `purgeAssetsByAuthorManager` → `softDeleteChildById` | `auth-manager.js:812–835` | ✅ |
| `DELETE /account` route (authMiddleware protected) | `auth-router.js:354–364` | ✅ |
| `scheduleGdrpCleanup` — runs on startup + every 24h | `gdpr-cleanup.js:70–82` | ✅ |
| `cleanupExpiredAccounts` — batch pagination (100/batch) | `gdpr-cleanup.js:13–63` | ✅ **NEW** |
| TTL index on `deletedAt` (expireAfterSeconds: 30d) | `auth-model.js:76` | ✅ |
| `deletedAt` field on Child schema | `auth-model.js:65–68` | ✅ |
| `main.js` calls `scheduleGdrpCleanup()` | `main.js:41` | ✅ |

## Additional Consistency Checks

### `ok()` / `fail()` envelope usage

| Module | Routes | Envelope Usage | Status |
|--------|--------|----------------|--------|
| **auth-router.js** | 10 routes + rate-limit handler + `handleError` | ALL use `ok()`/`fail()` from `response-envelope.js` | ✅ **FIXED** |
| **storage-router.js** | 2 routes + multer handler + `handleError` | Routes use `ok()`/`fail()`; `handleError` constructs same shape manually (functionally identical `{ error: { code, message }, meta }`) | ⚠️ Minor: not using `fail()` helper, but output shape is equivalent |
| **app.js** | Global error handler | Uses `fail()` from `response-envelope.js` | ✅ **FIXED** |

### S3 upload before DB (no orphan records)

**Verified:** `storage-manager.js` line 72 (`putObject`) executes before line 75 (`createAssetRecord`). If S3 upload throws, the catch in `storage-router.js:49–51` bubbles up via `handleError`, and no DB record is created. ✅

### Path traversal defense

**Verified:** `SAFE_ID_REGEX = /^[a-f\d]{24}$/i` at `storage-manager.js:58`. Both `childId` and `bookId` must be exactly 24 hex characters (MongoDB ObjectId format) before being interpolated into the S3 path at line 69. This prevents `../../`, null bytes, or any non-ObjectId path components. ✅

### S3 credential validation at startup

**Verified:** `storage-config.js:10–17` — throws immediately on module load if `S3_ACCESS_KEY`/`S3_SECRET_KEY` or `S3_BUCKET` are missing, with `NODE_ENV === 'test'` guard. ✅

## NFR Validation

| NFR | Metric | Target | Actual | Status |
|-----|--------|--------|--------|--------|
| NFR-SEC-02 | Encryption at rest | AES-256 or provider-managed | Not explicitly set on `PutObjectCommand` (relies on bucket default) | **MINOR** |
| NFR-SEC-05 | Upload validation | MIME validated, EXIF stripped, ≤5MB, executables rejected | Full implementation | **PASS** |
| NFR-SCL-04 | CDN edge caching | Cache headers for edge caching | `Cache-Control: immutable, max-age=31536000` on upload and download | **PASS** |
| NFR-PRV-02 | Right to erasure | Asset deletion within 30 days | `deleteAccountManager` + `scheduleGdrpCleanup` + TTL index + batch pagination | **PASS** |
| NFR-PRV-03 | Data minimization | Only covers/spines/edges/upload retained | Asset types enum: `cover`, `spine`, `edge`, `upload` | **PASS** |

## Issues Found

| Severity | Area | Description | Owner | Status |
|----------|------|-------------|-------|--------|
| **MINOR** | storage-router | `handleError` in `storage-router.js:88–103` constructs envelope shape manually instead of calling `fail()`. Shape is functionally identical to `fail()` output. | BackendDeveloper | Not in fix scope — low risk |
| **MINOR** | NFR-SEC-02 | Server-side encryption headers not explicitly set on `PutObjectCommand`. Relies on bucket default encryption. | BackendDeveloper | Not fixed — low risk |

### Previously blocking issues — all RESOLVED and MAINTAINED in this re-validation:

| r1 Issue | Severity | Fix | Status |
|----------|----------|-----|--------|
| C1: `purgeAssetsByAuthorManager` orphaned — no caller | CRITICAL | `deleteAccountManager` + `DELETE /account` | ✅ Maintained |
| M1: No 30-day compliance mechanism | MAJOR | `scheduleGdrpCleanup` + `cleanupExpiredAccounts` + TTL index | ✅ Maintained |

### New fixes in this round — all VERIFIED:

| Fix | Module | Status |
|-----|--------|--------|
| CRIT-1: S3 credentials validated at startup | `storage-config.js` | ✅ |
| CRIT-2: `ok()`/`fail()` in ALL auth-router routes | `auth-router.js` | ✅ |
| CRIT-3: S3 upload before DB + path traversal defense | `storage-manager.js` | ✅ |
| MAJ-2: Global error handler uses `fail()` envelope | `app.js` | ✅ |
| MAJ-4: GDPR cleanup batches of 100 | `gdpr-cleanup.js` | ✅ |

## Validation Flow Diagram

```mermaid
flowchart TD
    subgraph Upload Flow [AC1 - with NEW fixes highlighted]
        A1[POST /books/:bookId/assets] --> A2[Multer: fileSize ≤5MB]
        A2 --> A3[validateFile: MIME whitelist]
        A3 --> A4[validateFile: magic bytes]
        A4 --> A5[stripExif: sharp]
        A5 --> A6[Check book ownership]
        A6 --> A7[Check storage quota]
        A7 --> A8[SAFE_ID_REGEX path traversal check]:::new
        A8 --> A9[Create S3 path: users/{childId}/...]
        A9 --> A10[putObject to S3]:::new
        A10 --> A11[createAssetRecord in DB]:::new
        A11 --> A12[Generate presigned URL]
        A12 --> A13[Return {assetId, url, expiresAt}]
    end

    subgraph Download Flow [AC2 + AC3]
        B1[GET /assets/:assetId] --> B2[findAssetRecordById]
        B2 --> B3{authorId matches req.childId?}
        B3 -- Yes --> B4[getSignedUrl: 1h TTL]
        B3 -- No --> B5[403 FORBIDDEN]
        B4 --> B6[302 redirect to presigned URL]
    end

    subgraph Validation Flow [AC4]
        C1[Upload arrives] --> C2{Size ≤5MB?}
        C2 -- No --> C3[413: child-friendly error]
        C2 -- Yes --> C4{MIME in whitelist?}
        C4 -- No --> C5[400: child-friendly error]
        C4 -- Yes --> C6{Magic bytes match?}
        C6 -- No --> C7[400: child-friendly error]
        C6 -- Yes --> C8[Accepted for processing]
    end

    subgraph Startup Validation [CRIT-1]
        E1[server start] --> E2{NODE_ENV === test?}
        E2 -- Yes --> E3[skip credential check]
        E2 -- No --> E4{S3_ACCESS_KEY + S3_SECRET_KEY + S3_BUCKET set?}
        E4 -- No --> E5[throw Error: missing env vars]
        E4 -- Yes --> E6[create S3Client]
    end

    subgraph GDPR Account Deletion Flow [AC5 - with batch pagination]
        D1[DELETE /account] --> D2[authMiddleware]
        D2 --> D3[deleteAccountManager]
        D3 --> D4[purgeAssetsByAuthorManager]
        D4 --> D5[deleteObject S3: each asset]
        D4 --> D6[Asset.deleteMany: hard-delete]
        D3 --> D7[softDeleteChildById: set deletedAt]

        D8[scheduleGdrpCleanup - 24h interval] --> D9[cleanupExpiredAccounts]
        D9 --> D10[Batch: find 100 expired children]:::new
        D10 --> D11{More children?}
        D11 -- Yes --> D10
        D11 -- No --> D12[purgeAssetsByAuthorManager per child]
        D12 --> D13[hardDeleteChildById]

        D14[TTL index on deletedAt] -.-> D15[MongoDB auto-expire after 30d]
    end

    classDef new fill:#d4edda,stroke:#28a745
```

## Recommendations

1. **Optional — storage-router `handleError`**: Replace the manual envelope construction in `storage-router.js:99–102` with a call to `fail(code, message, { requestId })` for consistency with `auth-router.js` and `app.js`. Currently produces equivalent output.
2. **Optional — SSE header**: Add `ServerSideEncryption: 'AES256'` to `PutObjectCommand` for explicit encryption-at-rest, if bucket-level default is insufficient for compliance requirements.

---

## Final Status

**Status: PASSED** ✅

### All 5 acceptance criteria: PASSED
| AC | Description | Status |
|----|-------------|--------|
| AC1 | Upload validation + EXIF strip + scoped storage + no orphans + path traversal defense | **PASSED** ✅ |
| AC2 | Presigned URL + TTL + cache headers | **PASSED** ✅ |
| AC3 | Ownership guard (403) | **PASSED** ✅ |
| AC4 | Invalid file rejection (child-friendly errors) | **PASSED** ✅ |
| AC5 | GDPR account deletion + 30-day purge + batch pagination | **PASSED** ✅ |

### All 5 listed fixes: VERIFIED
| Fix | Module | Status |
|-----|--------|--------|
| CRIT-1 | `storage-config.js` — startup S3 credential validation | ✅ |
| CRIT-2 | `auth-router.js` — consistent `ok()`/`fail()` usage | ✅ |
| CRIT-3 | `storage-manager.js` — S3 before DB, path traversal defense | ✅ |
| MAJ-2 | `app.js` — global error handler uses `fail()` envelope | ✅ |
| MAJ-4 | `gdpr-cleanup.js` — batch pagination (100/batch) | ✅ |

### 0 Critical, 0 Major, 2 Minor issues remaining
- Minor: storage-router `handleError` could use `fail()` helper (cosmetic)
- Minor: No explicit SSE header on S3 PutObject (relies on bucket default)
