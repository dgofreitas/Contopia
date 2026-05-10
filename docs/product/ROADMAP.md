# Estante Digital — Product Roadmap

> Time horizons are quarterly; dates are approximate.

---

## 🗓️ Release Timeline

```mermaid
graph LR
    subgraph "MVP"
        M1["Q2 2026"]
        M1 --> M2["Core Shelf"]
        M1 --> M3["Write + Read"]
        M1 --> M4["Cover Designer"]
        M1 --> M5["Platform Foundation"]
        M1 --> M6["Sorting + Animations"]
    end
    subgraph "V1.1"
        V1["Q3 2026"]
        V1 --> V2["Book Import"]
        V1 --> V3["Offline Mode"]
        V1 --> V4["Parent Dashboard"]
        V1 --> V5["Polish"]
    end
    subgraph "V2.0"
        V21["Q4 2026"]
        V21 --> V22["Cloud Integrations"]
        V21 --> V23["Advanced Reader"]
        V21 --> V24["Educator Tools"]
        V21 --> V25["Themes"]
    end
```

---

## 📦 MVP (Q2 2026) — "The Magical Shelf"

**Goal**: Prove that children love the bookshelf metaphor and will write/read on the platform.

| Epic | Title | Priority | Status |
|------|-------|----------|--------|
| EPIC-010 | Platform Foundation | Must Have | Foundation |
| EPIC-001 | Digital Bookshelf Core | Must Have | Core UX |
| EPIC-003 | Book Writing & Editing | Must Have | Core UX |
| EPIC-002 | Book Reading Experience | Must Have | Core UX |
| EPIC-004 | Cover, Spine & Edge Designer | Must Have | Delight |
| EPIC-007 | Animations & Delight | Should Have | Delight |
| EPIC-006 | Shelf Organization & Sorting | Should Have | Core UX |

**Definition of MVP Ready**:
- Julia can create a book, design a cover, and see it on her shelf.
- She can open and read the book end-to-end.
- Animations make the experience feel tactile and fun.
- Parent email is collected; COPPA-compliant onboarding.
- Platform is stable, secure, and performant.

**What MVP does NOT include**:
- Importing external books.
- Offline mode.
- Parent dashboard beyond basic account linking.
- Advanced reading features (notes, highlights).
- Cloud integrations.

---

## 📦 V1.1 (Q3 2026) — "My Complete Library"

**Goal**: Make Estante Digital the place for ALL of Julia's books, not just the ones she writes.

| Epic | Title | Priority | Status |
|------|-------|----------|--------|
| EPIC-005 | Book Import System | Should Have | Expansion |
| EPIC-008 | Offline Writing & Reading | Could Have | Reliability |
| EPIC-009 | Parent Dashboard & Safety Controls | Could Have | Trust |
| EPIC-007 (cont.) | Animation Polish & Sound | Could Have | Delight |

**Key Additions**:
- Import TXT, PDF, EPUB.
- Offline mode for writing and reading.
- Parent dashboard with activity export.
- Optional sound effects and richer animations.
- Custom shelf themes could be introduced.

---

## 📦 V2.0 (Q4 2026+) — "A Safe Creative World"

**Goal**: Scale to families and classrooms; become the trusted creative platform for young authors.

| Capability | Description | Persona |
|------------|-------------|---------|
| Cloud Import | Google Drive, Dropbox, OneDrive import | Julia |
| Advanced Reader | Highlights, notes, bookmarks, dictionary | Julia |
| Educator Tools | Class codes, group shelves, assignment support | Professora Ana |
| Shelf Themes | Multiple backgrounds, room customizations | Julia |
| Multi-Device Sync | Seamless sync across tablet, laptop, phone | Julia + Parent |
| Community (Private) | Share with family only via secure links | Julia + Parent |

**Out of scope for V2.0**:
- Public social features.
- Marketplace or paid content.
- AI-generated stories.
- School LMS integrations.

---

## 🗺️ Dependency Graph

```mermaid
graph TD
    EP10[EPIC-010 Platform Foundation] --> EP01[EPIC-001 Bookshelf Core]
    EP10 --> EP02[EPIC-002 Reading]
    EP10 --> EP03[EPIC-003 Writing]
    EP10 --> EP04[EPIC-004 Cover Designer]
    EP10 --> EP07[EPIC-007 Animations]
    EP10 --> EP06[EPIC-006 Sorting]

    EP01 --> EP02
    EP01 --> EP06
    EP03 --> EP04
    EP04 --> EP01

    EP10 --> EP05[EPIC-005 Import]
    EP10 --> EP08[EPIC-008 Offline]
    EP10 --> EP09[EPIC-009 Parent Dashboard]

    EP05 --> EP01
    EP08 --> EP02
    EP08 --> EP03
    EP09 --> EP10
```

---

## 🏁 Milestones

| Milestone | Target | Definition |
|-----------|--------|------------|
| **Foundation Ready** | Month 1 | Auth, DB, API, CI/CD operational. |
| **Shelf Preview** | Month 2 | Shelf renders, books appear, basic animations. |
| **Authoring Ready** | Month 2.5 | Writing + cover designer functional. |
| **MVP Launch** | Month 3 | All Must-Haves shipped; internal beta with 10 families. |
| **V1.1 Launch** | Month 5 | Import + offline + parent dashboard + 100 beta users. |
| **V2.0 Planning** | Month 6 | Educator research, advanced features scoped. |

---

*Last updated: 2026-05-07*  
*Owner: ProductOwner*  
*Next review: 2026-06-07*
