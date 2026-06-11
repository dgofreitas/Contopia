# PM Handoff — Pivot: Simplified Parent-First Onboarding

> **Handoff date**: 2026-06-09  
> **From**: ProductOwner  
> **To**: ProductManager  
> **Status**: Partially implemented — 3 of 6 stories done; 3 pending  
> **Reference**: EPIC-011 (Simplified Parent-First Onboarding)

---

## 1. What Happened

We pivoted from the original magic-link onboarding (STORY-001 + STORY-002, both BLOCKED at code review) to a simplified parent-first direct registration model. You already decomposed EPIC-011 into 6 stories. Three have been implemented (STORY-056, 057, 058). Three remain.

This handoff confirms the decomposition is correct and provides tactical guidance for the remaining stories.

---

## 2. Epics Decomposed

| Epic | Priority | Estimate | Target Release | Decomposition Hint |
|------|----------|----------|----------------|---------------------|
| **EPIC-011** | Must Have | L | MVP | Decomposed into 6 stories: backend migration (056), registration flow (057), parent dashboard (058), child auth adaptation (059), session security (060), integration QA (061). |

---

## 3. Story Inventory

### Completed Stories

| ID | Title | Points | Status | Notes |
|----|-------|--------|--------|-------|
| STORY-056 | Backend Schema & Auth Migration | 5 | Implemented | Migration 003 run; auth-model, auth-dao, auth-manager, auth-router updated. Tests pending. |
| STORY-057 | Direct Registration Flow | 5 | Implemented | POST /api/auth/register with email+password+ageConsent. Frontend RegisterPage rewritten. Tests pending. |
| STORY-058 | Parent Dashboard UI | 5 | Code Reviewed | APPROVED with 3 minor issues (aria-controls ID, landmark nesting, dynamic import). |

### Pending Stories

| ID | Title | Points | Status | Blocked By | Decomposition Hint |
|----|-------|--------|--------|------------|---------------------|
| **STORY-059** | Child Auth Adaptation | 3 | Not Started | STORY-056, STORY-057 | Adapt child login for parent-first model. Remove magic-link references. Child inherits auth from parent linkage. |
| **STORY-060** | Parent Session Management & Security | 3 | Not Started | STORY-056, STORY-057 | Session timeout (30m), refresh, logout, rate limiting on login/register, audit logging, cookie security config. |
| **STORY-061** | Integration Testing & QA Signoff | 3 | Not Started | STORY-056, 057, 058, 059, 060 | Full E2E: register → dashboard → child login → shelf. Regression test STORY-052. WCAG AA audit. |

---

## 4. Recommended Implementation Order

### Current Status: Phase 1 Complete (Stories 056-058)

```
✅ STORY-056 (Backend foundation)
✅ STORY-057 (Registration flow)
✅ STORY-058 (Parent Dashboard UI)
```

### Phase 2: Remaining Stories (in order)

```
1. STORY-059 (Child Auth Adaptation) — depends on 056+057
2. STORY-060 (Parent Session Security) — depends on 056+057
3. STORY-061 (Integration Testing & QA) — depends on all above
```

**Parallelism note**: STORY-059 and STORY-060 can potentially run in parallel since they touch different domains (child auth vs. parent session). Coordinate through TechLead.

---

## 5. Tactical Guidance for Each Pending Story

### STORY-059: Child Auth Adaptation (3 pts)

**What this story does**: Adapts the child authentication flow to work with the new parent-first model, where the parent registers first and the child account is created inline (no email verification gate).

**Key technical requirements**:
1. Child account is already `isActive: true` after parent registration (STORY-056 migration)
2. No child password needed — child is authenticated via parent linkage
3. Child session must be independent from parent session (child can log in while parent session is active or expired)
4. Remove any references to the old magic-link token types from child auth middleware

**What to remove**:
- `POST /api/auth/child-login` route (if not already removed by STORY-056)
- Magic-link verification token validation in child auth flow
- `type === 'login_magic'` token validation

**What to add/adapt**:
- Child session creation triggered by parent dashboard "Start child session" button (or equivalent)
- Child access token issued with `parentId` claim from the parent linkage
- Child session stored in Redis with same TTL pattern
- Frontend: child login page or direct-to-shelf flow (no separate child password)

**Acceptance criteria focus**:
- Given a parent is logged in, when they initiate a child session, then the child access token is issued and valid
- Given a child session is active, when the parent logs out, then the child session remains active (independent)
- Given a child session is active, when 30 minutes of inactivity pass, then the session expires

### STORY-060: Parent Session Management & Security (3 pts)

**What this story does**: Hardens the parent auth system with session lifecycle management, rate limiting, audit logging, and secure cookie configuration.

**Key technical requirements**:
1. Login endpoint: POST /api/auth/login with rate limiting (10 req/min per IP)
2. Logout: clear httpOnly cookie, revoke session in Redis
3. Session refresh: issue new JWT, rotate refresh token
4. Idle timeout: 30-minute Redis TTL on session key, soft warning at 25 minutes
5. Audit logging: SESSION_CREATED, SESSION_LOGOUT, SESSION_EXPIRED, LOGIN_FAILED events
6. Cookie config: httpOnly, secure (HTTPS only), sameSite=strict, path=/api

