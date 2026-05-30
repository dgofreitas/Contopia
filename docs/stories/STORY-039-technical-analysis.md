# STORY-039: Animation Engine & Timing System — Technical Analysis

**Epic**: EPIC-007 — Bookshelf Animations
**Persona**: Julia — The Young Author
**Priority**: Should Have | **Story Points**: 5
**Dependencies**: STORY-038 (Animation Spike — merged, Framer Motion confirmed)
**Stack Reference**: `docs/architecture/TECH-STACK.md` — React 18, Vite 5, Framer Motion ^11.11.0

---

## 1. Spike Decision (STORY-038 — Locked In)

| Decision | Detail |
|----------|--------|
| **Engine** | Framer Motion (already in `package.json`, 31 import sites, 163+ references) |
| **Bundle optimization** | `LazyMotion` + `domAnimation` (~17KB initial); async `domMax` for gesture/layout features |
| **GSAP** | Reserved as optional complement for complex timelines (STORY-043 page-turn only) |
| **react-spring** | Excluded — no FLIP, no gesture support, high migration cost |

---

## 2. Problem Statement

**Current state** (from code analysis):

- `useReducedMotion()` boilerplate duplicated in **14+ components**
- `EASE_OUT` cubic bezier constant duplicated in **3 files** (`CoverOverlay.jsx`, `PulledOutOverlay.jsx`, `PageTurnAnimation.jsx`)
- Duration/transition configs hand-rolled per component — no shared presets
- `ErrorToast.jsx` uses raw `window.matchMedia` instead of `useReducedMotion` — **inconsistency bug**
- No `LazyMotion` / `domAnimation` — full framer-motion bundle loaded everywhere
- No centralized interruptibility; each component manages its own `AnimatePresence`
- `useSortAnimation.js` (30 lines) is the closest thing to a shared animation hook — but it's shelf-specific
- No `visibilitychange` pause/resume logic exists anywhere

**What STORY-039 delivers**: A shared animation facade that all EPIC-007 stories (040–044) consume, eliminating duplication and providing interruptibility, stagger, reduced-motion, and tab-backgrounding — once.

---

## 3. Architecture

### 3.1 Layered Engine Design

```mermaid
graph TD
    subgraph "Consumers (EPIC-007+)"
        S040["STORY-040<br/>Pull-out"]
        S041["STORY-041<br/>Open Cover"]
        S042["STORY-042<br/>Place Back"]
        S043["STORY-043<br/>Page Turn"]
        S044["STORY-044<br/>Re-sort"]
        EXISTING["Existing Components<br/>(14+ files)"]
    end

    subgraph "Animation Engine (STORY-039)"
        HOOKS["Custom Hooks<br/>useAnimation<br/>useStagger<br/>useReducedMotionConfig"]
        VARIANTS["Variant Factories<br/>overlayVariants<br/>slideVariants<br/>fadeVariants"]
        CONFIG["Config Module<br/>easings, durations<br/>spring presets"]
        INTERRUPT["Interruptibility<br/>WeakMap registry<br/>cancel + restart"]
        VIS["Visibility Guard<br/>pause on background<br/>resume on foreground"]
    end

    subgraph "Framer Motion (Dep)"
        FM["framer-motion ^11.11.0"]
        LM["LazyMotion + domAnimation<br/>domMax (async)"]
    end

    S040 --> HOOKS
    S041 --> HOOKS
    S042 --> HOOKS
    S043 --> HOOKS
    S044 --> HOOKS
    EXISTING --> CONFIG
    HOOKS --> CONFIG
    HOOKS --> INTERRUPT
    HOOKS --> VIS
    HOOKS --> VARIANTS
    HOOKS --> FM
    FM --> LM
```

### 3.2 Module Structure

```
frontend/src/
├── lib/
│   └── animation/
│       ├── index.js              # Public API barrel export
│       ├── config.js             # Easing curves, spring presets, duration constants
│       ├── reduced-motion.js     # useReducedMotionConfig hook (centralized)
│       ├── visibility.js         # useVisibilityGuard hook (pause/resume on tab switch)
│       ├── animate.js            # animate() — imperative interruptible animation
│       ├── stagger.js            # stagger() — multi-element sequence factory
│       ├── variants.js          # Pre-built variant factories (overlay, slide, fade)
│       └── __tests__/
│           ├── config.test.js
│           ├── reduced-motion.test.js
│           ├── visibility.test.js
│           ├── animate.test.js
│           ├── stagger.test.js
│           └── variants.test.js
├── hooks/
│   └── useSortAnimation.js      # Refactored to consume lib/animation/config
├── components/
│   └── shelf/
│       ├── BookshelfGrid.jsx    # Refactored: use stagger() + variants from engine
│       ├── CoverOverlay.jsx     # Refactored: use config easings + reduced-motion hook
│       └── ...                   # Other components refactored incrementally
└── App.jsx                      # Add <LazyMotion> wrapper at root
```

