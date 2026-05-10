# STORY-001: COPPA-Compliant Parent-Child Onboarding

**Epic**: EPIC-010
**Persona**: Mãe da Julia — The Caring Parent
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: None

## User Story
As a caring parent, I want to create a safe account for my child using my verified email, so that I can trust the platform with my child's data and creativity.

## Acceptance Criteria
1. **GIVEN** a parent is on the registration screen, **WHEN** they enter their email and the child's first name and submit, **THEN** a verification email is sent to the parent with a confirmation link.
2. **GIVEN** a parent receives the verification email, **WHEN** they click the confirmation link, **THEN** the child account is activated and linked to the parent email.
3. **GIVEN** a parent enters a malformed or invalid email address, **WHEN** they submit the form, **THEN** a friendly, non-technical error message is displayed (e.g., "Please check the email address").
4. **GIVEN** a parent does not confirm the email within 72 hours, **WHEN** the child tries to log in, **THEN** the account remains inactive and prompts for re-verification.
5. **GIVEN** the child account is activated, **WHEN** the child first logs in, **THEN** a simple, welcoming onboarding screen is shown (no data collection beyond first name).

## Related NFRs
- **NFR-PRV-01**: Parental consent obtained via verified email before account activation (COPPA).
- **NFR-PRV-03**: Only first name and parent email collected; no geolocation or behavioral profiling.
- **NFR-SEC-01**: All onboarding data transmitted over TLS 1.2+.
- **NFR-SEC-04**: Input validation and sanitization on email and name fields to prevent injection.
- **NFR-ACC-01**: Onboarding flow meets WCAG 2.1 AA (keyboard navigable, screen reader labels).
- **NFR-ACC-07**: Onboarding UI available in Portuguese (primary) and English.

## Technical Notes
- Use a secure token-based email verification (magic link with expiring JWT).
- Store parent email and child first name in `users` table with `role` enum (`child`, `parent`).
- Parent record is implicitly created on first verification; no separate parent registration flow in MVP.
- Rate-limit registration endpoint to 5 attempts per IP per hour (NFR-SEC-06).
- Child-friendly UI: large buttons, friendly illustrations, no password complexity jargon.

## QA Notes
- Test on mobile (iOS Safari, Android Chrome), tablet, and desktop.
- Verify email deliverability and link expiry logic.
- Test keyboard-only navigation through entire onboarding flow.
- Validate screen reader announcements for error states and success states.
- Ensure no PII is logged in application logs (NFR-OBS-04: hashed user IDs only).
