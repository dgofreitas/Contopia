# STORY-021: Edit Existing Book

**Epic**: EPIC-003
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-017, STORY-020

## User Story
As a young author, I want to reopen and edit a book I've already written, so that I can fix mistakes, add new chapters, or improve my story.

## Acceptance Criteria
1. **GIVEN** Julia sees her bookshelf, **WHEN** she pulls out a book and selects "Edit" (or long-presses a book spine on mobile), **THEN** the writing interface opens with all chapters and content loaded.
2. **GIVEN** Julia is editing a published book, **WHEN** she saves changes, **THEN** the book remains in `published` status and the updated content is reflected in the reader immediately.
3. **GIVEN** Julia is editing a published book, **WHEN** she makes significant changes, **THEN** she is gently reminded that the book is already on her shelf and readers will see the updates.
4. **GIVEN** Julia is editing a draft book, **WHEN** she returns to her drafts list, **THEN** the draft shows the latest saved content and last-edited timestamp.
5. **GIVEN** a screen reader is active, **WHEN** Julia activates "Edit" from the shelf, **THEN** the transition to the editor is announced and focus lands on the first chapter title.

## Related NFRs
- **NFR-PERF-05**: Book/chapter load for editing P95 <500ms.
- **NFR-ACC-01**: WCAG 2.1 AA — edit action is keyboard accessible.
- **NFR-ACC-03**: Screen reader announces editor open state.
- **NFR-ACC-04**: Edit UI contrast meets 4.5:1.
- **NFR-SEC-04**: Ownership validation — only the author can edit their own book.

## Technical Notes
- Edit entry point: from pulled-out book (STORY-011) via "Edit" button, or from a "My Drafts" list screen.
- API: `GET /api/books/:id/edit` returns full book with chapters and content in edit-ready format.
- Published books: updates should invalidate reader cache (if any) so the next read reflects changes.
- Drafts list: `GET /api/books?status=draft` returns drafts with `updated_at` and word count.
- "My Drafts" list is accessible from a menu or FAB on the shelf (UI decision with UX).
- If editing a published book, show a subtle badge: "On your shelf — changes are live."
- Ensure chapter order and content are correctly hydrated into the editor state.

## QA Notes
- Test opening a published book for editing and verify all chapters load correctly.
- Make an edit, save, then open the reader to confirm the change appears.
- Verify "My Drafts" list shows only `draft` status books.
- Test editing from the shelf (tap spine → pull out → Edit) and from the drafts list.
- Test unauthorized access: User B's `GET /api/books/:id/edit` returns 403.
- Test keyboard-only edit flow: Tab to "Edit" button → Enter → focus in editor.
- Screen reader test: verify editor open announcement and chapter navigation.
