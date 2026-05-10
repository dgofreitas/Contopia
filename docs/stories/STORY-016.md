# STORY-016: Create a New Book

**Epic**: EPIC-003
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-004, STORY-005

## User Story
As a young author, I want to start a new book by giving it a title and an optional summary, so that I can begin writing my story with a clear sense of what it's about.

## Acceptance Criteria
1. **GIVEN** Julia taps "Write My First Book" or "New Book," **WHEN** the creation screen opens, **THEN** she sees a simple form with fields for Title (required) and Summary (optional) and a "Start Writing" button.
2. **GIVEN** Julia enters a title and taps "Start Writing," **WHEN** the form is submitted, **THEN** a new book record is created in `draft` status, and she is taken to the chapter editor.
3. **GIVEN** Julia leaves the title field empty, **WHEN** she tries to submit, **THEN** a friendly validation message appears encouraging her to name her book.
4. **GIVEN** Julia enters a title longer than 120 characters, **WHEN** she tries to submit, **THEN** the input is blocked or a message suggests a shorter title.
5. **GIVEN** the new book is created, **WHEN** the API responds, **THEN** the book appears in her "My Drafts" list, NOT on the main bookshelf (drafts are invisible on the shelf).
6. **GIVEN** a screen reader is active, **WHEN** Julia navigates the creation form, **THEN** all fields and buttons are labeled clearly and focus moves to the title input on open.

## Related NFRs
- **NFR-PERF-05**: API responds in P95 <500ms.
- **NFR-ACC-01**: WCAG 2.1 AA — form is keyboard navigable, labels announced.
- **NFR-ACC-03**: Screen reader support for form fields and errors.
- **NFR-ACC-04**: Text contrast on form meets 4.5:1.
- **NFR-ACC-07**: UI localized in Portuguese and English.
- **NFR-SEC-04**: Input validation and sanitization on title and summary fields.
- **NFR-PRV-03**: Only title and summary stored — no unnecessary data collection.

## Technical Notes
- Creation form is a modal or dedicated screen; keep UI minimal and cheerful.
- API: `POST /api/books` with `{ title, summary? }`; response includes `book_id`, `status: "draft"`.
- Title max length: 120 characters (soft limit with warning at 100).
- Summary max length: 500 characters.
- Summary should be multiline textarea, not a single-line input.
- Auto-focus the title input when the creation screen opens.
- Include a character count indicator (encouraging, not punitive) for title and summary.

## QA Notes
- Test form submission with valid title, empty title, too-long title, and special characters.
- Verify no XSS via title/summary (e.g., `<script>alert(1)</script>` is sanitized).
- Confirm the new book does not appear on the shelf until published.
- Verify API response time <500ms.
- Test keyboard-only navigation through the form and error states.
- Test screen reader announcement of validation messages.
