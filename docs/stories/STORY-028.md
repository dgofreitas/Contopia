# STORY-028: Default Cover Generation

**Epic**: EPIC-004
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies": STORY-009, STORY-022

## User Story
As a young author, I want my books to always have a pleasant default cover if I skip the designer, so that my shelf never looks empty or broken.

## Acceptance Criteria
1. **GIVEN** a book has no custom cover, **WHEN** it is published or displayed on the shelf, **THEN** a default cover is automatically generated using the book's title and a random pleasant color from the curated palette.
2. **GIVEN** the default cover, **WHEN** generated, **THEN** the cover displays the title in a readable font centered on a solid or subtly textured background.
3. **GIVEN** the default cover, **WHEN** displayed, **THEN** a matching spine and default edge are also generated for consistency on the shelf and pull-out views.
4. **GIVEN** Julia later designs a custom cover, **WHEN** she saves it, **THEN** the default cover is replaced by the custom one across all views.
5. **GIVEN** the default cover generator, **WHEN** two different books have no custom cover, **THEN** they may receive different random colors to distinguish them visually.

## Related NFRs
- **NFR-PERF-01**: Default cover renders within 500ms shelf budget.
- **NFR-ACC-04**: Title text on default cover has sufficient contrast against background.
- **NFR-ACC-03**: Screen reader announces the book title (already handled by spine).
- **NFR-SEC-04**: Cover generation logic safe from injection (title is sanitized before rendering).
- **NFR-PRV-03**: No extra data stored beyond title and color for default covers.

## Technical Notes
- Default cover is a client-side CSS/SVG composition — no server image generation needed in MVP.
- Pick a random color from a fixed palette of 12 pleasant, high-contrast colors.
- Font: same preloaded sans-serif as cover designer; scale to fit the cover rectangle.
- Store default cover state in DB: `has_custom_cover = false`, `default_color`, `default_font`.
- If `has_custom_cover = true`, load custom assets from the asset pipeline; otherwise render the default CSS composition.
- The shelf query should return `has_custom_cover` flag + `default_color` so the spine can be rendered without fetching full assets.

## QA Notes
- Publish books without custom covers and verify default covers appear correctly on shelf, pull-out, and reader cover views.
- Test with very short and very long titles.
- Verify default spine color is used in shelf view for books without custom covers.
- Test replacing default with custom cover via designer — verify all views update.
- Check color contrast of all default palette colors with white/black text.
- Verify no layout shifts when default cover loads.
