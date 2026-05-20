# Code Review Report — feat/STORY-019-autosave-with-visual-indicator (2026-05-20) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | A | A | 98 tests pass (6 files) |

## Files Reviewed (9 source + 6 test)
1. `frontend/src/services/autosave-service.js` — IndexedDB wrapper
2. `frontend/src/hooks/useAutoSave.js` — core autosave hook
3. `frontend/src/hooks/useNetworkStatus.js` — online/offline detection
4. `frontend/src/hooks/useDraftRecovery.js` — draft recovery
5. `frontend/src/components/editor/AutoSaveIndicator.jsx` — visual indicator
6. `frontend/src/app/editor/ChapterEditor.jsx` — refactored editor
7. `frontend/src/app/editor/EditorPage.jsx` — editor page
8. `frontend/src/stores/book-store.js` — deprecated draft fields
9. `frontend/src/styles/editor.css` — autosave styles + ProseMirror

## Critical Issues
None.

## Major Issues
None.

## Minor Suggestions

### 1. AutoSaveIndicator — CLS risk on idle→no-lastSavedAt
**File:** `frontend/src/components/editor/AutoSaveIndicator.jsx:58-60`

**Issue:** Early return when `saveStatus === 'idle' && !lastSavedAt` skips `autosave-indicator-wrapper` (which has `min-h-[1.5rem]`). Transition from another state to this bare state could cause layout shift.

**Fix:** Wrap early return in same wrapper:
```jsx
return (
  <div className="autosave-indicator-wrapper min-h-[1.5rem]">
    <span role="status" aria-live="polite" className="sr-only">{srAnnouncement}</span>
  </div>
);
```

### 2. useDraftRecovery — hardcoded conflict string (no i18n)
**File:** `frontend/src/hooks/useDraftRecovery.js:51`

**Issue:** Conflict warning is a hardcoded string rather than using `t('conflictWarning')` from i18n. i18n key exists in both locales.

**Fix:** Hook should accept a `t` function or `ChapterEditor` should translate before passing down. Currently rendered in `ChapterEditor.jsx:127` as a direct string.

### 3. useNetworkStatus — event listener re-registration on re-render
**File:** `frontend/src/hooks/useNetworkStatus.js:9-29`

**Issue:** `handleOnline` closure captures `isOnline` from state, causing useEffect dependency on `isOnline`. Every time `isOnline` flips, old listeners removed and new ones added. Works correctly but wastes cycles.

**Fix:** Use `useRef` for `isOnline` in handlers to avoid dependency churn:
```js
const wasOfflineRef = useRef(false);
const handleOnline = () => {
  if (!navigator.onLine) return;
  setIsOnline(true);
  if (wasOfflineRef.current) { wasOfflineRef.current = false; setWasOffline(true); }
};
```

### 4. autosave-service — no connection pooling
**File:** `frontend/src/services/autosave-service.js:5-25`

**Issue:** `openDB()` called on every operation — opens/closes DB each time. Minor perf overhead for frequent saves. Acceptable for MVP per tech analysis spec.

**Fix (future):** Cache DB connection in a module-level variable, reopen only on versionchange/close events.

## Positive Observations
- ✅ **Security**: No XSS vectors. Content sanitized client-side via `sanitizeRichContent()`, re-sanitized server-side. IndexedDB same-origin only. localStorage same-origin only. No secrets exposed.
- ✅ **Performance**: `requestIdleCallbackShim` for local saves. All timers properly cleaned on chapter change, unmount, content change. No memory leaks. `beforeunload` handler uses sync localStorage + async IDB.
- ✅ **Accessibility**: `role="status"` + `aria-live="polite"` on save indicator. Screen reader announcements debounced at 5s interval. Visual indicators have `aria-hidden="true"`. No flashing animations — CSS opacity transitions only.
- ✅ **Indicator CLS prevention**: Wrapper has `min-h-[1.5rem]` reserved space. `aria-hidden="true"` on visual wrapper prevents duplicate screen reader output.
- ✅ **Debounce correctness**: 5s local / 30s server. 100-char threshold for early local save. Max interval timer (30s) ensures periodic saves during active typing.
- ✅ **Offline state machine**: Server save error → offline → local save → reconnect → retry with exponential backoff (1s→2s→4s→8s→16s, max 5, ±200ms jitter).
- ✅ **Draft recovery**: IndexedDB check on mount → merge with localStorage emergency → pick newest → conflict detection (divergence >5min → warning). Clean cancellation on unmount.
- ✅ **Chapter switching**: All timers cleared, dirty flag reset, refs reset. Correct.
- ✅ **Quota handling**: IndexedDB `QuotaExceededError` → fall back to localStorage. Cleanup LRU (50 max, 7-day age).
- ✅ **book-store.js draft fields**: Cleanly removed per spec. Comment documents the deprecation.
- ✅ **i18n**: All autosave strings in en + pt-BR (`savingOffline`, `savedExclamation`, `offlineMessage`, `syncingMessage`, `unableToSync`, `localChangesKept`, `conflictWarning`).
- ✅ **CSS**: `.autosave-fade-out` uses `opacity 0.3s ease`. Colors pass WCAG AA contrast. No rapid on/off animations.
- ✅ **Tests**: 98 tests pass across 6 test files (autosave-service, useAutoSave, useNetworkStatus, useDraftRecovery, AutoSaveIndicator, ChapterEditor). All ACs covered.

## Test Results
```
PASS  autosave-service.test.js     (28 tests)
PASS  useAutoSave.test.js          (17 tests)
PASS  useNetworkStatus.test.js     (8 tests)
PASS  useDraftRecovery.test.js     (16 tests)
PASS  AutoSaveIndicator.test.jsx   (18 tests)
PASS  ChapterEditor.test.jsx       (11 tests)
─────────────────────────────────────────────
PASS (98) FAIL (0)
```

## Rework Delegation
None required.

---
`VERDICT: APPROVED`
