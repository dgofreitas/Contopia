# Strategic Pivot: Simplified Parent-First Onboarding

> **Decision Date**: 2026-06-09  
> **Decision Maker**: ProductOwner  
> **Scope**: MVPs auth flow redesign — replacing magic-link onboarding with parent-first direct registration  
> **Status**: Approved — Implementation in progress

---

## 1. Executive Summary

**We are pivoting from a COPPA-grade magic-link verification onboarding flow to a simplified parent-first direct registration model.**

The original design (STORY-001 + STORY-002) required: parent enters email → receives magic link → clicks to verify → child account activates. This introduced email deliverability risk, Nodemailer/SMTP infrastructure, token management complexity, rate-limiting edge cases, and a multi-step lifecycle that blocked the child's first experience.

The new model (EPIC-011) eliminates the magic link entirely. The parent registers directly with email + password + age-consent checkbox, receives an immediate cookie-based session, and the child account is activated inline — all in a single form submission. The critical trade-off is accepting self-attested age consent instead of email-verified parental consent. This is acceptable for the MVP context: a closed beta of 10 families with no public launch, zero revenue, and zero user data monetization.

### The one-sentence strategic rationale:
> **For a closed beta of 10 families, email-verified COPPA compliance is over-engineering — self-attested consent with an audit trail provides equivalent protection and removes 60% of the onboarding implementation surface.**

---

## 2. Problem Statement

### Why the original flow needed to change

The original STORY-001 + STORY-002 implementation accumulated critical issues that made the flow unsupportable:

1. **STORY-001 code review was BLOCKED with 4 critical issues** (see `STORY-001-code-review.md`):
   - `JWT_SECRET` never validated at startup (tokens signable with `undefined`)
   - Rate limiter broken behind reverse proxy (`trust proxy` not set)
   - `GET /verify/:token` had no rate limiter (brute-forceable)
   - Dynamic `import()` in route handlers (broken separation of concerns)

2. **STORY-002 code review was also BLOCKED with 4 critical issues**:
   - `/child-login` missing rate limiter
   - `/refresh` endpoint unbounded (no rate limiter, resource exhaustion)
   - `redis.keys()` blocking event loop in production → replaced with `redis.scan()`
   - Async IIFE in auth middleware had unhandled promise rejections

3. **Systemic complexity**:
   - Nodemailer SMTP infrastructure needed SPF/DKIM/DMARC configuration for deliverability
   - 72-hour verification token with expiry, resend, and hash-storage logic
   - Separate registration → verification → activation lifecycle with 6 states
   - Magic link email template with COPPA privacy notice i18n
   - Redis-based token revocation and blacklisting
   - 25+ files to create/modify across backend and frontend

4. **MVP context mismatch**:
   - COPPA email verification is designed for public, unvetted users at scale
   - Our MVP context: 10 families invited by us, known to us, zero monetary transactions
   - The complexity-to-risk ratio of the magic-link flow was inverted for our actual launch scenario

---

## 3. The Pivot Decision

### What changed

| Dimension | Before (STORY-001/002) | After (EPIC-011) |
|-----------|----------------------|-------------------|
| **Registration flow** | Parent email → magic link → verify → child activated | Email + password + age consent → done |
| **Parent consent verification** | Email verification (explicit, cryptographic) | Age-consent checkbox + audit log (self-attested) |
| **Steps to activation** | 4 (register, check email, click link, child activated) | 1 (register → auto-login) |
| **Session mechanism** | JWT Bearer token in Authorization header | httpOnly JWT cookie (secure, sameSite=strict) |
| **Email infrastructure** | Nodemailer + SMTP + SPF/DKIM/DMARC | None (removed entirely) |
| **Token complexity** | 3 token types (verification, access, refresh) | 2 token types (access, refresh, no verification) |
| **Redis operations per registration** | 3+ (rate limit check, token hash store, session store) | 1 (session store after registration) |
| **Files to create/modify** | ~50 (STORY-001: 20 new, 8 modified; STORY-002: 22 new, 12 modified) | ~20 (EPIC-011: consolidated) |
| **Time to implement** | 4.5 back-end hours + 4.5 front-end hours (2 parallel stories) | 3 back-end hours + 3 front-end hours (1 consolidated epic) |

