# STORY-034: Chapter Navigation

**Epic**: EPIC-002
**Persona": Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies": STORY-029, STORY-033

## User Story
As a young author, I want to jump to any chapter in my book quickly, so that I can re-read my favorite parts or skip ahead without flipping through every page.

## Acceptance Criteria
1. **GIVEN** Julia is in the reader, **WHEN** she opens the chapter navigation panel (from toolbar or gesture), **THEN** she sees a list of all chapters with their titles and a checkmark or progress indicator for chapters she has read.
2. **GIVEN** Julia taps a chapter in the navigation list, **WHEN** selected, **THEN** the reader jumps directly to the first page of that chapter with a smooth transition.
3. **GIVEN** Julia is at the beginning of a chapter, **WHEN** she taps "Next Chapter" (if available in toolbar), **THEN** the reader advances to the next chapter's first page.
4. **GIVEN** the chapter list is open, **WHEN** viewed with a screen reader, **THEN** each chapter is announced with its title and reading status (e.g., "Chapter 2: The Forest, unread").
5. **GIVEN** Julia has a book with only one chapter, **WHEN** she opens the chapter list, **THEN** it shows the single chapter and does not display "Next Chapter" navigation.

## Related NFRs
- **NFR-ACC-01**: WCAG 2.1 AA — chapter list is keyboard navigable.
- **NFR-ACC-03**: Screen reader announces chapter names and status.
- **NFR-ACC-04**: Chapter list text contrast meets 4.5:1.
- **NFR-PERF-02**: Chapter jump renders within 1s.
- **NFR-ACC-05**: Transition respects `prefers-reduced-motion`.

## Technical Notes
- Chapter list is a drawer/sidebar (left on tablet/desktop, bottom sheet on mobile).
- Populate list from book metadata (chapters already fetched when reader opens).
- Reading status per chapter: derive from `reading_progress` — if progress position is past chapter start, mark as "read" or "in progress."
- Tap a chapter: calculate target page (paginated) or scroll offset (scroll mode) and navigate there.
- Keyboard: `g` key or `Ctrl+Shift+C` opens chapter list (optional shortcut).
- Close chapter list on backdrop tap or Escape key.
- Do NOT show chapter list if book has only 1 chapter (hide/disabled state).

## QA Notes
- Test chapter navigation with books containing 1, 5, and 20 chapters.
- Test keyboard-only chapter list: open, arrow down, enter to select.
- Test screen reader: chapter titles and status announced.
- Test "Next Chapter" button appears only when there is a next chapter.
- Verify chapter jump speed (<1s).
- Test with `prefers-reduced-motion`.
- Test closing chapter list via Escape, backdrop tap, and back button.
