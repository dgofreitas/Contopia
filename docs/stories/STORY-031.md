# STORY-031: Continuous Scroll Reading Mode

**Epic**: EPIC-002
**Persona": Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies": STORY-029

## User Story
As a young author, I want to scroll through my book continuously like a long story, so that I can read without thinking about page turns.

## Acceptance Criteria
1. **GIVEN** Julia opens the reader settings, **WHEN** she selects "Scroll Mode," **THEN** the reader switches from paginated to continuous scroll with a smooth transition.
2. **GIVEN** Julia is in scroll mode, **WHEN** she scrolls down, **THEN** chapters flow continuously with clear chapter title breaks and no gaps.
3. **GIVEN** Julia scrolls through the book, **WHEN** she pauses, **THEN** the progress bar and current chapter indicator update in real time to show her position.
4. **GIVEN** Julia switches from paginated to scroll mode (or vice versa), **WHEN** the mode changes, **THEN** her approximate reading position is preserved (same chapter, near same text).
5. **GIVEN** Julia reaches the end of the book in scroll mode, **WHEN** she scrolls past the last paragraph, **THEN** the friendly "The End" screen appears.

## Related NFRs
- **NFR-PERF-02**: Content renders within 1s; smooth scroll at 60fps.
- **NFR-ACC-01**: WCAG 2.1 AA — scrollable region is keyboard navigable.
- **NFR-ACC-05**: Mode switch transition respects `prefers-reduced-motion`.
- **NFR-ACC-06**: System font scaling respected.

## Technical Notes
- Scroll mode renders all chapter content in a single scrollable container.
- Use virtual scrolling (e.g., `react-window`, `IntersectionObserver` chunked rendering) if total content exceeds 50,000 words to maintain performance.
- Chapter boundaries: render a chapter title element with `id` for anchor-based navigation from chapter list.
- Scroll position tracking: update progress on scroll events (debounced) or via `IntersectionObserver` on chapter markers.
- Mode toggle stored in user preferences (STORY-032).
- Preserve position: store scroll offset or calculate approximate page from scroll position when switching modes.

## QA Notes
- Test scroll mode with a 50,000-word book and verify smooth scroll without jank.
- Test switching between paginated and scroll modes mid-chapter; verify position is approximately preserved.
- Test keyboard-only scroll mode: Tab, PageDown, PageUp, Home, End.
- Test with large font size and verify chapter boundaries remain clear.
- Test screen reader: verify chapter title announcements as user scrolls into new chapters.
- Run Lighthouse and verify no CLS during scroll.
