# STORY-002: Child Authentication & Session Management

**Epic**: EPIC-010
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-001

## User Story
As a young author, I want to log in to my bookshelf easily and securely, so that I can access my books without remembering a complicated password.

## Acceptance Criteria
1. **GIVEN** Julia has an activated account, **WHEN** she opens the app, **THEN** she can log in using a simple password or a magic link sent to her parent's email.
2. **GIVEN** Julia is logged in, **WHEN** she is inactive for 30 minutes, **THEN** her session expires and she is prompted to log in again before saving or reading.
3. **GIVEN** Julia is logged in, **WHEN** she taps "Logout" from the settings menu, **THEN** her session is immediately terminated and she is returned to the login screen.
4. **GIVEN** an unauthenticated user tries to access a protected route (e.g., `/shelf`), **WHEN** the page loads, **THEN** they are redirected to the login screen with a friendly message.
5. **GIVEN** Julia's session times out while she is writing, **WHEN** she tries to save, **THEN** she sees a modal prompting her to log in again, with her draft safely preserved in local state.

## Related NFRs
- **NFR-SEC-03**: Sessions expire after 30 minutes of inactivity; re-authentication for destructive actions.
- **NFR-SEC-01**: All authentication endpoints use TLS 1.2+.
- **NFR-SEC-04**: Input validation on password/login fields.
- **NFR-SEC-06**: Rate limiting on login attempts (e.g., 5 failed attempts per 15 minutes per IP).
- **NFR-ACC-01**: Login screen meets WCAG 2.1 AA.
- **NFR-ACC-02**: All interactive elements operable via keyboard.

## Technical Notes
- JWT or secure httpOnly cookie-based sessions; httponly + secure + samesite=strict flags.
- Provide both password and passwordless (magic link to parent email) options.
- Store session metadata (created_at, last_activity, device_hint) for audit logs.
- Implement a silent refresh token mechanism if needed, but keep session max lifetime at 30 minutes idle.
- Design login UI with large touch targets, minimal text, and friendly mascot/illustration.

## QA Notes
- Test session timeout boundary (exactly 30 min of inactivity).
- Verify secure cookie attributes in browser DevTools.
- Test brute-force protection (rate limiting) via automated rapid login attempts.
- Validate keyboard-only login flow (Tab, Enter, Escape).
- Test on shared family tablets where multiple children might use the same device (no data leakage between sessions).
