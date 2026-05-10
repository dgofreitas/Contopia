# STORY-010: Empty Bookshelf State

**Epic**: EPIC-001
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-009

## User Story
As a young author, I want to see a friendly, encouraging screen when my shelf is empty, so that I feel excited to write my first book.

## Acceptance Criteria
1. **GIVEN** Julia has no published books, **WHEN** she opens the app, **THEN** she sees a warm illustration (e.g., an empty shelf with a friendly character) and a clear call-to-action button labeled "Write My First Book."
2. **GIVEN** the empty state is displayed, **WHEN** Julia taps "Write My First Book," **THEN** she is taken to the book creation flow (STORY-016).
3. **GIVEN** the empty state is displayed, **WHEN** a screen reader is active, **THEN** the illustration has an `alt` text or `aria-hidden="true"`, and the CTA is announced as the primary action.
4. **GIVEN** the empty state is shown, **WHEN** the app is in Portuguese, **THEN** all text and the CTA are displayed in Portuguese.
5. **GIVEN** the empty state is shown on any device, **WHEN** the viewport changes, **THEN** the illustration and CTA remain centered and readable without clipping.

## Related NFRs
- **NFR-ACC-01**: WCAG 2.1 AA — empty state is keyboard navigable.
- **NFR-ACC-03**: Screen reader support for illustration and CTA.
- **NFR-ACC-04**: Text and button contrast meet 4.5:1 minimum.
- **NFR-ACC-07**: UI localized in Portuguese and English.
- **NFR-SEC-04**: No user input on this screen; static content sanitized.

## Technical Notes
- Empty state is a full-viewport overlay or conditional rendering within the shelf container.
- Illustration should be an SVG or optimized PNG (lightweight, <50KB) to ensure fast load.
- Keep the CTA button large (min 48x48dp touch target) for child-friendly interaction.
- This state is triggered when `GET /api/books` returns an empty array.
- Consider animating the illustration subtly (e.g., character waves) to add delight without violating `prefers-reduced-motion`.

## QA Notes
- Verify empty state appears for brand-new users (0 published books).
- Verify empty state disappears as soon as the first book is published.
- Test CTA navigation leads correctly to book creation.
- Run Lighthouse accessibility audit and confirm no contrast or aria violations.
- Test responsive behavior on 320px mobile, 768px tablet, and 1440px desktop.
