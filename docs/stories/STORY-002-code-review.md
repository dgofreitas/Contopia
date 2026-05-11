# Code Review Report — STORY-002 (2026-05-11) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| C | B | B | N/A |

## Critical Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `auth-router.js:196` | `/child-login` route missing `loginLimiter` rate limiter middleware. Only Redis-backed attempt counter applied. Express rate-limit headers (RateLimit-Remaining, Retry-After) not sent. Single layer of defense. | Add `loginLimiter` middleware: `.post('/child-login', loginLimiter, async (req, res) => {` |
| `auth-router.js:338` | `/refresh` endpoint has NO rate limiter. Refresh token rotation is expensive (redis KEYS scan in refreshSession). Unbounded refresh calls allow resource exhaustion. | Add `createLimiter({ windowMs: 60e3, max: 10 })` to `/refresh` route |

## Major Issues

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `auth-router.js:196` | `/child-login` duplicates `/login` password login logic. Code smell — two routes doing same thing. Consolidate. | Remove `/child-login` route; use `/login` with `method: 'password'` for all password login |
| `auth-manager.js:109,458` | `redis.keys(pattern)` blocks event loop in production (O(n) scan). Redis docs warn against KEYS in production. | Replace with `redis.scan(pattern)` iterator |
| `auth-manager.js:34` | `BCRYPT_ROUNDS = 10` defined but never used in this module. Dead code. | Remove unused constant |
| `auth-middleware.js:61` | Async IIFE in `authMiddleware` has no `.catch()` or try/catch wrapper. Unhandled promise rejection if `hashToken` or other sync code throws. | Wrap IIFE body in try/catch that calls `next(err)` |
| `auth-middleware.js:110` | `sessionTimeoutMiddleware` same async IIFE pattern — no error propagation. | Same fix: wrap in try/catch, call `next(err)` |
| `auth-manager.js:243` | `validateSession` — Redis error returns `null` (fail-open). Session validation degrades to "session not found" when Redis is down. | Return 503 indicator instead of `null` to distinguish "no session" from "Redis down" |
| `auth-router.js:210,248,312,351` | User-Agent sanitization logic duplicated 4x across routes. DRY violation. | Extract `sanitizeDeviceHint(req)` shared helper |
| `frontend/src/lib/api-client.js:60` | Refresh uses bare `axios.post()` instead of `apiClient`. Bypasses baseURL config. Path `/api/auth/refresh` hardcoded — breaks if API prefix changes. | Use `apiClient.post('/auth/refresh', { refreshToken })` |

## Minor Suggestions

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `auth-router.js:17-25` | Dynamic `import('rate-limit-redis')` at module level creates async module loading. If install missing, falls back to memory store silently. | Move to lazy import or static `require.resolve` check |
| `auth-manager.js:303,791` | `logger.info({ childId })` — childId in logs is acceptable (not PII) but inconsistent: some logs use `childId`, some `childId: childIdStr`. | Normalize all childId log fields to same key pattern |
| `auth-model.js:52-55` | `password` field on Child schema has `select: false` but no bcrypt pre-save hook. Password must be hashed before any save. | Add `pre('save')` hook with bcrypt.hash if password modified |
| `frontend/src/hooks/useAuth.js:133` | `// eslint-disable-line react-hooks/exhaustive-deps` — suppresses deps warning. `handleActivity`, `startIdleTimers`, `handleAutoLogout` omitted from deps. | Add missing deps or memoize callbacks properly |
| `frontend/src/components/auth/LoginForm.jsx` | `childId` field exposed as plain text input. Child IDs are MongoDB ObjectIds — trivial to enumerate. | Use opaque token or username instead of raw _id |
| `frontend/src/stores/auth-store.js` | `sessionExpiresAt` computed client-side with `Date.now() + SESSION_DURATION_MS`. Drifts from server-side TTL. | Prefer server-provided expiry time |
| `auth-router.js:111` | `result.parent._id.toString()` — potential undefined access if idempotent path returns different shape. `result.parent._id` exists but TypeScript would flag. | Add optional chaining or explicit guard |

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| BackendDeveloper | `auth-router.js:196` | Add `loginLimiter` to `/child-login` route |
| BackendDeveloper | `auth-router.js:338` | Add rate limiter to `/refresh` route |
| BackendDeveloper | `auth-manager.js:109,458` | Replace `redis.keys` with `redis.scan` |
| BackendDeveloper | `auth-middleware.js:61,110` | Wrap async IIFEs in try/catch with `next(err)` |
| FrontendDeveloper | `frontend/src/lib/api-client.js:60` | Use `apiClient` instead of bare `axios` for refresh |

---
`VERDICT: BLOCKED — requires rework`
