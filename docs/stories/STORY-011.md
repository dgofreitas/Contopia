# STORY-011: Tap-to-Pull Animation

**Epic**: EPIC-001
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-009

## User Story
As a young author, I want to tap a book spine and see it slide forward smoothly, so that taking a book off the shelf feels magical and real.

## Acceptance Criteria
1. **GIVEN** Julia sees her bookshelf, **WHEN** she taps a book spine, **THEN** the book animates forward/outward from the shelf with a smooth slide-and-scale effect within 300ms.
2. **GIVEN** the pull-out animation is playing, **WHEN** it completes, **THEN** the book is displayed in a "pulled out" state where its cover summary and action buttons (Read, Edit, Design Cover) are visible.
3. **GIVEN** the user has enabled `prefers-reduced-motion`, **WHEN** they tap a spine, **THEN** the book appears instantly in the pulled-out state without animation (NFR-ACC-05).
4. **GIVEN** the animation is running, **WHEN** measured on a mid-range mobile device, **THEN** it maintains a minimum of 60fps throughout (NFR-PERF-04).
5. **GIVEN** Julia taps a different spine while one book is already pulled out, **WHEN** the new tap occurs, **THEN** the current book slides back and the newly tapped book pulls out.

## Related NFRs
- **NFR-PERF-04**: Animations run at ≥60fps on target devices.
- **NFR-ACC-05**: Respects `prefers-reduced-motion`; instant transition as fallback.
- **NFR-ACC-01**: WCAG 2.1 AA — pulled-out state is keyboard navigable and focus is managed.
- **NFR-SEC-04**: No JavaScript injection via animation parameters.

## Technical Notes
- Implement using CSS transforms (`translateX`, `translateY`, `scale`) with `will-change: transform` for GPU acceleration.
- Avoid animating layout properties (width, height, margin) to prevent reflows.
- Use FLIP technique (First, Last, Invert, Play) if complex layout transitions are needed.
- The pulled-out book should have a higher `z-index` and subtle shadow to create depth.
- Manage focus: when a book is pulled out, move focus to the pulled-out container for accessibility.
- Animation duration: 250–350ms with an ease-out curve (e.g., `cubic-bezier(0.25, 0.1, 0.25, 1)`).

## QA Notes
- Record frames during animation on Chrome DevTools; verify 60fps on mid-range Android.
- Test with `prefers-reduced-motion: reduce` enabled in OS settings.
- Verify keyboard users can Tab to a spine, press Enter to pull out, and then Tab through summary actions.
- Test rapid tapping between multiple spines — no visual glitches or overlapping states.
- Verify on iOS Safari, Android Chrome, and desktop browsers.
