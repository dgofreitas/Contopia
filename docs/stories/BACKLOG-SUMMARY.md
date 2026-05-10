# Estante Digital — Backlog Summary (MVP)

> All Must-Have epics decomposed into sprint-ready stories. Total: **34 stories**, **140 story points**.

---

## 📊 Story Count & Points by Epic

| Epic | Title | Stories | Total Points |
|------|-------|---------|--------------|
| EPIC-010 | Platform Foundation | 8 | 36 |
| EPIC-001 | Digital Bookshelf Core | 7 | 27 |
| EPIC-003 | Book Writing & Editing | 6 | 26 |
| EPIC-004 | Cover, Spine & Edge Designer | 7 | 27 |
| EPIC-002 | Book Reading Experience | 6 | 24 |
| **Total** | | **34** | **140** |

---

## 📋 Full Story Inventory

### EPIC-010 — Platform Foundation (8 stories, 36 pts)

| ID | Title | Points | Priority | Primary Persona | Dependencies |
|----|-------|--------|----------|-----------------|-------------|
| STORY-001 | COPPA-Compliant Parent-Child Onboarding | 5 | Must Have | Mãe da Julia | None |
| STORY-002 | Child Authentication & Session Management | 5 | Must Have | Julia | STORY-001 |
| STORY-003 | Authentication Strategy Spike | 3 | Must Have | Mãe da Julia | None |
| STORY-004 | Core Data Model & Database Migrations | 5 | Must Have | Julia | STORY-003 |
| STORY-005 | Core REST API Scaffolding & CRUD Endpoints | 5 | Must Have | Julia | STORY-004 |
| STORY-006 | Secure Asset Storage & CDN Setup | 5 | Must Have | Mãe da Julia | STORY-004 |
| STORY-007 | DevOps, CI/CD & Deployment Pipeline | 5 | Must Have | Mãe da Julia | STORY-005, STORY-006 |
| STORY-008 | API Error Handling & Child-Friendly Messages | 3 | Must Have | Julia | STORY-005 |

### EPIC-001 — Digital Bookshelf Core (7 stories, 27 pts)

| ID | Title | Points | Priority | Primary Persona | Dependencies |
|----|-------|--------|----------|-----------------|-------------|
| STORY-009 | Bookshelf Grid Rendering | 5 | Must Have | Julia | STORY-004, STORY-005 |
| STORY-010 | Empty Bookshelf State | 3 | Must Have | Julia | STORY-009 |
| STORY-011 | Tap-to-Pull Animation | 5 | Must Have | Julia | STORY-009 |
| STORY-012 | Cover Overlay View | 3 | Must Have | Julia | STORY-011 |
| STORY-013 | Place-Back Animation | 3 | Must Have | Julia | STORY-011 |
| STORY-014 | Responsive Shelf Layout | 5 | Must Have | Julia | STORY-009 |
| STORY-015 | Default Sorting & Book Placement | 3 | Must Have | Julia | STORY-009 |

### EPIC-003 — Book Writing & Editing (6 stories, 26 pts)

| ID | Title | Points | Priority | Primary Persona | Dependencies |
|----|-------|--------|----------|-----------------|-------------|
| STORY-016 | Create a New Book | 5 | Must Have | Julia | STORY-004, STORY-005 |
| STORY-017 | Chapter-Based Writing & CRUD | 5 | Must Have | Julia | STORY-016 |
| STORY-018 | Simplified Rich Text Editor | 5 | Must Have | Julia | STORY-016, STORY-017 |
| STORY-019 | Autosave with Visual Indicator | 3 | Must Have | Julia | STORY-018 |
| STORY-020 | Publish Book to Shelf | 5 | Must Have | Julia | STORY-016, STORY-019 |
| STORY-021 | Edit Existing Book | 3 | Must Have | Julia | STORY-017, STORY-020 |

### EPIC-004 — Cover, Spine & Edge Designer (7 stories, 27 pts)

| ID | Title | Points | Priority | Primary Persona | Dependencies |
|----|-------|--------|----------|-----------------|-------------|
| STORY-022 | Cover Designer UI & Template Selection | 5 | Must Have | Julia | STORY-006, STORY-020 |
| STORY-023 | Color Picker & Background Customization | 3 | Must Have | Julia | STORY-022 |
| STORY-024 | Sticker Placement & Text on Cover | 5 | Must Have | Julia | STORY-023 |
| STORY-025 | Spine Auto-Generation & Manual Override | 3 | Must Have | Julia | STORY-023 |
| STORY-026 | Edge Design | 3 | Must Have | Julia | STORY-025 |
| STORY-027 | Image Upload for Cover | 5 | Must Have | Julia | STORY-006, STORY-022 |
| STORY-028 | Default Cover Generation | 3 | Must Have | Julia | STORY-009, STORY-022 |

