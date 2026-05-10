# STORY-019: Autosave with Visual Indicator

**Epic**: EPIC-003
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 3
**Dependencies**: STORY-018

## User Story
As a young author, I want my writing to be saved automatically while I type, so that I never lose my ideas even if I forget to press a save button or the browser closes unexpectedly.

## Acceptance Criteria
1. **GIVEN** Julia is writing in the editor, **WHEN** she has been typing for 30 seconds without pausing, **THEN** the current chapter content is automatically saved to the server in the background.
2. **GIVEN** an autosave is in progress, **WHEN** Julia looks at the UI, **THEN** she sees a subtle, non-intrusive indicator (e.g., "Saving..." or a small spinner) that does not distract her from writing.
3. **GIVEN** the autosave completes successfully, **WHEN** it finishes, **THEN** the indicator changes to a brief "Saved!" message or checkmark that fades out after 2 seconds.
4. **GIVEN** Julia closes the browser or the connection drops during writing, **WHEN** she reopens the editor for the same book, **THEN** her most recent autosaved content is restored.
5. **GIVEN** the network is unavailable, **WHEN** an autosave triggers, **THEN** the content is saved locally (IndexedDB or localStorage) and syncs when the connection returns, with a friendly offline message shown.

## Related NFRs
- **NFR-PERF-03**: Typing latency not degraded by autosave (save in background, not on main thread).
- **NFR-PERF-06**: Offline save completes within 100ms (local write).
- **NFR-ACC-01**: WCAG 2.1 AA — save indicator is subtle and not an accessibility violation (no flashing).
- **NFR-ACC-03**: Screen reader optionally announces "Saved" (use `aria-live="polite"` with delay).
- **NFR-AVL-04**: Graceful degradation with local save when offline.
- **NFR-SEC-04**: Autosave payload is validated and sanitized server-side.

## Technical Notes
- Autosave strategy:
  - **Server-save**: debounce by 30 seconds of inactivity OR save every 30 seconds if actively typing.
  - **Local-save**: on every significant change (e.g., every 5 seconds or 100 characters), write to IndexedDB with key `autosave:/books/:book_id/chapters/:chapter_id`.
- Use a Web Worker or `requestIdleCallback` for autosave if available, to avoid blocking the UI thread.
- Conflict resolution: if local version is newer than server version on reconnect, prefer local with a warning if diverged significantly.
- Autosave indicator placement: bottom-right or top bar, small and unobtrusive.
- Do NOT show modal dialogs or block the editor during autosave.
- Implement exponential backoff for retry on network failure.

## QA Notes
- Test typing continuously for 2 minutes and verify server receives saves without blocking input.
- Disconnect network mid-session and verify local save + offline message.
- Reconnect and verify sync happens automatically; no data lost.
- Test browser crash simulation: kill browser process, reopen, verify content restored.
- Measure typing latency during autosave with Chrome DevTools Performance tab.
- Verify the "Saving..." / "Saved!" indicator does not cause layout shifts (CLS check).
- Test screen reader: ensure "Saved" is not announced too frequently (debounce announcements).