---

## 4. Detailed Design

### 4.1 `config.js` — Animation Constants

```js
// Easing curves (replaces 3x duplicated EASE_OUT)
export const EASINGS = {
  easeOut: [0.25, 0.1, 0.25, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  anticipate: [0.2, 0.6, 0.35, 1],  // for playful interactions
};

// Spring presets (replaces scattered inline configs)
export const SPRINGS = {
  gentle:    { stiffness: 120, damping: 14 },
  bouncy:    { stiffness: 300, damping: 20 },   // current useSortAnimation
  stiff:     { stiffness: 400, damping: 30 },
  snappy:    { stiffness: 500, damping: 35 },
};

// Duration presets (ms → seconds for Framer Motion)
export const DURATIONS = {
  instant: 0,        // reduced-motion fallback
  fast: 0.15,
  normal: 0.2,
  moderate: 0.3,
  slow: 0.5,
};

// Stagger config
export const STAGGER = {
  perElementMs: 30,  // ms per element
  maxMs: 300,        // cap total stagger delay
};
```

### 4.2 `reduced-motion.js` — Centralized Accessibility

```js
import { useReducedMotion } from 'framer-motion';
import { DURATIONS } from './config';

/**
 * Centralized reduced-motion config. Replaces pattern:
 *   const prefersReducedMotion = useReducedMotion();
 *   const duration = prefersReducedMotion ? 0 : 0.3;
 * Used in 14+ components — this eliminates all duplication.
 */
export function useReducedMotionConfig() {
  const prefersReducedMotion = useReducedMotion();

  return {
    prefersReducedMotion,
    duration: (ms = DURATIONS.moderate) =>
      prefersReducedMotion ? DURATIONS.instant : ms,
    transition: (type = 'spring', ms = DURATIONS.moderate) =>
      prefersReducedMotion
        ? { type: 'tween', duration: DURATIONS.fast, ease: 'easeOut' }
        : { type, ...(type === 'spring' ? SPRINGS.bouncy : {}), duration: ms },
    shouldAnimate: !prefersReducedMotion,
  };
}
```

### 4.3 `animate.js` — Interruptible Animation

```js
import { animate as fmAnimate } from 'framer-motion';
import { useReducedMotionConfig } from './reduced-motion';
import { EASINGS, DURATIONS } from './config';

// WeakMap: element → in-flight animation handle (for interruptibility)
const activeAnimations = new WeakMap();

/**
 * Imperative animate() with interruptibility.
 * Cancels any in-flight animation on the same element before starting new one.
 */
export function animateElement(element, keyframes, options = {}) {
  const {
    duration = DURATIONS.moderate,
    easing = EASINGS.easeOut,
    onComplete,
    interruptible = true,
  } = options;

  // Cancel in-flight animation if interruptible
  if (interruptible && activeAnimations.has(element)) {
    const current = activeAnimations.get(element);
    current.stop?.();
  }

  // If reduced-motion: skip to target state instantly
  const motionConfig = useReducedMotionConfig(); // Note: only usable in React context

  const handle = fmAnimate(element, keyframes, {
    duration,
    ease: easing,
    onComplete: () => {
      activeAnimations.delete(element);
      onComplete?.();
    },
  });

  activeAnimations.set(element, handle);
  return handle;
}

/**
 * React hook wrapping animateElement with reduced-motion awareness.
 */
export function useAnimateElement() {
  const { duration, shouldAnimate } = useReducedMotionConfig();

  return useCallback((element, keyframes, options = {}) => {
    if (!shouldAnimate) {
      // Instantly apply target state
      Object.assign(element.style, keyframes[keyframes.length - 1]);
      options.onComplete?.();
      return null;
    }
    return animateElement(element, keyframes, {
      ...options,
      duration: options.duration ?? duration(),
    });
  }, [shouldAnimate, duration]);
}
```

### 4.4 `stagger.js` — Multi-Element Sequence

