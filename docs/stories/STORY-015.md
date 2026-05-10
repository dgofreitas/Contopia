# STORY-015: Default Sorting & Book Placement

**Epic**: EPIC-001
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-009

## User Story
As a young author, I want my newest books to appear at the front of my shelf automatically, so that I always see my latest creations first.

## Acceptance Criteria
1. **GIVEN** Julia has multiple published books, **WHEN** the shelf loads, **THEN** books are sorted by "newest first" (published_at descending) by default.
2. **GIVEN** a new book is published, **WHEN** the shelf updates, **THEN** the new book appears at the leftmost (or top-left) position of the first shelf row.
3. **GIVEN** the default sort is applied, **WHEN** displayed, **THEN** there is no visible "sort" UI control in MVP (sorting UI deferred to EPIC-006).
4. **GIVEN** a book's `published_at` timestamp is updated, **WHEN** the shelf refreshes, **THEN** the book repositions according to its new timestamp.
5. **GIVEN** the sort state, **WHEN** accessed via API, **THEN** the server returns books in the correct order, and the client does not re-sort locally.

## Related NFRs
- **NFR-PERF-05**: API returns sorted book list in P95 <500ms.
- **NFR-ACC-01**: WCAG 2.1 AA — sort changes announced to screen readers (future-proof).
- **NFR-SEC-04**: Sort parameter sanitized to prevent injection.

## Technical Notes
- Default query: `SELECT * FROM books WHERE user_id = ? AND status = 'published' ORDER BY published_at DESC`.
- Index: add composite index on `(user_id, status, published_at DESC)` for query performance.
- Shelf placement: books populate a row left-to-right, then wrap to next row. Order in the array = order on screen.
- Do not implement client-side sorting for MVP; server returns correctly ordered data.
- When a book is newly published, invalidate the shelf cache and re-fetch `/api/books`.

## QA Notes
- Verify API response order matches newest-first expectation.
- Publish a book and confirm it appears at the front of the shelf.
- Test with books published on the same timestamp (millisecond precision); stable fallback sort by `id DESC`.
- Check query execution time with `EXPLAIN ANALYZE` for a user with 50 books.
- Verify no UI control for sorting exists in MVP (prevents premature feature exposure).
