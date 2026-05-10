# STORY-008: API Error Handling & Child-Friendly Messages

**Epic**: EPIC-010
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-005

## User Story
As a young author, I want to see friendly, understandable messages when something goes wrong, so that I don't get scared or confused by technical errors.

## Acceptance Criteria
1. **GIVEN** any API error (4xx or 5xx), **WHEN** the client receives the response, **THEN** the UI displays a child-friendly message (e.g., "Oops! Something went wrong. Try again?") instead of technical details.
2. **GIVEN** a network timeout or server unreachable, **WHEN** Julia is using the app, **THEN** a friendly offline/retry message is shown with a "Try Again" button.
3. **GIVEN** a validation error (e.g., empty book title), **WHEN** the server responds, **THEN** the client shows a clear, encouraging message (e.g., "Your book needs a title — what will you call it?").
4. **GIVEN** a child-friendly error message is displayed, **WHEN** a screen reader is active, **THEN** the error is announced with appropriate `role="alert"` or `aria-live` attributes.
5. **GIVEN** multiple rapid errors occur, **WHEN** displayed in succession, **THEN** they are debounced to avoid overwhelming the child with repeated pop-ups.

## Related NFRs
- **NFR-ACC-01**: WCAG 2.1 AA — error messages readable and announced.
- **NFR-ACC-03**: Screen reader support for error states.
- **NFR-ACC-07**: Error messages localized in Portuguese and English.
- **NFR-SEC-04**: Technical error details (stack traces, SQL) never exposed to client.
- **NFR-AVL-04**: Graceful degradation with friendly offline messages.
- **NFR-OBS-01**: Unhandled exceptions captured in error tracking with user impact context.

## Technical Notes
- Implement a global HTTP interceptor/middleware on the client that maps HTTP status codes to localized, child-friendly strings.
- Maintain an error dictionary: `{ "VALIDATION_ERROR": "Your book needs a title...", "NETWORK_ERROR": "No internet. Your story is safe! Try again." }`.
- Log full technical details server-side (request ID, stack trace) and expose only a `trace_id` to the client for support reference.
- Use a non-blocking toast/modal design for errors (not browser `alert()`).
- Ensure error UI is consistent with the playful visual style (soft colors, friendly icon).

## QA Notes
- Trigger each error type (400, 401, 403, 404, 429, 500, 503, network offline) and verify UI message.
- Test screen reader announcement of error messages on iOS VoiceOver and Android TalkBack.
- Verify no stack traces or SQL appear in browser console or network response bodies.
- Test rapid-fire offline/online toggling to confirm debouncing works.
- Validate Portuguese and English translations for all error strings.
