# STORY-013: Place-Back Animation

**Epic**: EPIC-001
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-011

## User Story
As a young author, I want my book to slide smoothly back onto the shelf when I'm done looking at it, so that the experience feels complete and satisfying.

## Acceptance Criteria
1. **GIVEN** a book is in the pulled-out state, **WHEN** Julia taps "Place Back" or outside the book area, **THEN** the book animates back to its original position on the shelf within 300ms.
2. **GIVEN** the place-back animation is playing, **WHEN** measured on a mid-range mobile device, **THEN** it maintains a minimum of 60fps (NFR-PERF-04).
3. **GIVEN** `prefers-reduced-motion` is enabled, **WHEN** Julia triggers place-back, **THEN** the book instantly returns to its shelf position without animation (NFR-ACC-05).
4. **GIVEN** the cover overlay (STORY-012) is open, **WHEN** Julia closes the overlay, **THEN** the book remains in the pulled-out state; a second place-back action returns it to the shelf.
5. **GIVEN** the place-back animation completes, **WHEN** focus management occurs, **THEN** keyboard focus returns to the spine element on the shelf.

## Related NFRs
- **NFR-PERF-04**: Animations run at ≥60fps on target devices.
- **NFR-ACC-05**: Respects `prefers-reduced-motion`.
- **NFR-ACC-01**: WCAG 2.1 AA — focus returns to the triggering element after animation.
- **NFR-ACC-02**: Keyboard operability (Escape or Enter on "Place Back" button).

## Technical Notes
- Mirror the pull-out animation in reverse (same duration, same easing, opposite transform).
- Ensure the book's `z-index` resets after animation to prevent stacking context issues.
- Use CSS transitions rather than JavaScript-driven animation for smooth GPU compositing.
- On animation end, trigger a focus reset to the spine element for accessibility.
- Consider a subtle shelf-shadow animation (darken the shelf row briefly) for added realism.
- If the overlay is closed, do not auto-trigger place-back; the pulled-out state is a legitimate intermediate state.

## QA Notes
- Verify animation frames at 60fps on target devices.
- Test `prefers-reduced-motion: reduce` behavior.
- Test keyboard flow: Tab to "Place Back" button → Enter → focus returns to spine.
- Test rapid pull-out/place-back cycles (5+ in a row) — no animation stacking or visual glitches.
- Verify that closing the cover overlay does not place the book back unexpectedly.
