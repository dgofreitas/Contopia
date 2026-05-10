# STORY-025: Spine Auto-Generation & Manual Override

**Epic**: EPIC-004
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-023

## User Story
As a young author, I want my book's spine to look good on the shelf automatically, and optionally customize it, so that my books are recognizable even from the side.

## Acceptance Criteria
1. **GIVEN** Julia has customized her cover color, **WHEN** the designer updates, **THEN** the spine is automatically generated with the same base color and the book title rendered vertically.
2. **GIVEN** the auto-generated spine, **WHEN** displayed on the shelf preview, **THEN** the title text fits the spine width and truncates with ellipsis if too long.
3. **GIVEN** Julia wants a different spine color, **WHEN** she toggles "Customize Spine," **THEN** a separate color picker appears for the spine, overriding the cover-derived color.
4. **GIVEN** Julia customizes the spine, **WHEN** she saves, **THEN** the spine color and title are stored as part of the book's asset metadata.
5. **GIVEN** the spine preview, **WHEN** viewed on mobile, **THEN** it is proportional to the shelf spine size for realism.

## Related NFRs
- **NFR-PERF-01**: Spine preview renders within the 500ms shelf budget.
- **NFR-ACC-01**: WCAG 2.1 AA — "Customize Spine" toggle is keyboard accessible.
- **NFR-ACC-03**: Screen reader announces spine preview state.
- **NFR-ACC-04**: Spine text contrast meets 4.5:1.
- **NFR-SEC-04**: Spine parameters validated.

## Technical Notes
- Spine auto-generation derives from cover state: `spine_color = cover_primary_color`, `spine_title = book_title`.
- Vertical text: use CSS `writing-mode: vertical-rl` or SVG text on a path (ensure cross-browser support).
- Spine dimensions in preview: match shelf spine ratio (typically 1:4 to 1:6 width-to-height).
- Manual override flag in state: if `spine_customized = true`, use user-selected color; else auto-sync.
- Store spine asset metadata in the database: `spine_color`, `spine_text`, `spine_customized` boolean.
- Ensure the spine title uses the same font as the cover title but smaller.

## QA Notes
- Test auto-generation with various cover colors and verify spine matches.
- Test manual override: change spine color independently of cover.
- Test very long titles (max 120 chars) — verify ellipsis truncation on spine.
- Verify keyboard-only "Customize Spine" toggle interaction.
- Test with screen reader: spine preview announced after customization.
- Check spine preview proportions against actual shelf spine dimensions.