```js
import { STAGGER, SPRINGS, DURATIONS } from './config';
import { useReducedMotionConfig } from './reduced-motion';

/**
 * Generate staggered variant config for Framer Motion.
 * Replaces hand-rolled `staggerChildren` in BookshelfGrid & useSortAnimation.
 */
export function staggerConfig(options = {}) {
  const {
    perElementMs = STAGGER.perElementMs,
    maxMs = STAGGER.maxMs,
    spring = SPRINGS.bouncy,
  } = options;

  return {
    staggerChildren: perElementMs / 1000,
    ...(spring ? {} : {}),
  };
}

/**
 * Generate per-element transition with stagger delay.
 * Replaces useSortAnimation's getTransition(index) pattern.
 */
export function staggerTransition(index, options = {}) {
  const {
    perElementMs = STAGGER.perElementMs,
    maxMs = STAGGER.maxMs,
    spring = SPRINGS.bouncy,
  } = options;

  const delay = Math.min(index * perElementMs, maxMs) / 1000;
  return { type: 'spring', ...spring, delay };
}

/**
 * React hook for stagger with reduced-motion support.
 */
export function useStagger(options = {}) {
  const { prefersReducedMotion, transition } = useReducedMotionConfig();

  const containerVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerConfig(options).staggerChildren },
        },
      };

  const itemVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      };

  const getTransition = useCallback(
    (index) =>
      prefersReducedMotion
        ? { type: 'tween', duration: DURATIONS.fast, ease: 'easeOut' }
        : staggerTransition(index, options),
    [prefersReducedMotion, options],
  );

  return { containerVariants, itemVariants, getTransition };
}
```

### 4.5 `visibility.js` — Tab Backgrounding Guard

```js
import { useEffect, useRef } from 'react';

/**
 * Pauses animations when tab is backgrounded, resumes when foregrounded.
 * Uses document.visibilitychange API per STORY-039 AC.
 */
export function useVisibilityGuard(onPause, onResume) {
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);
  onPauseRef.current = onPause;
  onResumeRef.current = onResume;

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        onPauseRef.current?.();
      } else {
        onResumeRef.current?.();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}

/**
 * Hook that returns true when app is backgrounded.
 * Components can use this to skip animation triggers while hidden.
 */
export function useIsBackgrounded() {
  const [isBackgrounded, setIsBackgrounded] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsBackgrounded(document.hidden);
    }
    document.addEventListener('visibilitychange', handleChange);
    return () => document.removeEventListener('visibilitychange', handleChange);
  }, []);

  return isBackgrounded;
}
```

### 4.6 `variants.js` — Pre-built Variant Factories

```js
import { EASINGS, DURATIONS } from './config';

/** Overlay: backdrop fade + panel scale (used by CoverOverlay, PulledOutOverlay, etc.) */
export function overlayVariants(reducedMotion = false) {
  const d = reducedMotion ? DURATIONS.instant : DURATIONS.fast;
  return {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: d },
    },
    panel: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: reducedMotion ? DURATIONS.instant : DURATIONS.normal, ease: EASINGS.easeOut },
    },
  };
}

/** Slide: direction-aware slide (used by PageTurnAnimation, ChapterDrawer, ReaderSettings) */
export function slideVariants(direction = 1, reducedMotion = false) {
  const d = reducedMotion ? 0 : 1;
  return {
    initial: { x: direction * 100 * d, opacity: reducedMotion ? 1 : 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -direction * 100 * d, opacity: reducedMotion ? 1 : 0 },
    transition: { duration: reducedMotion ? DURATIONS.instant : DURATIONS.moderate, ease: EASINGS.easeOut },
  };
}

/** Fade: simple opacity fade (fade-up by default) */
export function fadeVariants(reducedMotion = false) {
  const y = reducedMotion ? 0 : 8;
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reducedMotion ? DURATIONS.instant : DURATIONS.fast },
  };
}
```

### 4.7 App Root — LazyMotion Wrapper

```jsx
// App.jsx or main entry
import { LazyMotion, domAnimation } from 'framer-motion';

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <RouterProvider router={router} />
    </LazyMotion>
  );
}
```

> **Bundle impact**: Switching from `<motion.div>` to `<m.div>` + `LazyMotion` reduces initial bundle by ~15KB. Components that need `layout` or `drag` (BookSpine, BookshelfGrid) will lazy-load `domMax`.

---

## 5. Acceptance Criteria Traceability

