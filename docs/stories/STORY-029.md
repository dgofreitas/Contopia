# STORY-029: Reader UI & Fullscreen View

**Epic**: EPIC-002
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies": STORY-012, STORY-020

## User Story
As a young author, I want to open my book in a beautiful, distraction-free fullscreen view, so that I can immerse myself in reading just like a real book.

## Acceptance Criteria
1. **GIVEN** Julia is viewing a book cover overlay, **WHEN** she taps "Read Book," **THEN** the reader opens in fullscreen with a smooth transition, hiding the browser chrome and shelf UI.
2. **GIVEN** the reader is open, **WHEN** it loads, **THEN** it displays the book's title at the top (optional, dismissible), the chapter content in the center, and a subtle progress bar at the bottom.
3. **GIVEN** the reader is open, **WHEN** Julia taps the screen, **THEN** a minimal toolbar appears with: Back to Shelf, Settings (font/theme), and Chapter List.
4. **GIVEN** the toolbar is visible, **WHEN** Julia taps anywhere on the content area, **THEN** the toolbar fades out after 2 seconds of inactivity.
5. **GIVEN** the reader is open on mobile, **WHEN** she swipes down from the top or uses the system back gesture, **THEN** a confirmation appears to prevent accidental exit (optional, or graceful back handling).
6. **GIVEN** a screen reader is active, **WHEN** the reader opens, **THEN** it announces "Reading [Book Title], Chapter [Name]" and the content is navigable paragraph by paragraph.

## Related NFRs
- **NFR-PERF-02**: Reader content renders first page within 1 second for books up to 50,000 words.
- **NFR-ACC-01**: WCAG 2.1 AA — reader focusable, toolbar operable via keyboard.
- **NFR-ACC-03**: Screen reader announces reader state and navigates content.
- **NFR-ACC-04**: Text contrast meets 4.5:1 in all themes.
- **NFR-ACC-05**: Transitions respect `prefers-reduced-motion`.
- **NFR-SEC-07**: No third-party scripts loaded in reader.

## Technical Notes
- Use the Fullscreen API (`requestFullscreen`) if available, or simulate fullscreen with CSS (`position: fixed`, `inset: 0`, `z-index: high`).
- Reader UI: top bar (auto-hide), content area (scrollable or paginated), bottom progress bar.
- Content should be pre-rendered or fetched from `/api/books/:id/content` with chapter data.
- Tap zones: center = toggle toolbar, left edge = previous page (paginated), right edge = next page (paginated).
- Swipe gestures for page navigation on mobile (optional enhancement; tap zones are primary for MVP).
- CSS: `overscroll-behavior: contain` to prevent pull-to-refresh during reading.
- Keyboard: Space/ArrowRight = next page, ArrowLeft = previous, Escape = exit reader.
- Reader should be a route (e.g., `/read/:book_id?chapter=:id`) for direct linking and state management.

## QA Notes
- Test reader open speed: measure from "Read Book" tap to first text visible (<=1s for 50k words).
- Test fullscreen behavior on iOS Safari, Android Chrome, and desktop.
- Test toolbar auto-hide: tap to show, wait 2s, verify fade-out.
- Test keyboard navigation: arrows, space, escape.
- Test screen reader: NVDA/JAWS/VoiceOver content reading.
- Verify no browser pull-to-refresh during reading.
- Test with `prefers-reduced-motion`.
- Run Lighthouse on reader page and verify accessibility score ≥ 90.
