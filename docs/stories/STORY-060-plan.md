# STORY-060: Implementation Plan — Parent Session Management & Security

> **Status**: Pending  
> **Story Points**: 3  
> **Depends on**: STORY-056, STORY-057

---

## Task Breakdown

### 1. Backend — Session Timeout Middleware
- [ ] Create `session-timeout-middleware.js` adapted for cookie-based auth
- [ ] Check Redis TTL on `parent:session:<parentId>` for each authenticated request
- [ ] If TTL < 5 minutes: set `X-Session-Expiring: 300` response header
- [ ] If TTL expired: delete Redis key, return 401, log SESSION_EXPIRED
- [ ] On valid activity: reset Redis TTL to 30 minutes (sliding expiration)

### 2. Backend — Logout Endpoint
- [ ] Implement `POST /api/auth/logout` in `auth-router.js`
- [ ] Clear httpOnly cookie: `Set-Cookie` with `Max-Age=0`
- [ ] Delete `parent:session:<parentId>` from Redis
- [ ] Log SESSION_LOGOUT audit event

### 3. Backend — Session Refresh Endpoint
- [ ] Implement `POST /api/auth/refresh` in `auth-router.js`
- [ ] Validate current session cookie
- [ ] Issue new JWT with fresh `exp` claim
- [ ] Rotate Redis key TTL back to 30 minutes
- [ ] Return new cookie (no refresh token rotation needed for cookie-based auth)

### 4. Backend — Rate Limiting
- [ ] Add `loginRateLimiter`: 10 req/min per IP on `POST /api/auth/login`
- [ ] Add `registerRateLimiter`: 10 req/min per IP on `POST /api/auth/register` (if not already in STORY-057)
- [ ] Use `express-rate-limit` with Redis store for distributed rate limiting
- [ ] Return 429 with `Retry-After` header and friendly message

### 5. Backend — Audit Logging
- [ ] Add structured Pino log entries for all session lifecycle events:
  - SESSION_CREATED (on login success)
  - SESSION_LOGOUT (on explicit logout)
  - SESSION_EXPIRED (on idle timeout)
  - LOGIN_FAILED (on invalid credentials)
- [ ] Hash all PII in audit logs: parentId, email, IP address
- [ ] Ensure audit logs retained for 12 months (per NFR-PRV-06)

### 6. Backend — Cookie Security Validation
- [ ] Validate cookie-parser configuration:
  - `httpOnly: true`
  - `secure: true` (conditional: false in `NODE_ENV=development`)
  - `sameSite: "strict"`
  - `path: "/api"`
- [ ] Add config validation on server startup — warn if secure flags are misconfigured

### 7. Frontend — Session Expiry Warning
- [ ] Add toast/notification component for session expiry warning
- [ ] Intercept `X-Session-Expiring` header in API client
- [ ] Display: "Your session will expire in 5 minutes. Save your work."
- [ ] On 401 response: redirect to `/login` with "Session expired" message

### 8. Frontend — Logout Handler
- [ ] Add logout button handler in `ParentDashboardPage.jsx`
- [ ] Call `POST /api/auth/logout`
- [ ] Clear parent auth store state
- [ ] Redirect to `/login`

### 9. Tests
- [ ] Unit tests: session timeout middleware, rate limiters, audit logging
- [ ] Integration tests: full logout flow, session expiry, rate limiting
- [ ] Test: 30-minute idle → 401 + SESSION_EXPIRED log
- [ ] Test: 25-minute idle → soft warning header
- [ ] Test: logout clears cookie and Redis key
- [ ] Test: rate limiting returns 429 on 11th attempt
- [ ] Test: audit events contain hashed identifiers (no raw PII)

### 10. Documentation
- [ ] Document session lifecycle (create, refresh, expire, logout)
- [ ] Document rate limiting thresholds and response format
- [ ] Document audit log event schema

---

## Dependencies
- **Blocked by**: STORY-056 (backend auth foundation), STORY-057 (cookie-based auth + registration)
- **Blocks**: STORY-061 (integration testing)

## Parallelism
- Can run in parallel with STORY-059 (Child Auth Adaptation) — different domains (parent session vs. child auth)
- Coordinate with TechLead for shared Redis session patterns and rate limiter configuration
