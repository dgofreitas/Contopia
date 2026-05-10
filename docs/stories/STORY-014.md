# STORY-014: Responsive Shelf Layout

**Epic**: EPIC-001
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-009

## User Story
As a young author, I want my bookshelf to look great and be easy to use on my tablet, my mom's phone, and our computer, so that I can enjoy my library no matter what device I'm using.

## Acceptance Criteria
1. **GIVEN** Julia is using a mobile phone (320–480px width), **WHEN** the shelf loads, **THEN** spines are sized appropriately for touch (min 48px width), shelves are scrollable vertically, and no horizontal scrolling is required.
2. **GIVEN** Julia is using a tablet (768–1024px width), **WHEN** the shelf loads, **THEN** more spines fit per row, shelf proportions adjust, and touch targets remain large and comfortable.
3. **GIVEN** Julia is using a desktop browser (>1024px width), **WHEN** the shelf loads, **THEN** the shelf is centered, spines may be slightly larger, and the layout uses the extra space without stretching spines unnaturally.
4. **GIVEN** the device orientation changes (portrait ↔ landscape), **WHEN** the shelf re-renders, **THEN** books reposition smoothly and no data or state is lost.
5. **GIVEN** the responsive layout is rendering, **WHEN** tested with 50 books, **THEN** the shelf renders within 500ms on all target viewports (NFR-PERF-01).

## Related NFRs
- **NFR-PERF-01**: Shelf render <500ms for up to 50 books on mid-range mobile.
- **NFR-ACC-01**: WCAG 2.1 AA — responsive layout does not break keyboard navigation.
- **NFR-ACC-04**: Text contrast maintained across all breakpoints.
- **NFR-AVL-04**: Graceful degradation if CSS features are unsupported.

## Technical Notes
- Mobile-first CSS with breakpoints at ~600px (tablet) and ~1024px (desktop).
- Use CSS Grid for shelf rows: `grid-template-columns: repeat(auto-fill, minmax(48px, 1fr))` or similar.
- Spine dimensions should be relative (vw/vh or % with max sizes) rather than fixed pixels.
- Avoid reflow-heavy operations on resize; debounce resize handlers if JavaScript adjustments are needed.
- Test with browser DevTools device emulation and on real devices.
- Consider CSS Container Queries for shelf-row sizing if browser support allows (fallback to media queries).
- Ensure the loading and empty states also adapt responsively.

## QA Notes
- Test on physical devices: iPhone SE, iPad, mid-range Android phone, and desktop Chrome.
- Rotate device and verify smooth repositioning.
- Run Lighthouse for "Mobile" and "Desktop" categories; verify no CLS (Cumulative Layout Shift) issues.
- Test with 0, 10, and 50 books at each breakpoint.
- Verify touch targets are ≥ 48x48dp on all breakpoints (Chrome DevTools "Show tap targets").
