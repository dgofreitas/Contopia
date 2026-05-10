# Code Review Report — STORY-001 (COPPA-Compliant Parent-Child Onboarding) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| C | B | A | ~85% |

## Critical Issues

| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|
| `backend/src/app/auth/auth-manager.js:21` | JWT_SECRET read from env but never validated at startup. If `JWT_SECRET` undefined, JWT signs with `undefined` — trivial to forge tokens. No guard/panic. | Add startup validation: `if (!JWT_SECRET) { logger.fatal('JWT_SECRET not set'); process.exit(1); }`. Validate in `auth-manager.js` top-level or in `app-manager.js` init. |
| `backend/src/app/auth/auth-router.js:32` | Rate limiter uses `req.ip` but `app.js` does NOT set `trust proxy`. Behind reverse proxy (nginx/ELB), all requests appear from same IP (the proxy) → rate limiting completely bypassed. | Add `app.set('trust proxy', 1)` (or appropriate count) in `backend/src/app.js` before any middleware. Or use `req.socket.remoteAddress` + `x-forwarded-for` parsing. |
| `backend/src/app/auth/auth-router.js:141` | `GET /verify/:token` has NO rate limiter. Token in URL path — brute-forceable, leaked in server logs, referrer headers. | Add rate limiter (e.g. 20/hr per IP). Consider POST with token in body instead of URL path for sensitive tokens. |
| `backend/src/app/auth/auth-router.js:87-98, auth-manager.js:207-212` | Dynamic `import('mongoose')` and `import('./auth-model.js')` inside route handlers and business logic. Each call creates new module instance. Breaks separation of concerns (router queries DB directly). | Move to top-level static imports. Router should only call manager methods, not query models directly. Replace router lines 87-98 with a dedicated manager method for idempotent registration check. |

## Major Issues

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `backend/src/app/common/validation-schemas.js:28-29` | `childLoginSchema` validates `childId` as `z.string().min(1)` only. No ObjectId format check. Invalid ObjectId strings cause unhandled Mongoose `CastError` → 500. | Add `.regex(/^[a-f\d]{24}$/i)` or use `z.string().length(24)` + hex regex. |
| `frontend/src/hooks/useRegister.js:22` | `onSuccess` references `data.childFirstName` but `POST /api/auth/register` response only returns `{ parentId, emailSent: true }`. `childFirstName` is undefined in store. | Remove `childFirstName` from `setUser` call on register. Only set user after verify/login where name IS in response. |
| `frontend/src/hooks/useVerify.js:21` | Same pattern: references `data.childFirstName` but `GET /api/auth/verify/:token` response only returns `{ childId }`. Name not in response. | Remove `childFirstName` from `setUser` — it's not returned by verify endpoint. Set user with `childId` only; name fetched later. |
| `backend/src/app/auth/auth-manager.js:231` | `resendVerification` returns full `{ token, parent, child }` including raw parent/child objects. Token returned to router — if logged, exposes raw JWT. | Return only needed fields: `{ token, parentId, childFirstName }`. PII-safe return value. |
| `backend/src/app.js:19, app.js:6` | Helmet is applied but no CSP directive for email verification link images/hrefs. Default Helmet CSP blocks inline styles in email HTML (not relevant server-side, but check frontend). | Verify CSP allows inline styles for email content. Add CSP `style-src 'unsafe-inline'` if not already. |

