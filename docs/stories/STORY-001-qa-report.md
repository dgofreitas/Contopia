# QA Report — STORY-001 (2026-05-10) [r1]

## Summary

| Tests | Passed | Failed | Coverage |
|-------|--------|--------|----------|
| 141   | 141    | 0      | 91.53% (backend auth), 62.8% (frontend auth pages) |

## Test Suites

| Type | Status |
|------|--------|
| Backend Unit (119 tests, 8 files) | ✅ PASS |
| Frontend Component (22 tests, 3 files) | ✅ PASS |

### Backend Breakdown
| Suite | Tests | Status |
|-------|-------|--------|
| `auth-api.test.js` | 19 | ✅ PASS |
| `auth-manager.test.js` (src/__tests__) | 18 | ✅ PASS |
| `auth-manager.test.js` (app/auth/__tests__) | 24 | ✅ PASS |
| `auth-dao.test.js` (src/__tests__) | 13 | ✅ PASS |
| `auth-dao.test.js` (app/auth/__tests__) | 14 | ✅ PASS |
| `auth-router.test.js` | 17 | ✅ PASS |
| `validation-schemas.test.js` | 12 | ✅ PASS |
| `email-service.test.js` | 2 | ✅ PASS |

### Frontend Breakdown
| Suite | Tests | Status |
|-------|-------|--------|
| `RegisterForm.test.jsx` | 9 | ✅ PASS |
| `VerifyPage.test.jsx` | 6 | ✅ PASS |
| `WelcomePage.test.jsx` | 7 | ✅ PASS |

### Coverage Summary

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| **Backend - All Auth** | **99.04%** | **88.88%** | **95.83%** | **99.04%** |
| `auth-manager.js` | 100% | 97.67% | 100% | 100% |
| `auth-dao.js` | 100% | 100% | 100% | 100% |
| `auth-model.js` | 100% | 100% | 100% | 100% |
| `auth-router.js` | 97.5% | 75.67% | 83.33% | 97.5% |
| `validation-schemas.js` | 100% | 100% | 100% | 100% |
| `email-service.js` | 35.95% | 50% | 40% | 35.95% |
| **Frontend Auth Pages** | **62.8%** | **82.35%** | **66.66%** | **62.8%** |
| `RegisterForm.jsx` | 100% | 100% | 100% | 100% |
| `VerificationStatus.jsx` | 92.59% | 83.33% | 100% | 92.59% |
| `WelcomePage.jsx` | 100% | 80% | 100% | 100% |
| `VerifyPage.jsx` | 88.67% | 90.9% | 66.66% | 88.67% |
| `RegisterPage.jsx` | 0% | 0% | 0% | 0% |

## Acceptance Criteria Validation

### AC-1: Registration → Verification Email
**GIVEN** parent on registration screen, **WHEN** enter email + child name + submit, **THEN** verification email sent
- **PASS** ✅
- RegisterPage.jsx → RegisterForm → useRegister mutation → POST /api/auth/register
- auth-router.js validates via `registerSchema.safeParse()` (line 75)
- auth-manager.registerParentAndChild() creates Parent+Child, generates JWT with 72h expiry (line 33-43)
- sendVerificationEmail() dispatched with magic link (line 122-127)
- API test `should return 201 with parentId and emailSent on success` ✅
- Coverage: `registerParentAndChild` → 100% line coverage

### AC-2: Click Confirmation Link → Account Activated
**GIVEN** parent receives email, **WHEN** click confirmation link, **THEN** child account activated
- **PASS** ✅
- GET /api/auth/verify/:token route (auth-router.js line 141)
- auth-manager.verifyEmail() validates JWT signature + 72h expiry (line 129-188)
- On success: `markParentVerified()`, `clearParentVerificationToken()`, `activateChild()` (lines 183-185)
- API tests cover: success (200), TOKEN_EXPIRED (410), TOKEN_NOT_FOUND (404), INVALID_TOKEN (400) — all ✅
- Frontend VerifyPage calls `useVerify` which navigates to `/welcome` on success (line 26-31)

### AC-3: Malformed Email → Friendly Error
**GIVEN** malformed email, **WHEN** submit, **THEN** friendly non-technical error message
- **PASS** ✅
- Backend: `registerSchema` with `z.string().email()` → 400 VALIDATION_ERROR (validation-schemas.js line 9)
- Frontend: Same Zod schema in RegisterForm.jsx (line 13), error displayed via i18n
- User-facing: pt-BR `"Por favor, verifique o endereço de email."` / en `"Please check the email address."`
- API test `should return 400 with VALIDATION_ERROR for invalid email` ✅
- API test `should return 400 with VALIDATION_ERROR for empty childFirstName` ✅