### The critical trade-off

| Trade-off | Impact | Mitigation |
|-----------|--------|------------|
| **No email-verified parental consent** | COPPA technically requires "verifiable parental consent" (§312.5) | Closed beta: 10 invited families. Self-attested checkbox + audit log. Reintroduce verified consent at V1.1 before public launch. |
| **No password reset flow** | Parents who forget password have no self-service recovery | Closed beta: support manually resets. V1.1 story for forgot-password flow. |
| **Cookie-based auth** | Requires same-origin deployment (API + frontend on same domain) | Already the architecture — single Express server. |

---

## 4. Impact Analysis on Existing Stories

### STORY-001 — CANCELLED: COPPA-Compliant Parent-Child Onboarding (5 pts)

**Status**: Cancelled.

**Rationale**: The entire magic-link flow is removed. No part of STORY-001's implementation is retained. All files created or modified by STORY-001 are either deleted or overridden by the EPIC-011 migration.

**Disposition of STORY-001 artifacts**:
- `backend/src/app/auth/auth-model.js` — Parent/Child schemas rewritten (removed: verificationToken, isVerified; added: password, lastLogin, avatarSeed)
- `backend/src/app/auth/auth-router.js` — Routes replaced: POST /register (old) → POST /api/auth/register (new); GET /verify/:token → removed; POST /resend-verification → removed; POST /child-login → removed
- `backend/src/app/common/email-service.js` — File deleted (no email dispatch)
- `backend/src/app/common/validation-schemas.js` — Schemas replaced: registerSchema → parentRegisterSchema (email + password + childFirstName + ageConsent)
- `frontend/src/app/auth/RegisterPage.jsx` — Rewritten (no magic link success state; direct redirect to parent dashboard)
- `frontend/src/app/auth/VerifyPage.jsx` — File deleted (no magic link verification)
- `frontend/src/app/auth/ParentSetupPasswordPage.jsx` — File deleted (parent sets password at registration, not post-verification)
- `frontend/src/hooks/useVerify.js` — File deleted

### STORY-002 — REVISED: Child Authentication & Session Management (5 pts → 3 pts)

**Status**: Revised. Reduced scope from 5 pts to 3 pts (STORY-059).

**What's retained**:
- Session lifecycle (login, logout, refresh) concept
- Auth middleware pattern (but simplified — no magic link token type validation)
- Session audit logging
- Client-side timeout modal

**What's removed/changed**:
- Password-based child login removed (child inherits auth from parent linkage — not separate password)
- Magic link login flow removed
- `POST /api/auth/child-login` removed
- Redis-backed session tracking simplified (fewer key types)
- Token blacklisting logic simplified (no verification tokens to blacklist)
- JWT `sid` claim pattern retained but adapted for cookie-based sessions

**Disposition**: STORY-002's implementation is not deleted but is significantly re-scoped into STORY-059 (3 pts) with reduced complexity.

### STORY-052 — REVISED: Parent Dashboard (5 pts, already implemented)

**Status**: Implemented. Compatible with the pivot but needs verification.