### EPIC-002 — Book Reading Experience (6 stories, 24 pts)

| ID | Title | Points | Priority | Primary Persona | Dependencies |
|----|-------|--------|----------|-----------------|-------------|
| STORY-029 | Reader UI & Fullscreen View | 5 | Must Have | Julia | STORY-012, STORY-020 |
| STORY-030 | Paginated Reading Mode | 5 | Must Have | Julia | STORY-029 |
| STORY-031 | Continuous Scroll Reading Mode | 3 | Must Have | Julia | STORY-029 |
| STORY-032 | Font Size & Theme Settings | 5 | Must Have | Julia | STORY-029 |
| STORY-033 | Reading Progress Tracking | 3 | Must Have | Julia | STORY-029, STORY-030 |
| STORY-034 | Chapter Navigation | 3 | Must Have | Julia | STORY-029, STORY-033 |

---

## 🔗 Dependency Graph

```mermaid
graph TD
    subgraph "EPIC-010: Platform Foundation"
        S003[STORY-003<br/>Auth Strategy Spike<br/>3 pts]
        S001[STORY-001<br/>Onboarding<br/>5 pts]
        S002[STORY-002<br/>Auth & Sessions<br/>5 pts]
        S004[STORY-004<br/>Data Model & DB<br/>5 pts]
        S005[STORY-005<br/>Core API<br/>5 pts]
        S006[STORY-006<br/>Asset Storage<br/>5 pts]
        S008[STORY-008<br/>Error Handling<br/>3 pts]
        S007[STORY-007<br/>CI/CD<br/>5 pts]
    end

    subgraph "EPIC-001: Bookshelf Core"
        S009[STORY-009<br/>Shelf Grid<br/>5 pts]
        S010[STORY-010<br/>Empty State<br/>3 pts]
        S011[STORY-011<br/>Tap-to-Pull<br/>5 pts]
        S012[STORY-012<br/>Cover Overlay<br/>3 pts]
        S013[STORY-013<br/>Place-Back<br/>3 pts]
        S014[STORY-014<br/>Responsive<br/>5 pts]
        S015[STORY-015<br/>Sorting<br/>3 pts]
    end

    subgraph "EPIC-003: Writing & Editing"
        S016[STORY-016<br/>Create Book<br/>5 pts]
        S017[STORY-017<br/>Chapter CRUD<br/>5 pts]
        S018[STORY-018<br/>Rich Text Editor<br/>5 pts]
        S019[STORY-019<br/>Autosave<br/>3 pts]
        S020[STORY-020<br/>Publish<br/>5 pts]
        S021[STORY-021<br/>Edit Existing<br/>3 pts]
    end

    subgraph "EPIC-004: Cover Designer"
        S022[STORY-022<br/>Designer UI<br/>5 pts]
        S023[STORY-023<br/>Color Picker<br/>3 pts]
        S024[STORY-024<br/>Stickers & Text<br/>5 pts]
        S025[STORY-025<br/>Spine Design<br/>3 pts]
        S026[STORY-026<br/>Edge Design<br/>3 pts]
        S027[STORY-027<br/>Image Upload<br/>5 pts]
        S028[STORY-028<br/>Default Cover<br/>3 pts]
    end

    subgraph "EPIC-002: Reading Experience"
        S029[STORY-029<br/>Reader UI<br/>5 pts]
        S030[STORY-030<br/>Paginated Mode<br/>5 pts]
        S031[STORY-031<br/>Scroll Mode<br/>3 pts]
        S032[STORY-032<br/>Font & Theme<br/>5 pts]
        S033[STORY-033<br/>Progress<br/>3 pts]
        S034[STORY-034<br/>Chapter Nav<br/>3 pts]
    end

    S003 --> S004
    S001 --> S002
    S004 --> S005
    S004 --> S006
    S005 --> S008
    S005 --> S007
    S006 --> S007

    S004 --> S009
    S005 --> S009
    S009 --> S010
    S009 --> S011
    S009 --> S014
    S009 --> S015
    S011 --> S012
    S011 --> S013

    S004 --> S016
    S005 --> S016
    S016 --> S017
    S016 --> S018
    S017 --> S018
    S018 --> S019
    S016 --> S020
    S019 --> S020
    S017 --> S021
    S020 --> S021

    S006 --> S022
    S020 --> S022
    S022 --> S023
    S023 --> S024
    S023 --> S025
    S025 --> S026
    S006 --> S027
    S022 --> S027
    S009 --> S028
    S022 --> S028

    S012 --> S029
    S020 --> S029
    S029 --> S030
    S029 --> S031
    S029 --> S032
    S029 --> S033
    S029 --> S034
    S030 --> S033
    S033 --> S034

    S020 --> S028
    S020 --> S029

    classDef epic010 fill:#e0f7fa
    classDef epic001 fill:#f1f8e9
    classDef epic003 fill:#fff3e0
    classDef epic004 fill:#fce4ec
    classDef epic002 fill:#f3e5f5

    class S001,S002,S003,S004,S005,S006,S007,S008 epic010
    class S009,S010,S011,S012,S013,S014,S015 epic001
    class S016,S017,S018,S019,S020,S021 epic003
    class S022,S023,S024,S025,S026,S027,S028 epic004
    class S029,S030,S031,S032,S033,S034 epic002
```