| AC | Implementation | Test Coverage |
|----|---------------|---------------|
| AC1: Animation with duration+easing completes | `animateElement()` + config presets | `animate.test.js` — verify frame completion |
| AC2: Interrupt mid-flight → clean cancel + new start | `WeakMap` animation registry in `animate.js` | `animate.test.js` — cancel in-flight, verify no glitch |
| AC3: `prefers-reduced-motion` → instant + fade | `useReducedMotionConfig()` centralizes all checks; `duration()` returns 0 | `reduced-motion.test.js` — mock `useReducedMotion=true`, verify instant |
| AC4: Stagger 10 elements × 30ms | `useStagger()` + `staggerConfig()` + `staggerTransition()` | `stagger.test.js` — verify delay per index, cap at 300ms |
| AC5: Backgrounded tab → pause/resume | `useVisibilityGuard()` + `useIsBackgrounded()` | `visibility.test.js` — simulate visibilitychange, verify callback |

---

## 6. NFR Analysis

| NFR ID | Requirement | Implementation | Verification |
|--------|-------------|----------------|--------------|
| NFR-PERF-04 | Engine overhead < 1ms per frame | `LazyMotion` tree-shaking; `WeakMap` for O(1) lookups; no per-frame React re-renders (imperative `animate()`) | Browser Performance panel profiling |
| NFR-ACC-05 | Automatic reduced-motion detection | `useReducedMotionConfig()` — single source of truth, all components route through it | Unit test + visual audit |
| NFR-ACC-05 | `prefers-reduced-motion` media query | Framer Motion `useReducedMotion` hook under the hood; `matchMedia` event listener active | Integration test with `prefers-reduced-motion: reduce` |

---

## 7. Persona Impact — Julia (Young Author)

| Concern | Impact | Mitigation |
|---------|--------|------------|
| Physical bookshelf metaphor (pull, open, turn) | Engine must support drag gestures + layout FLIP | Framer Motion `layout` + `drag` — already proven in spike |
| Mid-range device performance (family tablets) | `LazyMotion` + `domAnimation` = 17KB initial; imperative `animate()` avoids re-renders | Performance profiling on Moto G4 class device |
| Vestibular sensitivity (reduced-motion) | Centralized detection; instant-fallback; no per-story manual checks | AC3 verification; no component bypasses engine |
| Tab-switching during animations | Visibility guard preserves state; no jarring resume | AC5 verification |

---

## 8. Impacted Components

| File | Change Type | Detail |
|------|------------|--------|
| `frontend/src/lib/animation/` | **New** | Entire animation engine module (6 files) |
| `frontend/src/App.jsx` | **Modify** | Add `<LazyMotion>` wrapper |
| `frontend/src/hooks/useSortAnimation.js` | **Refactor** | Delegate to `useStagger()` from engine |
| `frontend/src/hooks/usePulledOutBook.js` | **Refactor** | Use `useReducedMotionConfig()` from engine |
| `frontend/src/components/shelf/BookshelfGrid.jsx` | **Refactor** | Replace inline variants with engine `useStagger()` |
| `frontend/src/components/shelf/CoverOverlay.jsx` | **Refactor** | Remove `EASE_OUT` constant → import from `config.js` |
| `frontend/src/components/shelf/PulledOutOverlay.jsx` | **Refactor** | Remove `EASE_OUT` constant → import from `config.js` |
| `frontend/src/components/reader/PageTurnAnimation.jsx` | **Refactor** | Use `slideVariants()` from engine; remove inline easing |
| `frontend/src/components/common/ErrorToast.jsx` | **Bug fix** | Replace raw `matchMedia` with `useReducedMotionConfig()` |
| `frontend/src/lib/animation/__tests__/` | **New** | 6 test files for engine modules |

---

## 9. Execution Flow

```mermaid
flowchart TD
    T0["Task 0: Code Analysis<br/>(CodeAnalyzer)"] --> T0b["Task 0b: Tech Analysis Doc<br/>(Architect — this file)"]
    T0b --> T1["Task 1: TechLead Coordination<br/>(TechLead)"]
    T1 --> T2a["Task 2a: Config + Reduced-motion<br/>(BackendDeveloper)"]
    T1 --> T2b["Task 2b: Visibility Guard<br/>(BackendDeveloper)"]
    T2a --> T3a["Task 3a: Animate + Stagger<br/>(BackendDeveloper)"]
    T2b --> T3a
    T2a --> T3b["Task 3b: Variant Factories<br/>(BackendDeveloper)"]
    T2b --> T3b
    T3a --> T4["Task 4: App.jsx LazyMotion + Refactors<br/>(FrontendDeveloperReact)"]
    T3b --> T4
    T4 --> T5["Task 5: Test Suites<br/>(TestEngineer)"]
    T5 --> T6["Task 6: QA Validation<br/>(QAAnalyst)"]
    T6 --> T7["Task 7: Code Review<br/>(CodeReviewer)"]
    T7 --> T8["Task 8: Merge Request<br/>(MergeRequestCreator)"]
```

