# STORY-020: Publish Book to Shelf

**Epic**: EPIC-003
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-016, STORY-019

## User Story
As a young author, I want to publish my finished book to my bookshelf, so that I can see it alongside my other books and feel proud of my work.

## Acceptance Criteria
1. **GIVEN** Julia has a draft book with at least one chapter, **WHEN** she taps "Publish to My Shelf," **THEN** a friendly confirmation dialog appears explaining that the book will appear on her shelf.
2. **GIVEN** Julia confirms the publish action, **WHEN** the book status changes to `published`, **THEN** it appears on her main bookshelf (STORY-009) at the front (newest first).
3. **GIVEN** a book is published, **WHEN** Julia views her shelf, **THEN** the book has a default spine and cover if she has not designed a custom one yet (STORY-028).
4. **GIVEN** Julia tries to publish a book with no content, **WHEN** she taps "Publish," **THEN** a gentle message encourages her to write something first.
5. **GIVEN** a book is published with only a default cover, **WHEN** Julia later designs a custom cover, **THEN** the shelf and reader update to show the new cover.
6. **GIVEN** a screen reader is active, **WHEN** publish completes, **THEN** the success is announced (e.g., "Your book is now on your shelf!") and focus moves to the newly published book on the shelf.

## Related NFRs
- **NFR-PERF-05**: Publish API responds in P95 <500ms.
- **NFR-ACC-01**: WCAG 2.1 AA — publish confirmation accessible via keyboard.
- **NFR-ACC-03**: Screen reader announces publish success and focus management.
- **NFR-ACC-04**: Confirmation dialog text contrast meets 4.5:1.
- **NFR-SEC-04**: Status change validated server-side to prevent unauthorized publishing.

## Technical Notes
- API: `POST /api/books/:id/publish` — sets `status` from `draft` to `published`, sets `published_at`.
- Validation: at least one chapter with non-empty content (trim whitespace before checking).
- Publishing is irreversible in MVP (or requires explicit unpublish action if implemented).
- After publish, the client should navigate to the bookshelf and ideally scroll to the newly published book.
- If the book has no custom cover/spine, the shelf uses the default cover generator (title + color) from STORY-028.
- Consider a celebratory micro-animation (confetti or sparkle) upon publish, respecting `prefers-reduced-motion`.
- Update the user's `activity_logs` (aggregated, minimal) for parent dashboard future use.

## QA Notes
- Test publish flow end-to-end: draft → publish → shelf render → reader open.
- Test attempting to publish an empty book (0 chapters or empty content).
- Test double-clicking the "Publish" button — only one publish should occur (idempotency).
- Verify that unpublished drafts remain hidden from the shelf.
- Test with screen reader: publish confirmation, success announcement, focus to shelf.
- Verify no server errors or race conditions when publishing while autosave is in progress.