## Medium Issues

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `backend/src/app/common/email-service.js:30-47` | Verification email HTML hardcodes pt-BR content. No i18n support for English/other locales. | Accept `locale` param, load translated template or use i18next. |
| `backend/src/app/auth/auth-router.js:32` | Rate limiter `keyGenerator: (req) => req.ip` — same IP means all family members share one rate bucket. No per-email rate limiting. | Combine `req.ip + req.body.parentEmail` (or hash of email) as key generator. |
| `frontend/src/stores/auth-store.js:2` | Store comment says "Memory-only: no localStorage for COPPA safety" but `token` in Zustand store — if any middleware (persist) added later, token leaks to localStorage. | Add explicit guard: `persist: () => false` or add runtime check that persist middleware is never configured. |
| `backend/src/app/auth/auth-dao.js:8` | `findParentByEmail` calls `email.toLowerCase()` but `parentSchema` already defines `lowercase: true` on email field. Redundant normalization. | Remove `.toLowerCase()` — Mongoose handles it. Not a bug but unnecessary code. |
| `backend/src/app/auth/auth-manager.js:273` | Redis failure during childLogin is silently swallowed with `// Continue — don't block login on Redis failure`. Refresh token not stored → refresh rotation broken. | Log warning, set `refreshToken` to null in response, client gets access-only session (degraded but functional). |
| `frontend/src/__tests__/VerifyPage.test.jsx:43` | Tests use mutable shared module-level state (`verifyState`, `registerState`, `storeState`). State leaks between tests — fragile. | Use `vi.mock` factory with per-test state via `mockImplementation` or `mockReturnValue`. |
| `backend/src/__tests__/auth-api.test.js:98-105` | Rate limit test loops exactly 5 requests with limit=max:5. Boundary test fragile — off-by-one risk if config changes. | Use `for (let i = 0; i < 6; i++)` (one over limit) then assert 429 on 7th, similar to `auth-router.test.js:259-271`. |

## Minor Suggestions

| File:Line | Issue | Fix |
|-----------|-------|---------------|
| `backend/src/app/auth/auth-manager.js:34` | `generateVerificationToken` includes `email` in JWT claims. Email PII in token payload (not encrypted). | Consider removing `email` from claims — already encoded in JWT metadata. Or use hashed email. |
| `frontend/src/components/auth/RegisterForm.jsx:12-19` | Duplicate Zod schema — identical validation exists in `validation-schemas.js` on backend. Frontend copies but doesn't share. | Consider sharing schema via shared package or type generation. |
| `backend/src/app/auth/auth-router.js:2-8` | Imports: `pino`, `redis` imported in router but only used for rate limiters. Could move rate limiter config to separate module. | Extract rate-limit factory to `src/app/auth/auth-rate-limiter.js`. |
| `frontend/src/app/auth/WelcomePage.jsx:13` | Fallback `'amigo'` hardcoded (Portuguese). No i18n for default name. | Use t() translation for fallback or omit name when undefined. |

## Rework Delegation

| Agent | File:Line | Issue |
|-------|-----------|-------|
| BackendDeveloper | `backend/src/app/auth/auth-manager.js:21` | Add JWT_SECRET startup validation guard |
| BackendDeveloper | `backend/src/app.js` | Add `app.set('trust proxy', ...)` |
| BackendDeveloper | `backend/src/app/auth/auth-router.js:141` | Add rate limiter to GET /verify/:token |
| BackendDeveloper | `backend/src/app/auth/auth-router.js:87-98` | Replace direct model queries with manager method |
| BackendDeveloper | `backend/src/app/common/validation-schemas.js:28-29` | Add ObjectId format validation |
| FrontendDeveloper | `frontend/src/hooks/useRegister.js:22` | Remove `childFirstName` from register success handler |
| FrontendDeveloper | `frontend/src/hooks/useVerify.js:21` | Remove `childFirstName` from verify success handler |
| BackendDeveloper | `backend/src/app/auth/auth-manager.js:231` | PII-safe return from resendVerification |

## Positive Observations

- ✅ SHA-256 hash storage for verification tokens (never store raw JWT in DB)
- ✅ No localStorage — pure Zustand in-memory store (COPPA-safe)
- ✅ Parent verification REQUIRED before child activation (COPPA core)
- ✅ Minimal data collection: email + first name only (COPPA best practice)
- ✅ Consistent error pattern: `{ code, status }` thrown from manager, caught in router
- ✅ Pino logging throughout — no console.log, hashed IDs in logs
- ✅ ESM imports everywhere (import/export, no require)
- ✅ Zod validation at API boundary — no NoSQL injection risk
- ✅ Complete i18n coverage (pt-BR + en) for all UI strings
- ✅ WCAG AA: aria-live, aria-label, aria-invalid, aria-describedby on all form elements
- ✅ Strong test coverage: unit (dao, manager), integration (router, API), frontend (components)
- ✅ Rate limit with Redis-backed store + memory fallback
- ✅ COPPA privacy notice in all verification emails
- ✅ Token type claim validation (`email_verification` vs `access` vs `refresh`) prevents cross-use
- ✅ Compound index `{ parentId, firstName }` with partial filter prevents duplicate active children

---
`VERDICT: BLOCKED — requires rework`