**What to remove** (from old STORY-001/002 patterns):
- `POST /api/auth/refresh` route with Bearer token refresh — replace with cookie-based refresh
- `bl:{tokenHash}` blacklist keys — simplified: just delete the session key on logout (Redis TTL handles expiry)

**What to add**:
- `loginRateLimiter` on POST /api/auth/login
- `registerRateLimiter` on POST /api/auth/register (if not already in STORY-057)
- `session-timeout-middleware.js` adapted for cookie-based auth
- `session-audit-log` entries for all lifecycle events
- Config validation: ensure cookie-parser is properly configured for secure cookies

**Acceptance criteria focus**:
- Given a parent logs in, when 30 minutes pass with no activity, then the next request returns 401
- Given a parent logs out, when they try to use their old cookie, then it is rejected
- Given 6 failed login attempts in 1 minute, when the 7th is attempted, then 429 is returned
- Given a login succeeds, when the session is created, then a SESSION_CREATED audit event is logged

### STORY-061: Integration Testing & QA Signoff (3 pts)

**What this story does**: Validates the entire EPIC-011 implementation end-to-end, including regression testing of STORY-052.

**Test scenarios** (minimum):

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Full registration flow | Open /register → fill form → submit → redirect | Parent redirected to /parent/dashboard; JWT cookie set; child account created and active |
| 2 | Parent login | Open /login → enter credentials → submit | Redirected to /parent/dashboard; valid session cookie |
| 3 | Parent logout | Dashboard → click logout | Redirected to /login; cookie cleared; session revoked in Redis |
| 4 | Session timeout | Login → idle 30m → attempt action | 401 response; redirected to /login with session expired message |
| 5 | Registration validation | Submit form with invalid email / short password / no consent | Validation errors displayed; no account created |
| 6 | Duplicate registration | Register with existing email | 409 response with "account exists" message |
| 7 | Rate limiting | Rapid registration attempts (11 in 1 min) | 429 on 11th attempt |
| 8 | STORY-052 regression | Login as parent → access dashboard tabs (Activity, Export, Delete, Privacy) | All tabs functional with new cookie-based auth |
| 9 | Child session after parent registration | Parent registers → access child book shelf | Child shelf loads with active child account |
| 10 | WCAG AA audit | Keyboard navigate registration → login → dashboard | All forms reachable via Tab; screen reader announces errors; contrast 4.5:1 |

**Regression test (STORY-052)**:
- Parent dashboard `/api/parent/dashboard` endpoint must accept the new cookie-based auth
- Parent data export must work with the new parent model (password field excluded from export)
- Account deletion must clean up parent + child + all associated data
- Privacy policy page must render from parent dashboard

**QA checklist**:
- [ ] All 10 test scenarios pass
- [ ] STORY-052 regression passes
- [ ] Lighthouse accessibility score ≥ 95 on registration and dashboard pages
- [ ] No PII in logs (email hashed, child name hashed)
- [ ] Cookie flags verified: httpOnly, secure, sameSite=strict (Browser DevTools)
- [ ] Rate limiting verified with automated burst test
- [ ] Cross-browser: Chrome, Safari, Firefox desktop + mobile

---

## 6. Cancelled and Revised Stories

### CANCELLED: STORY-001 — COPPA-Compliant Parent-Child Onboarding (5 pts)

**Status**: Cancelled. Do not re-implement. All code from STORY-001 branch is abandoned.

**What to do with existing STORY-001 artifacts**:
- Any code in `feat/STORY-001-*` branches: abandon, do not merge
- Migration 003 (`003-pivot-parent-child.js`) supersedes all STORY-001 data model changes
- All STORY-001-specific files (VerifyPage, useVerify, email-service, verification templates) are deleted by STORY-057

### REVISED: STORY-002 — Child Authentication & Session Management (5 pts → 3 pts)

**Status**: Revised. Reduced to 3 pts as STORY-059. Original 5-pt scope is not implemented.

**What's preserved**: Session lifecycle concept, auth middleware pattern, audit logging.
**What's removed**: Magic link login path, password-based child login, `POST /api/auth/child-login`, complex Redis blacklisting.

### REVISED: STORY-052 — Parent Dashboard (5 pts, already implemented)

**Status**: Implemented and code reviewed (APPROVED). Must be regression-tested in STORY-061.

**What to verify**: Dashboard routes work with httpOnly JWT cookie (not Bearer header). Parent auth middleware reads from cookie, not only from Authorization header.

---

## 7. Decomposition Validation Checklist

Per PM-HANDOFF.md Definition of Ready:

- [x] Clear title and user-centric description (for each story: STORY-056 through STORY-061)
- [x] Referenced persona(s) from PERSONAS.md (Primary: Mãe da Julia; Secondary: Julia)
- [x] Referenced parent epic (EPIC-011)
- [x] Acceptance criteria in GIVEN-WHEN-THEN format (defined at epic level; stories inherit)
- [x] NFRs identified and testable per story (documented in EPIC-011 NFRS section)
- [x] Dependencies identified between stories (documented above)
- [x] Max story size: 8 points (all stories are 3-5 pts)
- [x] MVP scope = Must Have epics only (EPIC-011 is Must Have)

