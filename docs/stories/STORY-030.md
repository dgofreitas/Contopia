# STORY-030: Paginated Reading Mode

**Epic**: EPIC-002
**Persona": Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies": STORY-029

## User Story
As a young author, I want to read my book one page at a time with tap or swipe navigation, so that it feels like turning the pages of a real book.

## Acceptance Criteria
1. **GIVEN** Julia is in the reader, **WHEN** she taps the right side of the screen (or presses Right Arrow), **THEN** the next page is displayed with a smooth page-turn animation.
2. **GIVEN** Julia is in the reader, **WHEN** she taps the left side of the screen (or presses Left Arrow), **THEN** the previous page is displayed with the reverse animation.
3. **GIVEN** a page-turn animation is playing, **WHEN** measured on a mid-range mobile device, **THEN** it maintains a minimum of 60fps (NFR-PERF-04).
4. **GIVEN** `prefers-reduced-motion` is enabled, **WHEN** Julia navigates pages, **THEN** pages switch instantly with no animation.
5. **GIVEN** Julia reaches the end of a chapter, **WHEN** she taps the next page, **THEN** the next chapter begins with a subtle chapter title card or transition.
6. **GIVEN** Julia reaches the last page of the last chapter, **WHEN** she taps next, **THEN** a friendly "The End" screen appears with options to return to shelf or read again.
7. **GIVEN** the page count varies with font size, **WHEN** Julia changes settings, **THEN** the pagination recalculates and her position is preserved proportionally.

## Related NFRs
- **NFR-PERF-02**: First page renders within 1s; subsequent pages immediate.
- **NFR-PERF-04**: Page-turn animation at ≥60fps.
- **NFR-ACC-05**: Respects `prefers-reduced-motion`.
- **NFR-ACC-01**: WCAG 2.1 AA — tap zones are focusable/keyboard navigable.
- **NFR-ACC-03**: Screen reader announces page changes.
- **NFR-ACC-04**: Text contrast maintained across all themes.

## Technical Notes
- Pagination algorithm: calculate page breaks based on viewport dimensions, font metrics, and line height. Use a virtual rendering approach (e.g., render only current + adjacent pages).
- Page-turn animation: CSS transforms or simple opacity fade (performance preferred over realism).
- Avoid the complex "curl" animation in MVP; use a simple slide or fade.
- Calculate total pages dynamically; update progress bar and chapter boundaries.
- Store current page index + chapter offset in reading progress (STORY-033).
- Handle edge cases: very short chapters (<1 page), very long chapters, empty chapters.
- Tap zones:
  - Left 30% = previous page
  - Right 30% = next page
  - Center 40% = toggle toolbar
- Keyboard: ArrowRight/Space = next, ArrowLeft = previous, Home = chapter start, End = chapter end.

## QA Notes
- Test page-turn animation frame rate on mid-range devices (Chrome DevTools Performance).
- Test with `prefers-reduced-motion`.
- Test tapping all zones (left, center, right) and verify correct actions.
- Test keyboard-only reading flow for full chapter.
- Test screen reader: verify "page X of Y" or "next page" announcements.
- Test font size changes mid-chapter and verify position preservation.
- Test empty chapter and last-chapter end-of-book transitions.
