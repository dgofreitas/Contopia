# STORY-059: Implementation Plan — Child Auth Adaptation

> **Status**: Pending  
> **Story Points**: 3  
> **Depends on**: STORY-056, STORY-057

---

## Task Breakdown

### 1. Backend — Child Session Endpoint
- [ ] Create `POST /api/auth/child-session` route in `auth-router.js`
- [ ] Add `createChildSession(parentId)` function in `auth-manager.js`
- [ ] Validate parent JWT cookie before issuing child token
- [ ] Issue child access token with claims: `{ role: "child", childId, parentId, iat, exp }`
- [ ] Store child session in Redis: `child:session:<childId>` with 30-minute TTL

### 2. Backend — Middleware Adaptation
- [ ] Update `child-auth-middleware.js` (or equivalent):
  - Remove `type === 'login_magic'` and `type === 'verify_email'` validation
  - Accept only tokens with `role: "child"` claim
  - Verify `parentId` claim maps to an active parent account
- [ ] Update `auth-dao.js` if needed: add `findActiveParentById(parentId)` for middleware verification

### 3. Backend — Route Cleanup
- [ ] Remove `POST /api/auth/child-login` route (if still present)
- [ ] Remove any magic-link-specific child auth routes
- [ ] Verify no remaining references to `login_magic` or `verify_email` token types in auth code

### 4. Frontend — Parent Dashboard Button
- [ ] Add "Start Julia's Session" button (or equivalent) to `ParentDashboardPage.jsx`
- [ ] Create `useChildSession` hook: calls `POST /api/auth/child-session`, receives child token
- [ ] On success: store child token and redirect to child bookshelf route
- [ ] Handle error states: parent session expired, child account not found

### 5. Frontend — Child Auth Store
- [ ] Update `child-auth-store.js` (or equivalent) to accept token from parent-initiated session
- [ ] Ensure child auth store is independent from parent auth store
- [ ] Child logout: clear child token, redirect to "session expired" page (not parent dashboard)

### 6. Tests
- [ ] Unit tests: `createChildSession`, child auth middleware, token validation
- [ ] Integration tests: parent dashboard → child session → bookshelf
- [ ] Test: parent logout does NOT invalidate child session
- [ ] Test: child session expires after 30 minutes of inactivity
- [ ] Test: old magic-link token types rejected

### 7. Documentation
- [ ] Update auth flow documentation to reflect parent-first child session model
- [ ] Document child session Redis key pattern and TTL

---

## Dependencies
- **Blocked by**: STORY-056 (backend auth foundation), STORY-057 (registration flow + cookie-based auth)
- **Blocks**: STORY-061 (integration testing)

## Parallelism
- Can run in parallel with STORY-060 (Parent Session Management) — different domains (child auth vs. parent session)
- Coordinate with TechLead for shared Redis session patterns