---

## 8. Constraints for ProductManager

### Scope
- MVP scope for auth is now entirely within EPIC-011. EPIC-010's auth subsection is superseded.
- Do NOT create stories for: password reset, email verification, magic links, two-factor auth, social login.
- These features are deferred to V1.1 (EPIC-009 expansion).

### Story Sizing
- Max 8 points per story. Current decomposition uses 3-5 points per story (correct).
- If STORY-059 or STORY-060 grows beyond 5 pts during implementation, split by concern (e.g., STORY-060A: session management, STORY-060B: rate limiting + audit).

### Quality Bars
- Every story must reference Mãe da Julia persona (primary for auth).
- Every story must link to EPIC-011.
- Every story must satisfy relevant NFRs from `docs/product/NFRS.md` (SEC-01, SEC-03, SEC-04, SEC-06, PRV-01, PRV-03, ACC-01, ACC-07).
- No social features, no ads, no third-party tracking (per VISION.md).

### Definition of Done
- [ ] Code reviewed and merged (VERDICT: APPROVED or higher).
- [ ] Unit tests passing (backend ≥ 90% line coverage; frontend ≥ 80%).
- [ ] QA tested on target devices (Chrome, Safari, Firefox, mobile responsive).
- [ ] Accessibility checked (WCAG 2.1 AA for auth flows).
- [ ] Security review (cookie flags, bcrypt, rate limiting, Zod validation).
- [ ] PO acceptance (implicit — PO approved the pivot).

---

## 9. Out of Scope (Do NOT Create Stories For)

| Excluded Feature | Reason | Future Possibility |
|------------------|--------|-------------------|
| Email verification (magic link) | Removed in pivot; over-engineered for closed beta | V1.1 (reintroduce before public launch) |
| Password reset flow | Covered by manual support in beta | V1.1 |
| Two-factor authentication | Overkill for MVP | V2.0+ |
| Social login (Google, Apple) | Out of vision per EPIC-010 scope | Won't Have |
| Multi-child per parent account | Acceptable for MVP; invite-only families | V1.1+ |
| Parent notification emails | No email infrastructure | V1.1 |
| COPPA full email-verified consent | Deferred per STRATEGIC-PIVOT-ONBOARDING.md | V1.1 before public launch |
| Child password for independent login | Child inherits from parent linkage | V1.1+ (if user research supports) |

---

## 10. Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Pivot Decision | `docs/product/STRATEGIC-PIVOT-ONBOARDING.md` | Why we pivoted, trade-offs, COPPA rationale |
| EPIC-011 | `docs/epics/EPIC-011.md` | Full epic spec with stories, ACs, NFRs |
| Original EPIC-010 | `docs/epics/EPIC-010.md` | Original Platform Foundation (superseded for auth) |
| Vision | `docs/product/VISION.md` | Product vision and strategic pillars |
| Personas | `docs/product/PERSONAS.md` | Julia, Mãe da Julia, Professora Ana |
| OKRs | `docs/product/OKRS.md` | Objectives and Key Results |
| NFRs | `docs/product/NFRS.md` | Non-functional requirements for all stories |
| Original PM Handoff | `docs/product/PM-HANDOFF.md` | Original handoff (pre-pivot) — for reference only |
| STORY-001 Code Review | `docs/stories/STORY-001-code-review.md` | BLOCKED — technical rationale for pivot |
| STORY-002 Code Review | `docs/stories/STORY-002-code-review.md` | BLOCKED — technical rationale for pivot |
| STORY-056 Checkpoint | `docs/stories/STORY-056-checkpoint.md` | Backend migration status |
| STORY-057 Checkpoint | `docs/stories/STORY-057-checkpoint.md` | Registration flow status |
| STORY-058 Code Review | `docs/stories/STORY-058-code-review.md` | Parent Dashboard UI — APPROVED |
| STORY-052 Checkpoint | `docs/stories/STORY-052-checkpoint.md` | Parent Dashboard implementation (pre-pivot) |

---

## 11. Next Steps

1. **Complete STORY-059 (Child Auth Adaptation)** — TechLead to coordinate implementation.
2. **Complete STORY-060 (Parent Session Management)** — Can be parallelized with STORY-059.
3. **Complete STORY-061 (Integration Testing & QA)** — Must run after all other stories.
4. **Regression test STORY-052** — Verify parent dashboard works with cookie-based auth.
5. **Fix STORY-058 minor issues** — aria-controls ID, landmark nesting, dynamic import (from code review).
6. **Run STORY-056 and STORY-057 tests** — Both are implemented but have tests pending.
7. **Prepare for closed beta launch** — After STORY-061 QA signoff, deploy to staging for 10-family beta.

---

*Handoff date: 2026-06-11*  
*From: ProductOwner*  
*To: ProductManager*  
*Status: Partially implemented — 3 of 6 stories complete; 3 pending*
