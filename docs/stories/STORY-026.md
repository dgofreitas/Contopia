# STORY-026: Edge Design

**Epic**: EPIC-004
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-025

## User Story
As a young author, I want to optionally decorate the edge of my book, so that when I pull it out from the shelf, there is a fun surprise detail visible.

## Acceptance Criteria
1. **GIVEN** Julia is in the designer, **WHEN** she opens the "Edge" customization panel, **THEN** she sees a few simple options: solid color (default), gradient, or a small pattern (e.g., marbling, dots).
2. **GIVEN** Julia selects an edge option, **WHEN** applied, **THEN** the edge preview updates instantly and is visible in the "pulled-out" book preview.
3. **GIVEN** the edge, **WHEN** the book is on the shelf, **THEN** it is hidden; it only appears when the book is pulled out (as part of the pull-out animation).
4. **GIVEN** Julia does not customize the edge, **WHEN** the book is pulled out, **THEN** a simple solid color matching the spine is shown by default.
5. **GIVEN** the edge preview, **WHEN** viewed with a screen reader, **THEN** it is announced as a decorative detail, not a required field.

## Related NFRs
- **NFR-PERF-04**: Edge preview updates <200ms on mobile.
- **NFR-ACC-01**: WCAG 2.1 AA — edge panel keyboard navigable.
- **NFR-ACC-03**: Screen reader describes edge options.
- **NFR-ACC-05**: Respects `prefers-reduced-motion`.

## Technical Notes
- Edge is a decorative CSS layer rendered on the "side" of the book in the pull-out animation (e.g., a thin strip on the right side of the pulled-out book).
- Edge options: same color/pattern system as cover/spine but with fewer choices (5 edge-specific styles).
- Edge state stored in database: `edge_color`, `edge_pattern`.
- In shelf view (book not pulled out), the edge is occluded; no DOM rendering needed.
- Consider the edge as part of the asset pipeline: generate a small rectangular image or render with CSS.

## QA Notes
- Test all edge options and verify they appear correctly in the pull-out preview.
- Verify edge is not visible on the shelf when book is not pulled out.
- Test with `prefers-reduced-motion`.
- Test keyboard navigation in edge panel.
- Screen reader test: verify edge is described as "decorative book edge."
