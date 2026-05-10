# STORY-012: Cover Overlay View

**Epic**: EPIC-001
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-011

## User Story
As a young author, I want to see the full cover of my book after pulling it out, so that I can admire my design and decide what to do next.

## Acceptance Criteria
1. **GIVEN** a book is in the pulled-out state, **WHEN** Julia taps the book again (or taps "View Cover"), **THEN** a full cover overlay/modal appears showing the cover image, title, author name, and optional summary.
2. **GIVEN** the cover overlay is open, **WHEN** Julia taps "Read Book," **THEN** the reader opens (STORY-023) and the overlay closes gracefully.
3. **GIVEN** the cover overlay is open, **WHEN** Julia taps "Close" or the backdrop, **THEN** the overlay fades out and the book returns to the pulled-out state.
4. **GIVEN** a screen reader is active, **WHEN** the overlay opens, **THEN** focus is trapped inside the modal and the cover title is announced as the modal heading.
5. **GIVEN** the overlay is displayed, **WHEN** the book has no custom cover, **THEN** a default cover (title on a pleasant background) is shown.

## Related NFRs
- **NFR-PERF-01**: Cover image loads within the 500ms shelf render budget; lazy-load if needed.
- **NFR-ACC-01**: WCAG 2.1 AA — modal is keyboard navigable, focus trapped, close on Escape.
- **NFR-ACC-03**: Screen reader announces modal title and status.
- **NFR-ACC-04**: Cover text contrast meets 4.5:1.
- **NFR-SEC-04**: Cover image URLs sanitized to prevent XSS.

## Technical Notes
- Use a modal/overlay component with `aria-modal="true"`, `role="dialog"`, and focus trap.
- Cover image should be loaded from the asset CDN (STORY-006) with a lazy-loading strategy (`loading="lazy"` or Intersection Observer).
- Implement backdrop click and Escape key handlers for closing the modal.
- Transition: fade-in overlay (150ms) + scale-up cover (200ms); respect `prefers-reduced-motion`.
- The overlay should cover the shelf view without scrolling the underlying page (`overflow: hidden` on body).

## QA Notes
- Test modal focus trap: Tab cycles within the modal; Shift+Tab cycles backward; Escape closes.
- Test with screen reader: overlay open/close announcements.
- Verify lazy-loading: cover image loads only when modal is opened.
- Test default cover display for books without custom covers.
- Run Lighthouse on the shelf page and confirm accessibility score ≥ 90.
