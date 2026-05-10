# STORY-032: Font Size & Theme Settings

**Epic**: EPIC-002
**Persona": Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies": STORY-029

## User Story
As a young author, I want to make the text bigger or smaller and choose a comfortable background color, so that I can read comfortably in any lighting and with my eyesight.

## Acceptance Criteria
1. **GIVEN** Julia is in the reader, **WHEN** she opens the settings panel, **THEN** she sees options for Font Size (Small, Medium, Large) and Theme (Day, Sepia, Night).
2. **GIVEN** Julia selects a font size, **WHEN** applied, **THEN** the text resizes immediately and the change persists across all future reading sessions for this device.
3. **GIVEN** Julia selects a theme, **WHEN** applied, **THEN** the background and text colors change immediately to: Day (white/black), Sepia (warm beige/dark brown), Night (dark gray/light gray).
4. **GIVEN** all theme combinations, **WHEN** checked for accessibility, **THEN** text and background maintain a minimum contrast ratio of 4.5:1 (NFR-ACC-04).
5. **GIVEN** Julia's device has system-wide font scaling enabled, **WHEN** she opens the reader, **THEN** the app respects the system font size in addition to the in-app setting (NFR-ACC-06).
6. **GIVEN** the settings panel is open, **WHEN** Julia uses a screen reader, **THEN** each option is clearly labeled and selection state is announced (e.g., "Large font size, selected").

## Related NFRs
- **NFR-ACC-04**: Minimum contrast ratio 4.5:1 for all theme combinations.
- **NFR-ACC-06**: Support three font sizes; respect system font scaling.
- **NFR-ACC-05**: Theme transition respects `prefers-reduced-motion`.
- **NFR-ACC-01**: WCAG 2.1 AA — settings panel keyboard navigable.
- **NFR-PERF-02**: Text reflow within 1s after font/theme change.
- **NFR-SEC-04**: Settings stored safely (no injection via preference values).

## Technical Notes
- Store preferences in `localStorage` or backend user settings table (`reader_font_size`, `reader_theme`).
- Theme implementation: CSS custom properties (`--reader-bg`, `--reader-text`, `--reader-accent`) switched via class or variable override.
- Font sizes: Small (~14px), Medium (~18px), Large (~24px) base sizes; use `rem` for scaling.
- Respect `prefers-color-scheme` as an initial default if the user has not set a theme manually.
- System font scaling: use `font-size: 100%` on root and let browser scale relative sizes.
- Prefetch/cache all theme CSS variables to prevent FOUC (Flash of Unstyled Content).
- Ensure the settings panel is a modal/drawer with proper focus trap.

## QA Notes
- Measure contrast ratios for all theme combinations using aXe or WebAIM contrast checker.
- Test with browser font size set to 200% and verify readability.
- Test `prefers-reduced-motion` during theme transitions.
- Test keyboard-only settings navigation: open, change size, change theme, close.
- Screen reader: verify each option state announced.
- Verify settings persist after app refresh and logout/login.
- Test font size changes in paginated mode (page count recalculation) and scroll mode (position preservation).
