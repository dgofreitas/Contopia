# STORY-039: Animation Engine & Timing System

**Epic**: EPIC-007
**Persona**: Julia — The Young Author
**Priority**: Should Have
**Story Points**: 5
**Dependencies**: STORY-038 (Animation Spike)

## User Story
As the development team, I want a reusable animation engine that manages timing, easing, and interruptibility across all shelf and reader animations, so that every interaction feels consistent and performant.

## Description
Build a shared animation engine based on the technology chosen in STORY-038. The engine must support: (1) configurable duration and easing per animation, (2) interruptibility (start a new animation mid-flight without glitching), (3) `prefers-reduced-motion` detection with automatic fallback to instant transitions, (4) stagger/timeline support for multi-element sequences, and (5) pause when the app is backgrounded. The engine is used by all subsequent EPIC-007 stories.

## Context
Without a centralized animation engine, each story would implement ad-hoc transitions, leading to inconsistency, bugs, and difficulty respecting accessibility. This story delivers a lean, shared utility. It does NOT implement specific animations (pull-out, page-turn, etc.) — those come in STORY-040 through STORY-044.

## Acceptance Criteria (Verifiable)
- [ ] GIVEN the animation engine is initialized
      WHEN an animation is registered with duration and easing
      THEN it executes to completion with the specified parameters
- [ ] GIVEN an animation is mid-flight
      WHEN a new animation for the same element is triggered
      THEN the in-flight animation is cancelled cleanly and the new one starts without visual jump
- [ ] GIVEN the device has `prefers-reduced-motion: reduce` enabled
      WHEN any animation is triggered
      THEN the engine skips motion and applies the target state instantly with a fade
- [ ] GIVEN a stagger animation is defined with 10 elements and 30ms delay per element
      WHEN triggered
      THEN elements animate sequentially with the specified stagger
- [ ] GIVEN the app tab is backgrounded during an animation
      WHEN the browser pauses rendering
      THEN animation state is preserved and resumes correctly when the tab is focused

## NFRs
- NFR-PERF-04: Engine overhead <1ms per animation frame
- NFR-ACC-05: Automatic reduced-motion detection; no per-story manual checks needed
- NFR-ACC-05: Engine respects `prefers-reduced-motion` media query

## Definition of Done (DoD)
- [ ] Code reviewed by CodeReviewer
- [ ] Tests with coverage >= 90%
- [ ] Integration tests passing
- [ ] QA approved by QAAnalyst
- [ ] Documentation updated
- [ ] PR created by MergeRequestCreator

## Technical Notes
- Engine API (suggested):
  ```ts
  animate(element, { from, to, duration, easing, onComplete, interruptible: true })
  stagger(elements, { perElement, ...options }) // returns array of animations
  ```
- Use `document.visibilitychange` to pause/resume
- Use `matchMedia('(prefers-reduced-motion: reduce)')` for accessibility detection
- Store animation handles in a WeakMap keyed by element for interruptibility
- Default easings: `ease-out` for entrances, `anticipate`/spring for playful interactions
- If Framer Motion chosen: wrap its `AnimatePresence` and `motion` with a facade matching the API above
- If CSS chosen: use `Web Animations API` (`element.animate()`) for programmatic control

## User Flow
```mermaid
flowchart TD
    A[Component calls animate()] --> B{Reduced Motion?}
    B -->|Yes| C[Apply target state instantly + fade]
    B -->|No| D[Register animation in engine]
    D --> E[Run animation over duration]
    E --> F[on: Visibility Change?]
    F -->|Backgrounded| G[Pause animation]
    F -->|Foregrounded| H[Resume from paused state]
    E --> I[on: Complete → Fire callback]
    D --> J[on: Interrupt → Cancel current, start new]
```

## Test Scenarios
- Scenario 1: Basic animation runs to completion with correct duration
- Scenario 2: Interrupt mid-flight — old animation cancelled, new one starts cleanly
- Scenario 3: Reduced motion active — instant transition, no animation frames fired
- Scenario 4: Stagger: 5 elements at 50ms delay each — total time ~ duration + 200ms
