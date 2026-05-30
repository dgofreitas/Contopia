# TEST COVERAGE INVENTORY — STORY-030 (Paginated Reading Mode)
─────────────────────────────────────
## NEW FILES:
[x] frontend/src/hooks/usePagination.js → unit tests
[x] frontend/src/components/reader/PageTurnAnimation.jsx → component tests
[x] frontend/src/components/reader/ChapterTransitionCard.jsx → component tests

## MODIFIED FILES (add pagination tests):
[x] frontend/src/stores/reader-store.js → add pagination state/action tests
[x] frontend/src/components/reader/ReaderTapZones.jsx → update mock + add page-based tests
[x] frontend/src/components/reader/ReaderProgressBar.jsx → add page-based progress tests
[x] frontend/src/components/reader/ReaderSettings.jsx → add onRepaginate tests
[x] frontend/src/app/reader/ReaderPage.jsx → update mocks + add pagination tests

## GATE: All domains [DONE] with >=90% coverage for the NEW/MODIFIED files
─────────────────────────────────────