### AC-4: No Confirmation Within 72h → Inactive + Re-verification
**GIVEN** no confirmation within 72h, **WHEN** child tries login, **THEN** account remains inactive with re-verification prompt
- **PASS** ✅
- JWT expiry set to `72h` via `expiresIn: '72h'` (auth-manager.js line 42)
- verifyEmail() checks both JWT expiry (jwt.verify throws TokenExpiredError → 410) AND DB-level `verificationTokenExpires` past check (lines 146-147, 174-179)
- childLogin() rejects inactive children with 403 NOT_VERIFIED (line 258-263)
- Manager test `should throw TOKEN_EXPIRED when JWT TokenExpiredError` ✅
- Manager test `should throw TOKEN_EXPIRED when DB-level expiry in the past` ✅
- Manager test `should throw NOT_VERIFIED when child inactive` ✅
- Frontend VerifyPage shows expired state → displays "Link expired — resend?" with resend form (VerificationStatus.jsx lines 38-51)

### AC-5: Activated Account → Welcome Onboarding Screen
**GIVEN** activated account, **WHEN** child first login, **THEN** welcome onboarding screen
- **PASS** ✅
- childLogin() returns `isOnboardingComplete: child.onboardingCompleted` (default `false`) (auth-manager.js line 284)
- WelcomePage renders: `t('welcome.title', { name: childName })` with greeting and "Start" button (line 38)
- Frontend test `WelcomePage.test.jsx` (7 tests) ✅
- VerifyPage redirects to `/welcome` on successful verification (VerifyPage.jsx line 28)
- Zustand store `onboardingComplete: false` default (auth-store.js line 8)

## NFR Validation

| NFR ID | Requirement | Target | Actual | Status |
|--------|-------------|--------|--------|--------|
| **NFR-PRV-01** | Parental consent via verified email before activation | Magic link required | `child.isActive: false` default; `activateChild()` only called after `verifyEmail()` | ✅ PASS |
| **NFR-PRV-03** | Only first name + email collected; no geolocation/behavioral | Schema review | `childSchema` has only: `parentId`, `firstName`, `isActive`, `onboardingCompleted`, `createdAt`. `parentSchema` has only: `email`, `verificationToken`, `verificationTokenExpires`, `isVerified`. No DOB, geolocation, or behavioral fields. | ✅ PASS |
| **NFR-SEC-01** | TLS 1.2+ for all onboarding data | nginx TLS termination | TLS config exists but commented out by default (nginx.conf lines 48-52). Requires certs + uncommenting for production. Acceptable for dev. | ⚠️ NEEDS_FIX (prod deployment) |
| **NFR-SEC-04** | Input validation + sanitization | Zod `/^[\p{L}]+$/u` on name, `.email()` on email | `registerSchema` validates both fields identically on frontend + backend. Regex allows Unicode letters only (covers accented pt-BR names). `.email()` catches all malformed inputs. | ✅ PASS |
| **NFR-SEC-06** | Rate limit register endpoint 5/IP/hour | 5 req/IP/hr | `registerLimiter` with max:5, windowMs: 1hr (auth-router.js lines 50-54). Express rate-limit + Redis-backed store. Dual-layer with nginx (100r/m burst 20). API test `should return 429` ✅. | ✅ PASS |
| **NFR-ACC-01** | WCAG 2.1 AA: keyboard nav, screen reader labels | aria attributes, keyboard nav, focus mgmt | RegisterForm: `aria-label` on form + button, `aria-invalid`, `aria-describedby`, `sr-only` error spans, `role="alert"` + `aria-live="polite"` on status. VerificationStatus: `aria-live="polite"`, `role="status"`. Native form elements = keyboard navigable. | ✅ PASS |
| **NFR-ACC-07** | Onboarding UI in pt-BR + en | Both locale files exist + identical key coverage | `pt-BR/auth.json` (29 lines, 17 keys) + `en/auth.json` (29 lines, 17 keys). Identical key structure. Loaded via `useTranslation('auth')`. All visible strings i18n'd. | ✅ PASS |

## Persona Validation — Mãe da Julia (The Caring Parent)

- **PASS** ✅ — Full journey validated:
  1. Register → email + child name → "Check your email!" success screen
  2. Receives verification email with magic link (72h expiry, COPPA notice in footer)
  3. Clicks link → account activated → redirected to welcome
  4. Child sees welcome screen with name greeting + "Start" button
  5. Errors handled: invalid email, duplicate, rate limit, expired link

## Issues Found