---

## 🚦 Critical Path (Stories That Block Others)

The following stories are on the critical path; any delay here delays downstream MVP delivery:

| Story | Points | Blocks |
|-------|--------|--------|
| **STORY-003** — Auth Strategy Spike | 3 | STORY-004 (Data Model) |
| **STORY-004** — Core Data Model & DB Migrations | 5 | STORY-005 (API), STORY-006 (Storage), STORY-009 (Shelf), STORY-016 (Create Book) |
| **STORY-005** — Core REST API | 5 | STORY-007 (CI/CD), STORY-008 (Errors), STORY-009 (Shelf), STORY-016 (Create Book) |
| **STORY-006** — Secure Asset Storage | 5 | STORY-007 (CI/CD), STORY-022 (Designer), STORY-027 (Upload) |
| **STORY-009** — Bookshelf Grid Rendering | 5 | STORY-010, STORY-011, STORY-014, STORY-015, STORY-028 |
| **STORY-012** — Cover Overlay View | 3 | STORY-029 (Reader) |
| **STORY-018** — Rich Text Editor | 5 | STORY-019 (Autosave) |
| **STORY-019** — Autosave | 3 | STORY-020 (Publish) |
| **STORY-020** — Publish Book | 5 | STORY-021 (Edit), STORY-022 (Designer), STORY-028 (Default Cover), STORY-029 (Reader) |

### Critical Path Sequence (earliest possible)
```
STORY-003 → STORY-004 → STORY-005 → STORY-009
                                   ↘ STORY-006 → STORY-007
                                              ↘ STORY-022, STORY-027
```

- **Sprint 1–2**: STORY-003, STORY-001, STORY-004, STORY-005, STORY-006
- **Sprint 3–4**: STORY-002, STORY-007, STORY-008, STORY-009, STORY-016
- **Sprint 5–6**: STORY-011, STORY-012, STORY-013, STORY-010, STORY-014, STORY-015, STORY-017, STORY-018
- **Sprint 6–7**: STORY-019, STORY-020, STORY-021, STORY-022, STORY-023, STORY-028
- **Sprint 7–8**: STORY-024, STORY-025, STORY-026, STORY-027, STORY-029, STORY-030, STORY-031
- **Sprint 8–9**: STORY-032, STORY-033, STORY-034, buffer / polish / QA

---

## ✅ Splits Performed

All stories are ≤ 5 points following the 8-point max rule from PM-HANDOFF. The following topics were split to stay within the limit:

| Original Topic | Split Into | Rationale |
|----------------|-----------|-----------|
| Auth + Onboarding | STORY-001 (onboarding), STORY-002 (auth/sessions) | Different flows; onboarding is parent-facing, auth is child-facing. |
| Data model + API + Storage | STORY-004 (schema), STORY-005 (API), STORY-006 (storage) | Each is a distinct technical domain; combining would exceed 8 pts. |
| Writing lifecycle | STORY-016 (create), STORY-017 (chapters), STORY-018 (editor), STORY-019 (autosave), STORY-020 (publish), STORY-021 (edit) | Editor alone is complex; autosave and publish are independent. |
| Cover designer | STORY-022 (templates), STORY-023 (colors), STORY-024 (stickers), STORY-025 (spine), STORY-026 (edge), STORY-027 (upload) | Each design element is its own interaction-heavy feature. |
| Reading modes | STORY-029 (reader UI), STORY-030 (paginated), STORY-031 (scroll), STORY-032 (settings), STORY-033 (progress), STORY-034 (chapters) | Paginated vs scroll are different rendering engines; settings/progress are independent. |

---

## 📐 Definition of Ready Validation

All stories meet the PO handoff criteria:
- [x] Clear title and user-centric description
- [x] Referenced persona(s) from PERSONAS.md
- [x] Referenced parent epic (EPIC-XXX)
- [x] Acceptance criteria in GIVEN-WHEN-THEN format (3–8 per story)
- [x] NFRs identified and testable per story
- [x] Dependencies identified between stories
- [x] UI/UX notes included for user-facing stories

---

*Generated: 2026-05-08*  
*Decomposed by: ProductManager*  
*Status: Ready for Architect planning*
