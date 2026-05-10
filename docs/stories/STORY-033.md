# STORY-033: Reading Progress Tracking

**Epic**: EPIC-002
**Persona": Julia — The Young Author
**Priority**: Must Have
**Story Points": 3
**Dependencies": STORY-029, STORY-030

## User Story
As a young author, I want the app to remember where I stopped reading, so that I can pick up my book exactly where I left off every time.

## Acceptance Criteria
1. **GIVEN** Julia is reading a book, **WHEN** she turns a page or scrolls, **THEN** her progress is saved automatically every 10 seconds or on every page turn.
2. **GIVEN** Julia has read 20 pages of a book, **WHEN** she opens the book again later, **THEN** the reader automatically opens at page 21 (or equivalent scroll position).
3. **GIVEN** Julia finishes a book, **WHEN** she reaches the last page, **THEN** the progress is stored as "finished" and the "The End" screen offers to restart from the beginning.
4. **GIVEN** the progress is saved, **WHEN** Julia looks at the bookshelf, **THEN** a subtle progress indicator (e.g., a small bar or percentage) is visible on the book spine or cover overlay.
5. **GIVEN** the network is unavailable, **WHEN** progress is saved, **THEN** it is stored locally and synced to the server when the connection returns.

## Related NFRs
- **NFR-PERF-05**: Progress save API responds in P95 <500ms.
- **NFR-PERF-06**: Local save within 100ms.
- **NFR-ACC-03**: Screen reader announces reading position on book open.
- **NFR-ACC-01**: WCAG 2.1 AA — progress indicators have accessible labels.
- **NFR-AVL-04**: Graceful degradation with local save when offline.
- **NFR-SEC-04**: Progress data validated on save.

## Technical Notes
- Progress model: `reading_progress` table with `user_id`, `book_id`, `chapter_id`, `position` (page number or scroll offset), `percentage`, `finished` boolean, `updated_at`.
- Save strategy: debounced save to server (every 10s or significant position change) + immediate local save.
- Local storage key: `progress:{book_id}` with chapter, position, percentage.
- On app load, merge local progress with server progress; use whichever is more recent (timestamp-based).
- On book open: `GET /api/books/:id/progress` returns last position; client navigates there.
- Shelf spine indicator: overlay a small progress bar (e.g., 10% height at bottom of spine) or show percentage on cover overlay.
- Finished state: when `percentage >= 99%`, set `finished = true`; offer restart.

## QA Notes
- Test progress save during reading: simulate page turns and verify server receives updates.
- Close and reopen book; verify position is restored correctly in both paginated and scroll modes.
- Test offline: disconnect, read, reconnect, verify sync.
- Test finished book flow: verify "The End" and restart option.
- Test shelf progress indicator for 0%, 25%, 50%, 75%, 100%.
- Verify progress is user-scoped (User B cannot see User A's progress).
- Screen reader: verify "Resuming Chapter 3, page 12" announcement on book open.
