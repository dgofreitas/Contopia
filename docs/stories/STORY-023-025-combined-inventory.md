# DOMAIN INVENTORY — STORY-023 + STORY-025 (Combined)

## BACKEND (both stories)
[DONE] book-model.js       → coverColor, coverPattern (023) + spineColor (virtual→getter), spineCustomized (025)
[DONE] validation-schemas.js → coverColor, coverPattern (023) + spineColor, spineCustomized (025)
[DONE] book-manager.js      → add all 4 fields to allowedFields

## FRONTEND DATA LAYER (both stories)
[DONE] cover-color-palette.js (NEW 023)     → 16 curated colors
[DONE] cover-patterns.js (NEW 023)           → 6 pattern definitions
[DONE] cover-store.js (MODIFY 023+025)       → baseColor, patternId, spineColor, spineCustomized + actions
[DONE] spine-color-utils.js (NEW 025)        → deriveSpineColor utility
[DONE] i18n en/cover.json (MODIFY 023+025)   → color/pattern/spine keys
[DONE] i18n pt-BR/cover.json (MODIFY 023+025) → same

## FRONTEND CSS (both stories)
[DONE] cover.css (MODIFY) → pattern overlay classes (023) + spine preview styles (025) + reduced-motion

## FRONTEND UI — STORY-023
[DONE] ColorSwatch.jsx (NEW)
[DONE] ColorPickerPanel.jsx (NEW)
[DONE] PatternSwatch.jsx (NEW)
[DONE] PatternPickerPanel.jsx (NEW)
[DONE] CustomizeActions.jsx (NEW)
[DONE] CoverCustomizePage.jsx (NEW)
[DONE] CoverPreview.jsx (MODIFY — CSS vars, pattern overlay)
[DONE] useSaveCoverCustomization.js (NEW)
[DONE] App.jsx (MODIFY — route fix)

## FRONTEND UI — STORY-025
[DONE] SpinePreview.jsx (NEW)
[DONE] SpineToggle.jsx (NEW)
[DONE] SpineColorPicker.jsx (NEW)
[DONE] SpineCustomizeSection.jsx (NEW)
[DONE] CoverPreview.jsx (MODIFY — embed SpinePreview)
[DONE] useSaveCoverCustomization.js (MODIFY — add spine payload)
[DONE] BookSpine.jsx (MODIFY — verified compatible, no changes needed)
[DONE] CoverOverlay.jsx (MODIFY — verified compatible, no changes needed)

## GATE: All items [DONE] → TestEngineer

## EXECUTION ORDER
Phase 1: BACKEND + FRONTEND DATA LAYER + CSS — PARALLEL (BackendDeveloper || FrontendDeveloperReact)
Phase 2: FRONTEND UI STORY-023 — FrontendDeveloperReact
Phase 3: FRONTEND UI STORY-025 — FrontendDeveloperReact
Phase 4: Tests → QA → Review → MR