**Rationale**: Tasks 2a/2b can run in parallel (no shared state). Task 3a depends on both 2a and 2b. Task 3b depends on 2a (config). Task 4 depends on 3a+3b (all engine modules must exist before refactoring consumers).

---

## 10. Refactoring Strategy

This story also **refactors existing components** to consume the engine. Strategy:

1. **Phase 1 — Build engine** (Tasks 2a, 2b, 3a, 3b): All 6 modules in `lib/animation/`
2. **Phase 2 — Wire engine** (Task 4): `App.jsx` LazyMotion wrapper + refactor key consumers
3. **Priority refactors** (in Task 4):
   - `useSortAnimation.js` → delegate to `useStagger()`
   - `CoverOverlay.jsx` + `PulledOutOverlay.jsx` → centralize `EASE_OUT`
   - `ErrorToast.jsx` → fix `matchMedia` inconsistency bug
   - `BookshelfGrid.jsx` → use engine `staggerConfig()`
4. **Deferred refactors** (STORY-040+): Reader components, Editor components — progressively adopt engine in their respective stories

---

## 11. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| `LazyMotion strict` breaks `<motion.div>` in components not yet migrated to `<m.div>` | Medium | High | Phase migration: keep `<motion.div>` import for unmigrated components; only `<m.div>` in new code |
| `WeakMap` animation handles leak if `onComplete` never fires | Low | Medium | `onComplete` always fires in FM; add cleanup in `useEffect` returns |
| Reduced-motion fallback feels "instant" with no feedback | Low | Medium | AC3 says "instant with fade" — add `opacity: 0 → 1` tween at 150ms as fade |
| `visibilitychange` fires unpredictably on mobile browsers | Medium | Low | Guard against rapid state flipping; debounce 100ms in `useVisibilityGuard` |
| Stagger delay cap (300ms) too aggressive/restrictive | Low | Low | Configurable via `staggerConfig({ maxMs: ... })` |

---

## 12. Language & Framework Detection

| Indicator | Detected |
|-----------|---------|
| `package.json`, `vite.config.*`, `.jsx` files | **Node.js** + React |
| `react` in deps, `.jsx` files | **React** → FrontendDeveloperReact |
| `framer-motion` in deps | Animation engine confirmed |
| No Python/C build files | — |

**Frontend-Backend Integration**: N/A — this story is frontend-only (no API changes).

### SubAgent Assignments

| Task | Description | Agent |
|------|-------------|-------|
| 0 | Code analysis (existing FM usage inventory) | CodeAnalyzer ✅ (completed) |
| 0b | Technical analysis document | Architect ✅ (this file) |
| 1 | Coordination | TechLead |
| 2a | Config + Reduced-motion modules | FrontendDeveloperReact |
| 2b | Visibility Guard module | FrontendDeveloperReact |
| 3a | Animate + Stagger modules | FrontendDeveloperReact |
| 3b | Variant Factories module | FrontendDeveloperReact |
| 4 | App.jsx LazyMotion + Refactor consumers | FrontendDeveloperReact |
| 5 | Test suites (6 test files) | TestEngineer |
| 6 | QA validation | QAAnalyst |
| 7 | Code review | CodeReviewer |
| 8 | Merge request | MergeRequestCreator |

---

## 13. Parallelization Rules

- **2a + 2b**: CAN run in parallel (no shared state between config/variants and visibility guard)
- **3a + 3b**: MUST be sequential after 2a+2b (animate depends on config; variants depends on config)
- **4**: MUST wait for 3a+3b (refactors require all engine modules)
- **5 → 6 → 7 → 8**: MUST be sequential (tests before QA, QA before review, review before merge)

---

## 14. Definition of Done Checklist

- [x] Code analysis completed
- [x] Technical analysis document saved
- [ ] LazyMotion wrapper added to App.jsx
- [ ] All 6 engine modules implemented (`config`, `reduced-motion`, `visibility`, `animate`, `stagger`, `variants`)
- [ ] `useSortAnimation` refactored to delegate to engine
- [ ] `EASE_OUT` duplication eliminated (CoverOverlay, PulledOutOverlay, PageTurnAnimation)
- [ ] `ErrorToast.jsx` inconsistency bug fixed (matchMedia → useReducedMotionConfig)
- [ ] Test coverage ≥ 90% on all engine modules
- [ ] Integration tests passing (AC1–AC5)
- [ ] QA approved by QAAnalyst
- [ ] Documentation updated (engine API docs)
- [ ] PR created by MergeRequestCreator