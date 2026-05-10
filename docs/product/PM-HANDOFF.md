# PM Handoff — Estante Digital

## 📋 Ready for Story Decomposition

The following epics have been defined, prioritized, and documented. They are ready for the ProductManager (or equivalent) to decompose into user stories, acceptance criteria, and sprint backlog items.

---

## 🎯 Epics Ready for Decomposition

| Epic | Priority | Estimate | Target Release | Decomposition Hint |
|------|----------|----------|----------------|---------------------|
| **EPIC-010** | Must Have | XL | MVP | **Start here.** Split by domain: auth/onboarding, data model, API, storage, DevOps. One spike for auth strategy. |
| **EPIC-001** | Must Have | M | MVP | Split by viewport (mobile, tablet, desktop), by state (populated, empty, loading), and by interaction (tap-pull, tap-cover, place-back). |
| **EPIC-003** | Must Have | L | MVP | Split by lifecycle: create book, write chapter, publish, edit existing. Split editor: toolbar, text area, chapter sidebar, autosave. |
| **EPIC-002** | Must Have | M | MVP | Split by reading mode (paginated, continuous, chapter list), settings (font, theme, progress), and source (original vs imported). |
| **EPIC-004** | Must Have | M | MVP | Split by design element (cover, spine, edge) and input method (template, color, sticker, upload). One story for asset pipeline. |
| **EPIC-006** | Should Have | S | MVP | Split by sort type (alphabetical, favorites, recently read) and by interaction (sort menu, favorite toggle, persistence). |
| **EPIC-007** | Should Have | M | MVP | Split by animation type (pull-out, open-cover, place-back, re-sort, page-turn) and by system (animation engine, reduced-motion, perf testing). |
| **EPIC-005** | Should Have | M | V1.1 | Split by file format (TXT, PDF, EPUB) and pipeline (upload, parse, extract cover, shelf placement). One spike for parsing libs. |
| **EPIC-008** | Could Have | L | V1.1 | Split by capability (offline reading, offline writing, sync engine) and by layer (Service Worker, local data store, conflict resolution, UI indicators). |
| **EPIC-009** | Could Have | M | V1.1 | Split by feature: login, activity view, data export, account deletion, privacy policy. Split by compliance: GDPR access, GDPR deletion, COPPA consent. |

---

## ✅ Recommended Implementation Order

### Phase 1: Foundation (Sprint 1–3)
1. **EPIC-010** — Platform Foundation  
   *Cannot be parallelized with other epics; all work depends on this.*

### Phase 2: Core Experience (Sprint 3–6)
2. **EPIC-001** — Digital Bookshelf Core  
3. **EPIC-003** — Book Writing & Editing  
4. **EPIC-004** — Cover, Spine & Edge Designer  
5. **EPIC-002** — Book Reading Experience  
   *Parallelize 001/003/004 as much as possible; 002 depends on 001.*

### Phase 3: Delight & Organization (Sprint 6–7)
6. **EPIC-007** — Animations & Delight  
7. **EPIC-006** — Shelf Organization & Sorting  
   *Can be developed in parallel with Phase 2 if capacity allows; enriches but doesn't block MVP.*

### Phase 4: Expansion (Sprint 7–10)
8. **EPIC-005** — Book Import System  
9. **EPIC-008** — Offline Writing & Reading  
10. **EPIC-009** — Parent Dashboard & Safety  
   *Import can start after MVP shelf and reader are stable. Offline and Parent Dashboard can be parallel.*

---

## 📐 Constraints for ProductManager

### Scope Constraints
- **MVP scope = Must Have epics only (EPIC-001, 002, 003, 004, 010).**
- **Should Have (EPIC-006, 007)** may be included in MVP sprints if capacity permits, but they must not delay the Must-Haves.
- **Could Have (EPIC-005, 008, 009)** are explicitly **deferred to V1.1** unless user research or beta feedback elevates them.

