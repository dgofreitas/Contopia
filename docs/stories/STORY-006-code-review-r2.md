# Code Review Report — STORY-006 (2026-05-14) [r2]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| B- | C | B | ? |

## Verdict: BLOCKED — requires rework

## Previous issues resolution

| Issue | File | Status |
|-------|------|--------|
| CRIT-1 S3 startup validation | `storage-config.js:12-17` | ✅ RESOLVED |
| CRIT-2 auth-router use `ok()`/`fail()` | `auth-router.js` | ✅ RESOLVED |
| CRIT-3 upload order + path defense | `storage-manager.js:58-82` | ✅ RESOLVED |
| MAJ-2 global error handler use `fail()` | `app.js:102` | ✅ RESOLVED |
| MAJ-4 GDPR batch pagination | `gdpr-cleanup.js:16-59` | ✅ RESOLVED |

## 🔴 Critical Issues

### CRIT-4: `storage-service.js:34` — `getSignedUrl` function shadows AWS SDK import → infinite recursion

**Problem**: Local function `getSignedUrl(key, expiresInSeconds)` shadows the import `{ getSignedUrl }` from `@aws-sdk/s3-request-presigner` (line 3). At line 41, `getSignedUrl(s3Client, command, { expiresInSeconds })` calls the **local** function recursively, not the AWS SDK function. This causes infinite recursion → stack overflow at runtime. Presigned URL generation is **completely broken**.

**Suggested Fix**: Rename either the import or the local function:
```js
// Option A: rename import (preferred)
import { getSignedUrl as getSignedUrlFromS3 } from '@aws-sdk/s3-request-presigner';
// ...then at line 41:
const url = await getSignedUrlFromS3(s3Client, command, { expiresInSeconds });

// Option B: rename local function
export async function generatePresignedUrl(key, expiresInSeconds = 3600) {
```
Also rename calls in `storage-manager.js:85` and `storage-manager.js:118`.

## 🟡 Major Issues

None.

## 🔵 Minor Suggestions

1. **`storage-router.js:99-102`** — `handleError` builds response manually instead of using `fail()`. Use `fail(code, message, { requestId })` for consistency with auth-router.

2. **`app.js:76`** — Global rate limit message uses plain `{ error: '...' }` instead of `fail()`. Use handler callback pattern like auth-router does (line 36).

3. **`app.js:63,67`** — Placeholder 404 routes use bare `{ error: 'Not found' }` instead of `fail('NOT_FOUND', 'Not found')`.

4. **`gdpr-cleanup.js:70`** — Function name typo: `scheduleGdrpCleanup` → `scheduleGdprCleanup` (missing 'd' in GDPR). Update import in `main.js:6`.

5. **`storage-manager.js:31`** — Ownership check (`findBookById`) runs before `SAFE_ID_REGEX` validation (line 59). Moving ID validation before the DB query would produce more specific error messages for malformed IDs.

6. **`gdpr-cleanup.js:27`** — Batch query has no `.sort()`. Add `.sort({ deletedAt: 1 })` for predictable pagination order.

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| BackendDeveloper | `storage-service.js:3,34,41` | CRIT-4: fix getSignedUrl name shadow → infinite recursion. Rename import or function. Also fix callers in `storage-manager.js:85,118`. |

---
`VERDICT: BLOCKED — requires rework`