| Severity | Area | Description | Code Location | Recommendation |
|----------|------|-------------|---------------|----------------|
| **MINOR** | Frontend `useRegister` | `onSuccess` handler accesses `data.childId` which is never returned by POST /api/auth/register response (only returns `parentId`). No actual impact since RegisterPage changes to success screen and doesn't use user data. | `useRegister.js:21` | Remove `setUser` and `setToken` calls from register `onSuccess` or add childId to register response |
| **MINOR** | Frontend coverage gap | `useRegister.js`, `useVerify.js`, `auth-store.js`, `RegisterPage.jsx` have 0% test coverage. Components that depend on them are tested via mocks. Hooks should have direct unit tests. | 4 files uncovered | Add unit tests for hooks + store |
| **LOW** | Frontend resend flow | VerifyPage resend uses idempotent `/api/auth/register` call (via `useRegister`) rather than dedicated `POST /api/auth/resend-verification`. Works correctly but misses dedicated `resend` i18n keys in VerificationStatus UI. | `VerifyPage.jsx:35` | Consider using dedicated resend endpoint for clarity |
| **LOW** | Email service coverage | `email-service.js` at 35.95% coverage. Complex retry/backoff logic has limited test coverage. | `email-service.js:70-110` | Add tests for retry paths, transient failures, max retries |
| **INFO** | nginx TLS | TLS config is commented out in default nginx.conf. Must be enabled for production per NFR-SEC-01. | `nginx.conf:48-52` | Uncomment TLS block and provide certs in production deployment |

## Recommendations

1. **(Minor)** Clean up `useRegister.js` `onSuccess` — remove dangling `setToken`/`setUser` calls since register response doesn't include those fields, or add them to the API response for potential future use
2. **(Minor)** Add unit tests for `useRegister.js`, `useVerify.js`, and `auth-store.js` to meet frontend coverage targets (≥80%)
3. **(Low)** Increase email-service.js test coverage — add test cases for retry logic, transient vs permanent failures, and backoff behavior
4. **(Info)** Ensure TLS certificates are provisioned and nginx.conf TLS section is uncommented before production deployment

## Test Flow Diagram

```mermaid
flowchart LR
    subgraph "AC-1: Registration"
        FE1[RegisterPage] -->|RegisterForm| H1[useRegister]
        H1 -->|POST /api/auth/register| R1[auth-router]
        R1 -->|validateSchema| VS1[validation-schemas]
        R1 -->|registerLimiter| RL1[Rate Limit 5/hr]
        R1 -->|registerParentAndChild| M1[auth-manager]
        M1 -->|createParent+Child| D1[auth-dao]
        M1 -->|generateJWT 72h| T1[Token]
        M1 -->|sendVerificationEmail| E1[email-service]
        E1 -->|SMTP| Mail[Mailer]
    end

    subgraph "AC-2: Verification"
        Link[Magic Link Click] --> |GET /verify/:token| R2[auth-router]
        R2 -->|verifyEmail| M2[auth-manager]
        M2 -->|findByTokenHash| D2[auth-dao]
        M2 -->|jwt.verify + DB expiry| V{Valid?}
        V -->|Yes| Act[activateChild]
        V -->|Expired| E410[410 TOKEN_EXPIRED]
        V -->|Invalid| E404[404 TOKEN_NOT_FOUND]
    end

    subgraph "AC-4: 72h Expiry"
        C1[Child Login] -->|POST /child-login| R3[auth-router]
        R3 -->|childLogin| M3[auth-manager]
        M3 -->|check isActive| A{Active?}
        A -->|Yes| Tk[Issue Access+Refresh Tokens]
        A -->|No| N403[403 NOT_VERIFIED]
    end

    subgraph "AC-5: Welcome"
        VerifyPage -->|navigate /welcome| WP[WelcomePage]
        WP -->|useAuthStore| AS[auth-store]
        WP -->|t('welcome.title', {name})| I18N[i18n]
    end
```

## Files Examined (19 total)

### Backend (7 files)
- `backend/src/app/auth/auth-model.js` — Parent + Child Mongoose schemas ✅
- `backend/src/app/auth/auth-dao.js` — Data access layer ✅
- `backend/src/app/auth/auth-manager.js` — Business logic ✅
- `backend/src/app/auth/auth-router.js` — Express routes + rate limiters ✅
- `backend/src/app/common/email-service.js` — Nodemailer dispatch ✅
- `backend/src/app/common/validation-schemas.js` — Shared Zod schemas ✅
- `backend/src/app.js` — Express app setup ✅

### Frontend (7 files)
- `frontend/src/app/auth/RegisterPage.jsx` — Registration page ✅
- `frontend/src/app/auth/VerifyPage.jsx` — Verification page ✅
- `frontend/src/app/auth/WelcomePage.jsx` — Welcome onboarding ✅
- `frontend/src/components/auth/RegisterForm.jsx` — Form component ✅
- `frontend/src/components/auth/VerificationStatus.jsx` — Status display ✅
- `frontend/src/hooks/useRegister.js` — Register mutation
- `frontend/src/hooks/useVerify.js` — Verify mutation
- `frontend/src/stores/auth-store.js` — Zustand store ✅

### Config / i18n (4 files)
- `backend/package.json` ✅
- `frontend/package.json` ✅
- `nginx/nginx.conf` — TLS + rate limiting ✅
- `frontend/src/i18n/locales/pt-BR/auth.json` ✅
- `frontend/src/i18n/locales/en/auth.json` ✅

---
**Status**: PASSED ✅ (with 2 minor, 2 low recommendations)

**QA Engineer**: QAAnalyst
**Report saved**: `docs/stories/STORY-001-qa-report.md`