### Story Sizing
- **Max story size: 8 story points** (or equivalent).
- If a decomposition yields a story >8 points, split it further (by persona, by CRUD operation, by viewport, by state).

### Quality Bars
- **Every story must reference a Persona** defined in `docs/product/PERSONAS.md`.
- **Every story must link to its parent EPIC-XXX** in the story description.
- **Every story must satisfy relevant NFRs** from `docs/product/NFRS.md`.
- **No story may introduce public social features** — this is a Won't Have per VISION.md.

### Definition of Ready (DoR) for Stories
Before a story is accepted into a sprint backlog, it must have:
- [ ] Clear title and user-centric description.
- [ ] Referenced persona(s).
- [ ] Referenced parent epic.
- [ ] Acceptance criteria (GIVEN-WHEN-THEN format preferred).
- [ ] NFRs identified and testable.
- [ ] UI/UX reference or wireframe (if user-facing).
- [ ] Dependencies on other stories identified.

### Definition of Done (DoD) for Stories
- [ ] Code reviewed and merged.
- [ ] Unit tests passing.
- [ ] QA tested on target devices (mobile, tablet, desktop).
- [ ] Accessibility checked (WCAG AA for core flows).
- [ ] Security review (input validation, no secrets).
- [ ] PO acceptance.

---

## 🚫 Out of Scope (Do NOT Create Stories For)

| Excluded Feature | Reason | Future Possibility |
|------------------|--------|-------------------|
| Public social features | Violates product vision (safe, private space) | Never (core differentiator) |
| Marketplace / paid books | Out of vision; no monetization model defined | V2.0+ only if strategy changes |
| School LMS integration | Not a school tool; out of vision | Never (or partner integration) |
| Real-time collaboration | No multi-user editing planned | V2.0+ (private co-authoring) |
| AI-generated stories | Unnecessary complexity; not user-requested | Won't Have |
| 3D WebGL bookshelf | Performance risk; CSS sufficient | Won't Have |
| Video/animated covers | Performance and accessibility concerns | Won't Have |
| DOCX/Word import | Complex formatting mapping; low priority | V1.2+ if requested |
| Text-to-speech | Requires audio infrastructure | V1.2+ |
| Freehand drawing in cover designer | Canvas complexity | V1.2+ |
| In-app parent-to-child messaging | Overcomplicates product | V2.0+ if requested |

---

## 📚 Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Vision | `docs/product/VISION.md` | Why we exist, strategic pillars, anti-vision |
| Personas | `docs/product/PERSONAS.md` | Who we serve, JTBD, pains, gains |
| OKRs | `docs/product/OKRS.md` | What success looks like; metrics |
| Roadmap | `docs/product/ROADMAP.md` | When releases happen; dependency graph |
| NFRs | `docs/product/NFRS.md` | Quality bars for every story |
| Glossary | `docs/product/GLOSSARY.md` | Shared language; use consistently |
| Epics Summary | `docs/epics/EPICS-SUMMARY.md` | Backlog overview; MoSCoW; dependencies |
| EPIC-001–010 | `docs/epics/EPIC-XXX.md` | Detailed epic specs; PM decomposition hints inside each |

---

## 🎬 Next Steps for ProductManager

1. **Review all epics** with the Architect and TechLead to validate technical feasibility.
2. **Decompose EPIC-010 first** into sprint-ready stories; this is the critical path.
3. **Schedule persona validation sessions** with 3–5 children in the target age group once a prototype of EPIC-001 is ready.
4. **Define story map** for MVP (Must Have epics) and identify the minimum slice that delivers a "wow" moment.
5. **Set up sprint cadence** and backlog in your PM tool (Jira, Linear, etc.).
6. **Hand off NFRs to QA** early so test plans can be prepared alongside development.

---

*Handoff date: 2026-05-07*  
*From: ProductOwner*  
*To: ProductManager*  
*Status: Ready for decomposition*
