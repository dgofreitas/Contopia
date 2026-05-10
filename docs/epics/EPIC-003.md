# EPIC-003: Book Writing & Editing

**Status**: Draft  
**Priority**: Must Have  
**Estimate**: L  
**Target Release**: MVP

---

## 👤 Personas Impacted

- **Primary**: Julia — The Young Author — *She wants to write stories that feel like real books, not school essays.*
- **Secondary**: Professora Ana — The Educator — *She wants students to produce polished creative writing.*

## 🎯 Business Value

Writing is the product's second core job and primary differentiator. By enabling children to author books natively, Estante Digital becomes a creation platform, not just a reader. This drives emotional investment, repeat usage, and organic sharing (showing parents). It is the strongest retention lever.

## 📊 Success Metrics (KPIs)

- **Primary KPI**: >40% of active users create at least one original book within 30 days.
- **Secondary KPIs**:
  - Average words per original book ≥500.
  - Autosave recovery rate: >95% of writing sessions end with saved content (no data loss).

## 📝 Description

Provide a child-friendly, book-oriented writing environment where Julia can write chapters, add a title, and optionally write a summary. The editor is simplified — no overwhelming toolbars — but supports essential formatting (bold, italics, chapter breaks). The writing interface must feel like "making a book," not "doing homework."

## 🔗 Dependencies

- **Blocked by**: EPIC-010 (Platform Foundation).
- **Blocks**: EPIC-004 (Cover Designer) — books need a title before cover design.
- **Related to**: EPIC-001 (Bookshelf) — new books appear on shelf after saving.

## ✅ Scope (In)

- "New Book" flow with title input and optional summary.
- Chapter-based writing (add, rename, reorder chapters).
- Simplified rich text editor: bold, italic, headings, chapter breaks.
- Autosave every 30 seconds with visual indicator.
- "Publish to My Shelf" action (makes book visible on shelf).
- Draft vs. Published state (drafts hidden from shelf).
- Word count display (encouraging, not punitive).
- Ability to edit an existing book from the shelf (long-press or menu).

## ❌ Scope (Out)

- **Collaborative / co-authoring** — Won't Have; out of vision (no social).
- **Templates for story structures** — Could Have for V1.2.
- **Media embedding (images inside chapters)** — Could Have for V1.2; adds complexity.
- **Export to PDF / ePub from the app** — Could Have for V2.0; parent dashboard handles export.
- **Voice typing / dictation** — Could Have for V2.0.

## 📋 Business Rules

1. A book MUST have a title to be saved; summary is optional.
2. Autosave MUST work silently; user should never need to press "Save."
3. A book in "Draft" state is only visible in the writing list, NOT on the shelf.
4. "Publish to Shelf" is irreversible (or requires explicit unpublish).
5. Maximum book size: 100,000 words (soft limit with warning).

## 🚦 Non-Functional Requirements

- **Performance**: Editor type latency <50ms for 10,000-word documents on mobile.
- **Security**: Content is encrypted at rest; no user-generated content is scanned or analyzed for ads.
- **Accessibility**: Editor supports keyboard navigation; color contrast meets WCAG AA.

## 🗺️ High-Level User Flow

```mermaid
graph TD
    A[Tap "Write Book"] --> B[Enter Title & Summary]
    B --> C[Chapter Editor Opens]
    C --> D[Type Content]
    D --> E[Autosave Indicator]
    D --> F[Add New Chapter]
    D --> G[Publish to Shelf]
    G --> H[Book Appears on Shelf]
```

## 📖 Feature Scenarios (BDD)

### Feature: Write a New Book

**Scenario**: Julia writes her first story
- **Given** Julia taps "Write My First Book"
- **When** she enters a title "A Floresta Mágica" and writes 3 chapters
- **Then** the book is autosaved and she can publish it to her shelf

**Scenario**: Recover from interrupted session
- **Given** Julia was writing and the browser closed
- **When** she reopens the writing tool
- **Then** her last autosaved content is restored

**Scenario**: Draft not on shelf
- **Given** Julia has a draft book
- **When** she looks at her bookshelf
- **Then** the draft is not visible until published

## 🧪 Acceptance Criteria (Epic Level)

- [ ] User can create a new book with title and optional summary.
- [ ] Chapter-based structure: add, rename, delete, reorder.
- [ ] Rich text editor with bold, italic, headings.
- [ ] Autosave every 30s with subtle indicator.
- [ ] "Publish to Shelf" makes book visible on main bookshelf.
- [ ] Drafts accessible from a "My Drafts" list.
- [ ] Word count visible and encouraging.
- [ ] Existing books can be reopened for editing.

## ⚠️ Risks and Assumptions

- **Risk**: Children may find chapter management confusing. → **Mitigation**: Default to single-chapter books; chapters are an opt-in "advanced" feature.
- **Assumption**: Autosave is more important than manual save for this age group. → **Validation**: Survey or observe; children forget to save.

## 🔄 PM Decomposition Hints

- Split by lifecycle: create book, write chapter, publish book, edit existing.
- Split by editor component: toolbar, text area, chapter sidebar, autosave.
- Split by state: empty draft, mid-progress, published, reopened for edit.
- Consider one spike story to evaluate rich text editors (Slate, Tiptap, etc.).

---

*Last updated: 2026-05-07*  
*Owner: ProductOwner*
