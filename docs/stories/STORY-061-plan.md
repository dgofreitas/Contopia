# STORY-061: Implementation Plan — Integration Testing & QA Signoff

> **Status**: Pending  
> **Story Points**: 3  
> **Depends on**: STORY-056, STORY-057, STORY-058, STORY-059, STORY-060

---

## Task Breakdown

### 1. Test Environment Setup
- [ ] Deploy all STORY-056 through STORY-060 code to staging
- [ ] Run migration 003 on fresh staging database
- [ ] Verify Redis instance is running and accessible
- [ ] Configure test parent account and child account fixtures

### 2. E2E Test Automation (Playwright/Cypress)
- [ ] **Scenario 1**: Full registration flow — register → auto-login → dashboard → cookie verification
- [ ] **Scenario 2**: Parent login — valid credentials → dashboard
- [ ] **Scenario 3**: Parent logout — cookie cleared, session revoked
- [ ] **Scenario 4**: Session timeout — idle 30m → 401 (use clock manipulation for speed)
- [ ] **Scenario 5**: Registration validation — invalid email, short password, no consent
- [ ] **Scenario 6**: Duplicate registration — 409 response
- [ ] **Scenario 7**: Rate limiting — 11 rapid requests → 429
- [ ] **Scenario 8**: STORY-052 regression — all dashboard tabs functional
- [ ] **Scenario 9**: Child session — parent registers → child bookshelf loads

### 3. API-Level Integration Tests (Supertest)
- [ ] Test `POST /api/auth/register` — happy path + validation errors + duplicate
- [ ] Test `POST /api/auth/login` — valid + invalid credentials
- [ ] Test `POST /api/auth/logout` — cookie cleared + session revoked
- [ ] Test `POST /api/auth/refresh` — new JWT issued
- [ ] Test `POST /api/auth/child-session` — child token issued
- [ ] Test `GET /api/parent/dashboard` — cookie-based auth accepted
- [ ] Test `GET /api/parent/export` — password field excluded
- [ ] Test `DELETE /api/parent/account` — parent + child + data deleted

### 4. WCAG 2.1 AA Accessibility Audit
- [ ] Run Lighthouse CLI on `/register` page — target score ≥ 95
- [ ] Run Lighthouse CLI on `/login` page — target score ≥ 95
- [ ] Run Lighthouse CLI on `/parent/dashboard` page — target score ≥ 95
- [ ] Manual keyboard navigation test: Tab through all form fields, submit, navigate dashboard
- [ ] Screen reader test: announce form errors, labels, and state changes
- [ ] Color contrast verification: all text ≥ 4.5:1 ratio

### 5. Cookie Security Verification
- [ ] Verify httpOnly flag on auth cookie (Browser DevTools → Application → Cookies)
- [ ] Verify secure flag (HTTPS only; false in dev)
- [ ] Verify sameSite=strict
- [ ] Verify path=/api
- [ ] Verify cookie is NOT accessible via `document.cookie` (JavaScript)

### 6. PII Audit
- [ ] Grep application logs for raw email addresses → must be hashed
- [ ] Grep application logs for raw child names → must be hashed
- [ ] Grep application logs for raw IP addresses → must be hashed
- [ ] Verify audit log entries contain only hashed identifiers

### 7. Cross-Browser Testing
- [ ] Chrome (desktop + mobile viewport 375px)
- [ ] Safari (desktop + mobile viewport)
- [ ] Firefox (desktop + mobile viewport)
- [ ] Verify registration, login, dashboard, and logout work on all browsers

### 8. QA Signoff Checklist
- [ ] All 10 test scenarios pass
- [ ] STORY-052 regression passes
- [ ] Lighthouse accessibility score ≥ 95 on all auth pages
- [ ] No PII in logs
- [ ] Cookie flags verified
- [ ] Rate limiting verified
- [ ] Cross-browser: Chrome, Safari, Firefox
- [ ] QA report generated and attached to story

### 9. Documentation
- [ ] Document test results in QA report
- [ ] Document any known issues or deferred fixes
- [ ] Update EPIC-011 status to "Ready for QA Signoff" or "Complete"

---

## Dependencies
- **Blocked by**: STORY-056, STORY-057, STORY-058, STORY-059, STORY-060 (all must be complete)
- **Blocks**: Closed beta launch

## Notes
- This is a pure testing/QA story — no implementation code
- Coordinate with QAAnalyst agent for test execution and reporting
- If any test scenario fails, the blocking story must be fixed before QA signoff
- STORY-058 minor issues (aria-controls ID, landmark nesting, dynamic import) should be fixed before running WCAG audit
