# EPIC-002: Book Reading Experience

**Status**: Draft  
**Priority**: Must Have  
**Estimate**: M  
**Target Release**: MVP

---

## 👤 Personas Impacted

- **Primary**: Julia — The Young Author — *She wants a reading experience that feels like turning pages, not scrolling a document.*
- **Secondary**: Mãe da Julia — The Caring Parent — *She wants her daughter reading in a safe, ad-free environment.*

## 🎯 Business Value

Reading is one of the two core jobs of the product (alongside writing). A delightful, distraction-free reading mode increases time-in-app and reinforces the "book" metaphor. If reading feels like a generic browser scroll, Julia will abandon the app for Kindle or Wattpad.

## 📊 Success Metrics (KPIs)

- **Primary KPI**: >50% of opened books are read for >3 minutes (completion signal).
- **Secondary KPIs**:
  - Reader screen time accounts for ≥40% of total session time.
  - Zero crash reports attributed to the reader component.

## 📝 Description

After Julia views the cover (from EPIC-001), she can open the book and enter a full-screen, immersive reading experience. The reader displays book content with comfortable typography, a progress indicator, and easy page navigation (swipe or tap zones). If a summary exists, it is shown on the cover view *before* opening the book.

## 🔗 Dependencies

- **Blocked by**: EPIC-001 (Bookshelf Core), EPIC-010 (Platform Foundation).
- **Blocks**: None directly; related to EPIC-005 (Import) which populates reader content.
- **Related to**: EPIC-003 (Writing) — author reads her own draft before publishing.

## ✅ Scope (In)

- Full-screen reader view activated from cover overlay.
- Paginated or smooth-scroll reading with tap/swipe navigation.
- Chapter/section navigation if book has structure.
- Reading progress indicator (subtle, encouraging — not a "grade").
- Font size adjustment (3 sizes: small, medium, large).
- Day/night/sepia color themes for reader background.
- Summary display on cover view (if provided by author).
- "Back to shelf" button with animation.

## ❌ Scope (Out)

- **Text-to-speech / read-aloud** — Could Have for V2.0; requires audio infrastructure.
- **Highlighting, notes, or annotations** — Could Have for V1.2; adds complexity to data model.
- **Dictionary / word lookup** — Could Have; may require third-party API.
- **Social reading (shared progress, comments)** — explicitly out of vision.

## 📋 Business Rules

1. Reading progress MUST be saved automatically every 10 seconds or on page turn.
2. The reader MUST resume at the last saved position when reopened.
3. Font and theme preferences MUST persist across sessions.
4. Reader MUST not show any external links, ads, or third-party content.

## 🚦 Non-Functional Requirements

- **Performance**: Reader content render <1s for books up to 50,000 words on mobile.
- **Security**: All book content served over HTTPS; no external scripts injected.
- **Accessibility**: Reader supports screen readers; sufficient color contrast in all themes.

## 🗺️ High-Level User Flow

```mermaid
graph TD
    A[Cover Overlay Open] --> B[Tap "Read Book"]
    B --> C[Reader Opens Fullscreen]
    C --> D[Read Page / Swipe]
    D --> E[Auto-Save Progress]
    D --> F[Tap Back]
    F --> G[Return to Shelf]
```

## 📖 Feature Scenarios (BDD)

### Feature: Open and Read Book

**Scenario**: Julia opens her own story
- **Given** Julia is viewing a book cover
- **When** she taps "Read Book"
- **Then** the reader opens at the first page

**Scenario**: Resume reading
- **Given** Julia previously read 20 pages
- **When** she opens the book again
- **Then** the reader opens at page 21

**Scenario**: Change font size
- **Given** Julia is reading
- **When** she taps the settings icon and chooses "Large"
- **Then** the text size increases and persists

## 🧪 Acceptance Criteria (Epic Level)

- [ ] Reader opens from cover overlay with smooth transition.
- [ ] Supports swipe/tap navigation through book content.
- [ ] Saves and restores reading position automatically.
- [ ] Offers 3 font sizes and 3 color themes.
- [ ] Displays summary on cover view if available.
- [ ] Returns to shelf gracefully.
- [ ] No external content or ads appear.

## ⚠️ Risks and Assumptions

- **Risk**: Large imported files (PDF/EPUB) may render poorly or slowly. → **Mitigation**: Convert to internal format on import; pre-render chapters.
- **Assumption**: Kids prefer tap zones over swipe for page turning on tablets. → **Validation**: A/B test or observe during usability testing.

## 🔄 PM Decomposition Hints

- Split by reading mode: paginated story, continuous scroll, chapter list.
- Split by settings: font size, theme selection, progress display.
- Split by book source: reading an original book vs. reading an imported book.
- One story for progress persistence layer.

---

*Last updated: 2026-05-07*  
*Owner: ProductOwner*
