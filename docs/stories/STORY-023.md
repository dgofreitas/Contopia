# STORY-023: Color Picker & Background Customization

**Epic**: EPIC-004
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-022

## User Story
As a young author, I want to change the colors and background pattern of my book cover, so that it matches my style and feels truly mine.

## Acceptance Criteria
1. **GIVEN** Julia has selected a template, **WHEN** she opens the color customization panel, **THEN** she sees a curated palette of 12–20 child-friendly colors and a few pattern options (e.g., stripes, dots, stars).
2. **GIVEN** Julia taps a color swatch, **WHEN** selected, **THEN** the cover, spine, and edge previews update instantly (<200ms) to reflect the new color.
3. **GIVEN** Julia selects a background pattern, **WHEN** applied, **THEN** the cover and spine update with the pattern overlaid on the base color.
4. **GIVEN** `prefers-reduced-motion` is enabled, **WHEN** color changes, **THEN** the preview updates instantly without animated transitions.
5. **GIVEN** the color panel is open, **WHEN** Julia uses a screen reader, **THEN** each color swatch announces its name (e.g., "Sky blue") and the current selection state.

## Related NFRs
- **NFR-PERF-04**: Preview updates <200ms on mobile.
- **NFR-ACC-01**: WCAG 2.1 AA — color panel keyboard navigable.
- **NFR-ACC-03**: Screen reader announces color names and selection.
- **NFR-ACC-04**: Color swatches have sufficient contrast against their background.
- **NFR-ACC-07**: Color names localized in Portuguese and English.
- **NFR-SEC-04**: All color values validated as safe CSS values.

## Technical Notes
- Color palette: curated list of hex/RGB values stored in a config file (no freeform text input to prevent injection).
- Patterns are CSS gradients or SVG patterns rendered in the DOM, not images.
- State management: store selected colors/patterns in component state; debounce preview renders if needed.
- The spine auto-generates from the cover's base color (unless manually overridden in STORY-025).
- Edge uses the same base color by default with optional patterns.
- Implement with CSS custom properties (`--cover-bg`, `--spine-bg`) for rapid theme switching.

## QA Notes
- Test color switch latency across all breakpoints; must be <200ms.
- Test with `prefers-reduced-motion: reduce`.
- Verify keyboard navigation: Tab through swatches, Enter to select.
- Screen reader test: verify swatch names announced.
- Test all patterns at all colors to ensure visibility and contrast.
- Check for layout shifts during color change (should be zero).