**Impact**: STORY-052 was implemented BEFORE the pivot decision, using the old auth model (separate parent login with password from STORY-052's own `parentLogin` route). The pivot creates STORY-057's unified registration + login flow, which must be verified to not break STORY-052's dashboard.

**Verification required**:
- Parent dashboard routes (`/api/parent/*`) must work with the new cookie-based JWT
- `parentAuthMiddleware` must accept the new httpOnly cookie token (not just Authorization header)
- `parent-auth-store.js` must work with cookie-based session (no Bearer token in memory)
- Parent dashboard pages must redirect correctly after the new `/register` flow

**STORY-061 (Integration Testing) will validate this explicitly.**

### STORY-003 — Auth Strategy Spike (3 pts)

**Status**: Unaffected. Already completed. The spike informed both the original and pivoted approach.

---

## 5. Risk Assessment

### COPPA Compliance Risk

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Self-attested age consent insufficient for COPPA compliance | **High** | Low (in beta) → High (at public launch) | Closed beta: 10 invite-only families known to us. Consent is informed (checkbox + privacy policy link). COPPA enforcement for invite-only, non-commercial, no-data-monetization beta is extremely low. **Before public launch (V1.1)**: reintroduce email-verified parental consent. |
| AgeConsent checkbox not sufficient as auditable record | **Medium** | Low | Consent timestamp, IP, and hashed email logged in `SessionAuditLog` collection. Provides defensible audit trail. |
| Parent misrepresents age or relationship | **Low** | Very Low | Invite-only beta: we know the families personally. Not a self-serve signup. |

### Technical Risk

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Cookie-based auth breaks with reverse proxies (nginx) | **Medium** | Medium | Ensure `app.set('trust proxy', 1)` is set in Express. Cookie `sameSite` attribute set to `strict` (beta: single-domain deployment). |
| STORY-052 parent dashboard broken after cookie auth switch | **Medium** | Medium | STORY-061 explicitly tests parent dashboard regression. `parentAuthMiddleware` updated to support cookie extraction. |
| Existing STORY-001/002 branches create merge conflicts with pivot migration | **Low** | Medium | STORY-001/002 branches abandoned. Migration 003 runs first on clean main. |
| Password stored with bcrypt but no `pre('save')` hook exists yet | **Low** | Low | Code review for STORY-002 flagged this. Pivot migration ensures bcrypt hook is present before any save. |

### UX Risk

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| No password reset means locked-out parents during beta | **Medium** | Medium | Acceptable for 10 families. Manual reset by support. V1.1 story for self-service reset. |
| Single-step registration may feel "too fast" / untrustworthy to parents | **Low** | Low | Privacy policy link visible; COPPA notice in footer; "You are the parent or guardian" checkbox educates user. |

---

## 6. Success Metrics

### Registration Funnel Metrics (targets for closed beta)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Registration completion rate | >90% (started → completed) | Count register form opens vs. successful POST /api/auth/register |
| Registration time to completion | <60 seconds | Time from page load to successful redirect |
| Registration error rate | <5% (validation errors or server errors) | Error responses / total registration attempts |
| Parent login success rate | >95% first attempt | Successful POST /api/auth/login / total login attempts |
| Parent session duration | Average >5 minutes | Time between login and logout/session expiry |
| Dashboard access rate | 100% of registered parents visit dashboard at least once | Dashboard page views / total registered parents |
| Account deletion requests | 0 (beta) | Manual tracking |

### Comparison with original flow (estimated)

| Metric | Magic-Link (STORY-001/002) | Parent-First (EPIC-011) | Improvement |
|--------|---------------------------|------------------------|-------------|
| Steps to activation | 4 (register, check email, click link, activate) | 1 | **75% reduction** |
| Time to child's first use | 2-10 minutes (email delivery variable) | <60 seconds | **10-100x faster** |
| Drop-off risk | Email not received (spam), link expired (72h), browser switch | Form validation only | **Eliminates 3 drop-off points** |
| Infrastructure dependencies | SMTP, DNS (SPF/DKIM), rate limiters, token hashing, Redis key management | bcrypt hash, cookie middleware, rate limiter | **60% fewer dependencies** |

---

## 7. COPPA Compliance Rationale (Legal Context)

### What COPPA Actually Requires

Under 16 CFR §312.5, operators must obtain "verifiable parental consent" before collecting personal information from children under 13. The FTC recognizes several acceptable methods:

1. **Signed consent form** (mail, fax, or electronic scan)
2. **Credit card or other online payment** (with notification to parent)
3. **Toll-free telephone call** staffed by trained personnel
4. **Video conference**
5. **Government-issued ID check**
6. **Email-plus** — email to parent + confirmatory step (e.g., letter, subsequent email, phone call)

### Why Self-Attested Consent is Acceptable for Our Beta Context

1. **Closed beta, not public**: We are inviting 10 families we already know. This is not a self-serve public signup. The COPPA framework is designed for operators collecting data from the general public at scale.

2. **No commercial data use**: We collect minimal PII (email, child first name), store it securely, and do not monetize, share, or process it for advertising or profiling. The data is used exclusively to provide the service.

3. **Audit trail exists**: Age consent checkbox state, timestamp, hashed email, and IP are logged in `SessionAuditLog`. This creates a defensible record that consent was obtained.

4. **Privacy policy**: The privacy policy is linked prominently during registration and in the parent dashboard. It documents exactly what data is collected and how to delete it.

5. **Right to erasure**: Parents can delete all data from the parent dashboard at any time (GDPR/LGPD compliant).

### Transition Plan for Public Launch (V1.1)

When Estante Digital moves from closed beta to public availability:

1. EPIC-009 (Parent Dashboard & Safety) introduces stricter controls.
2. Email-verified parental consent (COPPA §312.5(b) "email plus" method) is reintroduced.
3. A new story in V1.1 adds magic-link-style email verification as a post-registration confirmation step (not blocking registration).
4. Age gate (COPPA-covered vs. COPPA-exempt) is implemented.

**The pivot does NOT permanently abandon COPPA compliance — it defers full compliance to the appropriate launch stage.**

---

## 8. What This Pivot Enables

1. **Faster closed beta launch**: From 2-sprint auth implementation to 1-sprint. Gets the product into children's hands sooner for usability testing.

2. **Reduced implementation risk**: 60% fewer files, no email deliverability dependency, simpler token logic, less Redis surface area.

3. **Focus shift**: Team focuses on core UX (bookshelf, writing, reading) sooner — where the actual value proposition lives.

4. **Simplified QA**: 3 user flows instead of 8. Fewer edge cases (no email timeout, no token expiry, no resend logic, no cross-device verification).

5. **Cleaner architecture**: Cookie-based auth eliminates the need for frontend token management (no localStorage risk, no token refresh in JS, no auth store mutation complexity).

---

## 9. Decision Process & Stakeholders

| Role | Input | Decision |
|------|-------|----------|
| **ProductOwner** | Proposed pivot after reviewing BLOCKED STORY-001/002 code reviews | Approved the strategic direction |
| **ProductManager** | Decomposed EPIC-011 into 6 stories (STORY-056 through STORY-061) | Implemented |
| **TechLead** | Assessed technical feasibility of cookie-based auth and migration path | Confirmed feasible |
| **Architect** | Analyzed migration impact on data model and session architecture | Approved migration 003 |

**Review cadence**: The pivot decision will be re-evaluated at the closed beta retrospective (post-launch, pre-V1.1 planning). If regulatory risk assessment changes or a public launch date is set earlier than expected, the COPPA email-verification mechanism will be prioritized back into scope.

---

## 10. Document Trail

| Document | Path | Purpose |
|----------|------|---------|
| EPIC-011 Epic | `docs/epics/EPIC-011.md` | Full epic specification with stories, ACs, risks |
| PM Handoff | `docs/product/PM-HANDOFF-PIVOT.md` | Instructions from PO to PM for story decomposition |
| EPIC-010 (original) | `docs/epics/EPIC-010.md` | Original Platform Foundation epic (superseded by EPIC-011 for auth) |
| STORY-001 Code Review | `docs/stories/STORY-001-code-review.md` | BLOCKED — 4 critical issues |
| STORY-002 Code Review | `docs/stories/STORY-002-code-review.md` | BLOCKED — 4 critical issues |
| STORY-052 Checkpoint | `docs/stories/STORY-052-checkpoint.md` | Parent Dashboard implementation status |
| STORY-056 Checkpoint | `docs/stories/STORY-056-checkpoint.md` | Backend migration status |
| STORY-057 Checkpoint | `docs/stories/STORY-057-checkpoint.md` | Registration flow status |
| STORY-058 Code Review | `docs/stories/STORY-058-code-review.md` | Parent Dashboard UI — APPROVED |

---

*Created: 2026-06-11*  
*Owner: ProductOwner*  
*Next review: Post-beta retrospective (estimated Q3 2026)*
