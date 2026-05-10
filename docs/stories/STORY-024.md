# STORY-024: Sticker Placement & Text on Cover

**Epic**: EPIC-004
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-023

## User Story
As a young author, I want to add stickers, my book title, and my name to the cover, so that my book looks fun and professional at the same time.

## Acceptance Criteria
1. **GIVEN** Julia is customizing her cover, **WHEN** she opens the sticker menu, **THEN** she sees a library of 20–30 simple, inclusive vector illustrations (e.g., stars, animals, flowers, hearts) that she can tap to place on the cover.
2. **GIVEN** Julia taps a sticker, **WHEN** placed on the cover preview, **THEN** it appears at the center and she can drag (or use arrow buttons) to reposition it.
3. **GIVEN** Julia has placed a sticker, **WHEN** she double-taps or selects "Remove," **THEN** the sticker is removed from the cover.
4. **GIVEN** the cover preview, **WHEN** viewed, **THEN** the book title and author name are displayed with a font that is readable for children and scales to fit the cover width.
5. **GIVEN** Julia wants to change the title text, **WHEN** she taps the title on the cover, **THEN** it becomes an editable text input with a maximum length of 120 characters.
6. **GIVEN** a screen reader is active, **WHEN** Julia navigates stickers, **THEN** each sticker has an accessible name (e.g., "Star sticker") and the cover text is announced.

## Related NFRs
- **NFR-PERF-04**: Sticker add/remove/reposition updates <200ms on mobile.
- **NFR-ACC-01**: WCAG 2.1 AA — stickers operable via keyboard (arrow keys to move, Enter to place, Delete to remove).
- **NFR-ACC-03**: Screen reader announces sticker names and cover text.
- **NFR-ACC-04**: Sticker colors and text contrast meet 4.5:1.
- **NFR-SEC-04**: Title text sanitized on input; no HTML/script injection.

## Technical Notes
- Stickers are inline SVGs stored in the client bundle; no external font/icon libraries loaded dynamically.
- Sticker positioning: absolute positioning within a relative cover container; store normalized coordinates (x%, y%) relative to cover dimensions.
- Mobile drag: use touch events (`touchstart`, `touchmove`) with passive listeners for performance.
- Keyboard controls for stickers: Tab to select, Arrow keys to nudge, Enter to place, Delete/Backspace to remove.
- Text rendering: auto-scale font size based on title length to fit within cover bounds; max 2 lines with ellipsis.
- Font choice: a friendly, readable sans-serif (e.g., Nunito, Fira Sans, or Comic Neue) preloaded in the app.
- Sticker library should be culturally inclusive and neutral.

## QA Notes
- Place multiple stickers (up to 10) and verify performance remains smooth.
- Test drag-and-drop on touch devices and mouse on desktop.
- Test keyboard-only sticker placement and removal.
- Verify title text scales correctly with very short (1 char) and very long (120 char) titles.
- Paste XSS payload into title field → verify sanitization.
- Test with screen reader: sticker names announced, text editable state announced.
- Test `prefers-reduced-motion` behavior.
