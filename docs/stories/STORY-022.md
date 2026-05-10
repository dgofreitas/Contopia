# STORY-022: Cover Designer UI & Template Selection

**Epic**: EPIC-004
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-006, STORY-020

## User Story
As a young author, I want to choose from fun, pre-made cover templates, so that I can quickly start designing my book without feeling overwhelmed.

## Acceptance Criteria
1. **GIVEN** Julia finishes writing or taps "Design Cover" from the shelf, **WHEN** the cover designer opens, **THEN** she sees a gallery of 10–15 kid-friendly templates (e.g., Galaxy, Adventure, Nature, Stripes).
2. **GIVEN** the template gallery, **WHEN** Julia taps a template, **THEN** the cover preview instantly updates to show that template with the book's title and author name pre-filled.
3. **GIVEN** the designer is open, **WHEN** viewed on any device, **THEN** the layout is responsive: template grid is horizontal scrollable on mobile, grid on tablet/desktop.
4. **GIVEN** a template is selected, **WHEN** Julia navigates with a screen reader, **THEN** each template has a descriptive `aria-label` (e.g., "Galaxy template, dark blue with stars").
5. **GIVEN** Julia wants to skip designing, **WHEN** she taps "Skip," **THEN** the default cover is assigned (STORY-028) and she returns to the shelf.
6. **GIVEN** a template is selected, **WHEN** Julia taps "Next" or "Customize," **THEN** she proceeds to the color/text customization screen (STORY-023).

## Related NFRs
- **NFR-PERF-01/04**: Designer preview updates <200ms after each change on mobile.
- **NFR-ACC-01**: WCAG 2.1 AA — template gallery is keyboard navigable.
- **NFR-ACC-03**: Screen reader announces template names.
- **NFR-ACC-04**: Template thumbnails have sufficient contrast.
- **NFR-ACC-07**: Template names localized in Portuguese and English.
- **NFR-SEC-04**: No malicious content in template metadata.
- **NFR-SEC-07**: No third-party scripts in designer.

## Technical Notes
- Templates are predefined CSS/SVG-based styles stored in the client bundle (no dynamic loading from external URLs).
- Each template defines: background type (solid, gradient, pattern), color palette, and decoration layer (if any).
- Template gallery: horizontal scroll on mobile (`overflow-x: auto`, snap scrolling), 3-column grid on tablet, 4-column on desktop.
- Selected state: highlight with border or scale; announce via screen reader.
- The preview pane shows cover, spine, and edge side-by-side (or cover prominent with spine mini-preview).
- Keep all assets in the repository; no CDN for template files to avoid NFR-SEC-07 risks.
- Lazy-load template gallery images (if using PNG/SVG previews) with `loading="lazy"`.

## QA Notes
- Test template selection speed on mobile (should feel instant, <200ms).
- Test with 10–15 templates and verify horizontal scroll is smooth on iOS and Android.
- Test keyboard navigation: Tab through templates, Enter to select.
- Screen reader: verify each template name and description is announced.
- Test "Skip" flow and verify default cover appears on shelf.
- Verify no external network requests when loading templates.
- Run Lighthouse and check for layout shifts (CLS) during template switch.
