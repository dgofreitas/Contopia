# STORY-017: Chapter-Based Writing & CRUD

**Epic**: EPIC-003
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-016

## User Story
As a young author, I want to add, rename, reorder, and delete chapters in my book, so that I can organize my story the way real books are structured.

## Acceptance Criteria
1. **GIVEN** Julia is in the writing interface, **WHEN** she taps "Add Chapter," **THEN** a new empty chapter is created with a default name (e.g., "Chapter 2") and she can immediately start writing in it.
2. **GIVEN** Julia wants to rename a chapter, **WHEN** she taps the chapter title in the sidebar, **THEN** it becomes editable inline, and the new name is saved on blur or Enter.
3. **GIVEN** Julia has multiple chapters, **WHEN** she drags (or uses arrow buttons) to reorder them, **THEN** the chapter order updates immediately and persists after saving.
4. **GIVEN** Julia wants to delete a chapter, **WHEN** she selects "Delete" from the chapter menu, **THEN** a confirmation dialog appears with a friendly warning, and upon confirmation the chapter is removed and order is adjusted.
5. **GIVEN** Julia is writing, **WHEN** she has only one chapter, **THEN** the chapter sidebar may be minimized but the chapter is still editable.
6. **GIVEN** a screen reader is active, **WHEN** Julia interacts with the chapter list, **THEN** each chapter is announced by name and position, and the reorder action has accessible labels.

## Related NFRs
- **NFR-PERF-05**: Chapter CRUD API responds in P95 <500ms.
- **NFR-ACC-01**: WCAG 2.1 AA — chapter list is keyboard navigable.
- **NFR-ACC-03**: Screen reader announces chapter names and order.
- **NFR-ACC-02**: All chapter actions operable via keyboard.
- **NFR-SEC-04**: Chapter names sanitized; no injection via title input.
- **NFR-PRV-03**: Only chapter names and content stored.

## Technical Notes
- Chapter model: `chapters` table with `book_id`, `title`, `content` (rich text), `order_index`, `created_at`, `updated_at`.
- API endpoints: `POST /api/books/:id/chapters`, `PUT /api/chapters/:id`, `DELETE /api/chapters/:id`, `PATCH /api/books/:id/chapters/reorder`.
- Reorder: update `order_index` for all affected chapters in a transaction; client shows optimistic UI update.
- Default first chapter name: "Chapter 1" (or "Capítulo 1" in Portuguese).
- Max chapters per book: 50 (soft limit).
- Chapter sidebar is a collapsible panel on desktop, drawer/bottom sheet on mobile.
- When deleting the last chapter, warn user and allow creating a replacement or exiting the book.

## QA Notes
- Test adding chapters up to 50; verify soft limit warning.
- Test renaming with empty name,超长 name, special characters, XSS payloads.
- Test reordering via drag-and-drop and keyboard (arrow buttons).
- Test deleting a chapter and verify order indexes are updated correctly.
- Verify only the owner of the book can modify its chapters (403 for unauthorized).
- Test with screen reader: chapter list navigation, drag announcements (if available), and delete confirmation.
