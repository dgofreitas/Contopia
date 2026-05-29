# Code Review Report — STORY-033 (2026-05-28) [r1]

## Summary
| Security | Correctness | Maintainability | Coverage |
|----------|-------------|-----------------|----------|
| A | A- | B+ | 96% |

Implementation complete and solid. No security issues. Good test coverage (96% avg). Minor performance concern and one semantic flag misuse found. All ACs covered.

---

## Critical Issues
*None.*

---

## Major Issues

### 1. localStorage read on every render — performance
**File:** `frontend/src/hooks/useProgressSync.js:55-67`

`mergedProgress` computed inline (IIFE) on every render. Each call reads `localStorage` via `getLocalProgress()`. For a component that re-renders on chapter/scroll changes, this is unnecessary I/O inside render path.

```js
// Lines 55-67 — runs on EVERY render, reads localStorage
const mergedProgress = (() => {
    const local = getLocalProgress(bookId);  // localStorage read
    const server = serverProgress;
    // ...
})();
```

**Fix:** Wrap in `useMemo` with `[bookId, serverProgress]` deps.

---

## Minor Issues

### 2. `syncStatus` uses `'error'` for offline-queued state
**File:** `frontend/src/hooks/useProgressSync.js:181`

When offline, `syncStatus` set to `'error'`. Semantically misleading — no error occurred, just pending sync. UI code reading `syncStatus === 'error'` would show error state when app is simply offline.

**Fix:** Use distinct status value e.g. `'pending_sync'` or rename to `syncState: 'idle' | 'saving' | 'pending_sync' | 'error'`.

### 3. `_immediate` internal flag leaks to localStorage
**File:** `frontend/src/hooks/useProgressSync.js:122-127`

`data = { ...progressData }` spread includes `_immediate` flag. `setLocalProgress(bookId, data)` saves this internal flag to localStorage unnecessarily.

**Fix:** Strip `_immediate` before calling `setLocalProgress`. Or use separate internal var.

### 4. Redundant `useReadingProgressQuery` call in ReaderPage
**File:** `frontend/src/app/reader/ReaderPage.jsx:62`

ReaderPage calls `useReadingProgressQuery(bookId)` directly (line 62) and also through `useProgressSync(bookId)` (line 63, which internally calls the same hook). Harmless (TanStack Query deduplicates via queryKey), but wastes query instantiation.

**Fix:** Remove line 62; use only `syncedProgress` from `useProgressSync`.

### 5. `ReaderProgressBar` aria-label lacks dynamic percentage
**File:** `frontend/src/components/reader/ReaderProgressBar.jsx:22`

```jsx
aria-label={t('progressLabel')}
```

Static label, no percentage value. Screen reader gets "progress label" not "60% read" (unlike `ShelfProgressIndicator` which passes `{ percentage }`).

**Fix:** Pass percentage to i18n interpolation: `t('progressLabel', { percentage: Math.round(progress) })`.

### 6. `saveProgress` returns new object on every render
**File:** `frontend/src/hooks/useProgressSync.js:187-191`

Return value is new object literal each render. Can cause unnecessary re-renders in consumers that compare references.

**Fix:** Wrap return object in `useMemo`.

---

## Positive Observations
- ✅ All 5 ACs implemented end-to-end (progress save, resume, finished, shelf indicator, offline sync)
- ✅ 96% average coverage, all tests passing
- ✅ Full i18n support (en + pt-BR) for shelf progress labels
- ✅ WCAG 2.1 AA — `ShelfProgressIndicator` uses `role="progressbar"`, `aria-valuenow/min/max`, `aria-label`
- ✅ Backend validation (`finished` in Zod schema) + auto-set logic in manager
- ✅ `finished` state + "The End" screen + restart flow implemented
- ✅ Offline-first: localStorage + debounced server save + reconnection flush
- ✅ No hardcoded secrets, no SQL injection vectors, content sanitized via `sanitizeRichContent`
- ✅ Clean data flow: `BookshelfGridLayout → BookshelfGrid → ShelfRow → BookSpine → ShelfProgressIndicator`

---

## Rework Delegation
*(None — no blocking issues)*

---

`VERDICT: APPROVED`
