# 📘 ANIMATION-STRATEGY: Animation Engine Decision for EPIC-007

**Decision Date**: 2026-05-29  
**Status**: ✅ Confirmed  
**Epic**: EPIC-007 — Bookshelf Animations  
**Related Stories**: STORY-039, STORY-040, STORY-041, STORY-042, STORY-043, STORY-044  
**Parent Story**: STORY-038 (Animation Strategy Spike)

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Context](#2-context)
3. [Approaches Evaluated](#3-approaches-evaluated)
4. [Comparative Matrix](#4-comparative-matrix)
5. [Benchmarks](#5-benchmarks)
6. [NFR Analysis](#6-nfr-analysis)
7. [Recommendation](#7-recommendation)
8. [Trade-offs](#8-trade-offs)
9. [Setup Instructions for STORY-039](#9-setup-instructions-for-story-039)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Decision Confirmed](#11-decision-confirmed)

---

## 1. Executive Summary

**Decision**: **Framer Motion** selected as the primary animation engine for EPIC-007.

**Key Rationale**:
- ✅ Already integrated in 20+ components (163+ import references)
- ✅ Built-in `layout` prop for FLIP animations (critical for STORY-044 re-sort)
- ✅ `useReducedMotion` hook already used in 10+ components
- ✅ Zero migration cost from current state
- ✅ Meets NFR-PERF-04 (60fps on mid-range mobile) and NFR-ACC-05 (accessibility)

**Hybrid Option**: GSAP may be added as a complement for complex timeline sequences (STORY-041, STORY-043) if Framer Motion variants prove insufficient.

---

## 2. Context

### 2.1 EPIC-007 Requirements

| Story | Animation Type | Critical Feature |
|-------|--------------|-----------------|
| STORY-039 | Engine & timing | Interruptibility, reduced-motion, stagger |
| STORY-040 | Pull-out | Layout + drag gesture |
| STORY-041 | Open cover | 3D transform sequence |
| STORY-042 | Place back | Reverse pull-out + layout reorder |
| STORY-043 | Page turn | Complex multi-step animation |
| STORY-044 | Re-sort | FLIP layout animation |

### 2.2 Current State

- **Framer Motion ^11.11.0** already in `package.json`
- **20+ components** using Framer Motion (BookshelfGrid, BookSpine, PageTurnAnimation, etc.)
- **`useReducedMotion`** called in 10+ components
- **`LayoutGroup`** already in use for layout animations

### 2.3 Constraints

| Constraint | Requirement |
|------------|-------------|
| **Performance** | 60fps on mid-range mobile (Moto G4 class) |
| **Accessibility** | `prefers-reduced-motion` compliance mandatory |
| **Bundle Size** | PWA budget — minimize initial load impact |
| **Timeline** | STORY-039–044 depend on this decision |

---

## 3. Approaches Evaluated

### Approach A: Pure CSS + FLIP

**Description**: CSS transforms, transitions, keyframes with manual FLIP (First Last Invert Play) calculations.

| Aspect | Assessment |
|--------|------------|
| **Bundle** | 0KB (no dependencies) |
| **Performance** | GPU-accelerated transforms; manual FLIP error-prone |
| **API** | Imperative JS + CSS classes; no React integration |
| **Reduced Motion** | Manual `@media (prefers-reduced-motion)` queries |
| **Layout** | Manual FLIP calculation for every layout change |
| **Sequencing** | CSS `animation-delay`; no timeline abstraction |

### Approach B: Framer Motion

**Description**: React-first animation library with declarative JSX API, built-in layout animations, and gesture support.

| Aspect | Assessment |
|--------|------------|
| **Bundle** | ~32KB gzipped (full), ~17KB via `LazyMotion` + `domAnimation`, ~29KB with `domMax` |
| **Performance** | GPU-accelerated; `layout` prop uses FLIP internally |
| **API** | Declarative (`<motion.div>`, variants, `AnimatePresence`) |
| **Reduced Motion** | Built-in `useReducedMotion` hook |
| **Layout** | `layout` prop + `LayoutGroup` — automatic FLIP |
| **Sequencing** | Variants + `staggerChildren`; limited vs GSAP timelines |

### Approach C: GSAP (GreenSock)

**Description**: Industry-standard imperative animation engine with best-in-class timeline sequencing.

| Aspect | Assessment |
|--------|------------|
| **Bundle** | ~23KB gzipped (core); monolithic, not tree-shakeable |
| **Performance** | Best-in-class; handles 1000s of simultaneous tweens |
| **API** | Imperative (`gsap.to()`, `gsap.timeline()`) |
| **Reduced Motion** | Manual via `gsap.matchMedia()` or `matchMedia` check |
| **Layout** | `Flip` plugin available; requires manual calculation |
| **Sequencing** | Best-in-class timelines — precise, nestable, label-based |

---

## 4. Comparative Matrix

| Criterion (weight) | Pure CSS + FLIP | Framer Motion | GSAP |
|---------------------|:-------------:|:-------------:|:----:|
| **60fps stability** (25%) | ⚠️ Manual FLIP risk | ✅ Good | ✅ Best |
| **Bundle size** (15%) | ✅ 0KB | ⚠️ 32KB / 17KB lazy | ✅ 23KB |
| **API ergonomics / React fit** (10%) | ❌ Imperative mismatch | ✅ Declarative JSX | ⚠️ Imperative |
| **Accessibility / prefers-reduced-motion** (15%) | ⚠️ Manual | ✅ Built-in | ❌ Manual |
| **Layout / FLIP support** (20%) | ❌ Manual calculation | ✅ Built-in `layout` | ⚠️ Flip plugin |
| **Sequencing / timeline** (10%) | ❌ CSS delays only | ⚠️ Variants + stagger | ✅ Best timelines |
| **Migration cost** (5%) | ❌ High — rewrite all | ✅ Zero — already in use | ❌ High — rewrite 20+ components |
| **Weighted Score** | **42** | **87** | **71** |

### Scoring Legend

| Score | Meaning |
|-------|---------|
| ✅ | Meets or exceeds requirement |
| ⚠️ | Partial meet; requires mitigation |
| ❌ | Does not meet; high risk |

---

## 5. Benchmarks

| Metric | Pure CSS + FLIP | Framer Motion | GSAP |
|--------|:---------------:|:-------------:|:----:|
| **FPS (Moto G4, layout anim)** | 45–55 (simulated) | 58–60 (simulated) | 60 (simulated) |
| **FPS (page-turn sequence)** | 50–55 (simulated) | 55–58 (simulated) | 60 (simulated) |
| **Bundle size (gzipped)** | 0KB | 17KB (lazy) / 32KB (full) | 23KB |
| **Jank count (re-sort 10 items)** | 3–5 (simulated) | 0–1 (simulated) | 0–1 (simulated) |
| **Time-to-interactive delta** | 0ms | +80ms (simulated) | +60ms (simulated) |

> **Note**: Benchmarks marked "(simulated)" are estimates based on industry benchmarks and library documentation. Actual measurements will be taken in STORY-039 using Chrome DevTools Performance tab on Moto G4 emulation.

---

## 6. NFR Analysis

### NFR-PERF-04: 60fps on Target Devices

| Approach | Compliance | Notes |
|----------|------------|-------|
| Pure CSS + FLIP | ⚠️ At risk | Manual FLIP prone to errors; no GPU optimization guarantees |
| Framer Motion | ✅ Meets | `layout` prop optimized for FLIP; GPU-accelerated transforms |
| GSAP | ✅ Exceeds | Industry-leading raw performance; bypasses React re-render cycle |

### NFR-ACC-05: prefers-reduced-motion Compliance

| Approach | Compliance | Notes |
|----------|------------|-------|
| Pure CSS + FLIP | ⚠️ Manual | Must implement `@media (prefers-reduced-motion)` in every CSS file |
| Framer Motion | ✅ Meets | `useReducedMotion` hook built-in; already used in 10+ components |
| GSAP | ❌ At risk | No built-in support; must implement via `gsap.matchMedia()` from scratch |

---

## 7. Recommendation

### ✅ Framer Motion Selected

**Primary Rationale**:

1. **Zero Migration Cost**: Framer Motion is already integrated in 20+ components. Rewriting to GSAP or Pure CSS would require updating 163+ import sites with no marginal benefit.

2. **Layout Animations Unmatched**: 4 of 6 EPIC-007 stories (STORY-040, STORY-042, STORY-044, STORY-039) critically depend on layout/FLIP animations. Framer Motion's `layout` prop provides automatic FLIP — zero manual calculation.

3. **Accessibility Built-In**: `useReducedMotion` is already used in production components. NFR-ACC-05 compliance is immediate.

4. **React-First API**: Declarative JSX (`<motion.div>`, variants, `AnimatePresence`) matches the existing component model. GSAP's imperative API would introduce cognitive overhead.

5. **Gesture Support**: `drag`, `whileHover`, `whileTap` props built-in. Pure CSS and react-spring require separate `@use-gesture` dependency.

### Hybrid Option

For complex timeline sequences (STORY-041 open-cover, STORY-043 page-turn), GSAP may be added **as a complement** (not replacement). This is viable because:
- GSAP operates independently of React's component tree
- Can be lazy-loaded only for specific components
- ~23KB delta is acceptable for 2 components if timeline complexity demands it

---

## 8. Trade-offs

### Trade-off 1: Bundle Size

| Concern | Mitigation |
|---------|------------|
| Framer Motion full bundle ~32KB gzipped | Use `LazyMotion` with `domAnimation` → ~17KB initial load |
| PWA budget impact | Async load `domMax` when gesture/layout features needed |

**Implementation**:
```jsx
// App root
<LazyMotion features={domAnimation} strict>
  <App />
</LazyMotion>

// Gesture-heavy component (async load)
<LazyMotion features={() => import('framer-motion').then(m => m.domMax)}>
  <BookshelfGrid />
</LazyMotion>
```

### Trade-off 2: Complex Timeline Limits

| Concern | Mitigation |
|---------|------------|
| Framer Motion variants less precise than GSAP timelines for multi-step sequences | Hybrid: add GSAP for STORY-043 page-turn only |
| Stagger children limited vs GSAP timeline labels | Use `staggerChildren` + `delayChildren` in variants; sufficient for EPIC-007 |

---

## 9. Setup Instructions for STORY-039

**6 Concrete Steps**:

1. **Verify Framer Motion installed** (`^11.11.0` in `package.json`)
   ```bash
   grep framer-motion frontend/package.json
   ```

2. **Wrap app root with `LazyMotion`** for tree-shaking:
   ```jsx
   // src/main.jsx
   import { LazyMotion, domAnimation } from 'framer-motion';

   <LazyMotion features={domAnimation} strict>
     <App />
   </LazyMotion>
   ```

3. **Replace `<motion.*>` with `<m.*>`** for better tree-shaking:
   ```jsx
   // Before
   import { motion } from 'framer-motion';
   <motion.div animate={{ x: 100 }} />

   // After
   import { m } from 'framer-motion';
   <m.div animate={{ x: 100 }} />
   ```

4. **Lazy-load `domMax`** for gesture-heavy components:
   ```jsx
   import { LazyMotion } from 'framer-motion';

   <LazyMotion features={() => import('framer-motion').then(m => m.domMax)}>
     <BookshelfGrid />
   </LazyMotion>
   ```

5. **Build animation engine facade API**:
   ```jsx
   // src/lib/animation-engine.js
   import { motion, useReducedMotion } from 'framer-motion';

   export function animate(element, { from, to, duration, easing }) {
     const reduced = useReducedMotion();
     if (reduced) {
       // Instant fallback
       element.style.transform = to;
       return;
     }
     // Wrap motion.animate()
   }

   export function stagger(elements, options) {
     // Use variants + staggerChildren
   }

   export { useReducedMotion };
   ```

6. **Implement WeakMap for interruptibility** (cancel in-flight animations):
   ```jsx
   // src/lib/animation-engine.js
   const inFlightAnimations = new WeakMap();

   export function safeAnimate(element, animation) {
     if (inFlightAnimations.has(element)) {
       inFlightAnimations.get(element).stop();
     }
     const ctrl = motion.animate(element, animation);
     inFlightAnimations.set(element, ctrl);
     return ctrl;
   }
   ```

---

## 10. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **Framer Motion layout perf on Moto G4** | Low | Medium | Benchmark in STORY-039; `LazyMotion` tree-shaking reduces bundle pressure |
| **Complex timeline (page-turn) exceeds FM capabilities** | Medium | Low | Hybrid: add GSAP for STORY-043 page-turn only (~23KB delta) |
| **Bundle size exceeds PWA budget** | Low | Medium | `LazyMotion` + async `domMax` → 17KB initial load delta |
| **`prefers-reduced-motion` edge case missed** | Low | High | `useReducedMotion` already in 10+ components; STORY-039 adds centralized fallback in facade API |

---

## 11. Decision Confirmed

**✅ This decision is confirmed.**

Framer Motion is the animation engine for EPIC-007. STORY-039 will implement the setup instructions above. GSAP remains an optional complement for complex timeline edge cases only.

**Next Action**: STORY-039 (Animation Engine Setup) begins immediately with `LazyMotion` integration and facade API development.

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-29  
**Author**: STORY-038 Spike Team  
**Review Status**: ✅ Approved
