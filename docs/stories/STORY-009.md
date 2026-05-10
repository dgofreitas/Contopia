# STORY-009: Bookshelf Grid Rendering

**Epic**: EPIC-001
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-004, STORY-005

## User Story
As a young author, I want to see my books arranged as colorful spines on a shelf, so that my library feels like a real, personal bookcase.

## Acceptance Criteria
1. **GIVEN** Julia has published books, **WHEN** she opens the app, **THEN** the bookshelf renders all visible book spines within 500ms on a mid-range mobile device (NFR-PERF-01).
2. **GIVEN** a book on the shelf, **WHEN** it is rendered, **THEN** its spine displays the book's title (truncated if too long) and its cover/spine color.
3. **GIVEN** books with varying spine widths, **WHEN** they are displayed, **THEN** the shelf grid accommodates them without breaking the layout or causing overflow.
4. **GIVEN** Julia has no published books, **WHEN** the shelf loads, **THEN** the empty state is shown instead (see STORY-010).
5. **GIVEN** books are loading from the server, **WHEN** the shelf is first rendered, **THEN** a friendly skeleton or loading placeholder is shown with a playful animation.
6. **GIVEN** a screen reader is active, **WHEN** the shelf is rendered, **THEN** each spine has an `aria-label` reading the book title and role `button`, and the shelf container has a meaningful landmark.

## Related NFRs
- **NFR-PERF-01**: Shelf render <500ms for up to 50 books on mid-range mobile.
- **NFR-ACC-01**: WCAG 2.1 AA — shelf navigable via keyboard and screen reader.
- **NFR-ACC-03**: Screen reader support with meaningful labels and roles.
- **NFR-ACC-04**: Text contrast on spines meets 4.5:1 minimum.
- **NFR-SEC-04**: Book metadata sanitized before rendering to prevent XSS.

## Technical Notes
- Use CSS Grid or Flexbox for the shelf rows; each row is a "shelf" visual element.
- Spines are DOM elements (divs) styled with CSS: background color from book metadata, vertical text layout.
- Render up to 50 books initially; virtualize or lazy-load if user library grows beyond MVP scope.
- Fallback: if a book has no custom spine color, assign a random pleasant color from a curated palette.
- Fetch `/api/books` on app load; cache response in memory for the session.
- Keep DOM node count reasonable to maintain 60fps scrolling (NFR-PERF-04).

## QA Notes
- Test shelf render speed on a 2019 mid-range Android phone with 50 books; measure with Chrome DevTools Performance tab.
- Verify keyboard navigation: Tab moves between spines, Enter activates.
- Test with screen reader (VoiceOver/TalkBack) — confirm each spine is announced.
- Check color contrast of white/black text against various spine colors.
- Test with 0, 1, 10, 50 books and verify no layout breakage.
