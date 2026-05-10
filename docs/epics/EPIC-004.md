# EPIC-004: Cover, Spine & Edge Designer

**Status**: Draft  
**Priority**: Must Have  
**Estimate**: M  
**Target Release**: MVP

---

## 👤 Personas Impacted

- **Primary**: Julia — The Young Author — *She wants her books to look beautiful and personal.*
- **Secondary**: Mãe da Julia — The Caring Parent — *She loves seeing her daughter's creative covers.*

## 🎯 Business Value

Visual personalization is the emotional hook of the product. A child who designs a cover invests identity into the book and the platform. Custom covers drive the "pride" moment that leads to sharing with family and repeat visits. This is a key differentiator from generic document apps.

## 📊 Success Metrics (KPIs)

- **Primary KPI**: >50% of published books have a non-default custom cover, spine, or edge within 60 days.
- **Secondary KPIs**:
  - Cover designer session duration >3 minutes (signals engagement, not abandonment).
  - <5% of users abandon the cover designer before saving.

## 📝 Description

Allow Julia to create or import visual assets for her book: the **cover** (front face), the **spine** (visible on shelf), and the **edge** (optional decorative element when book is pulled out). Provide a simple, fun design tool with pre-made color palettes, patterns, stickers/illustrations, and text layout options. Also support uploading an image from the device.

## 🔗 Dependencies

- **Blocked by**: EPIC-003 (Writing) — book needs a title before cover design; EPIC-010 (Platform Foundation) — file storage.
- **Blocks**: None; enhances EPIC-001 (Bookshelf) visual appeal.
- **Related to**: EPIC-005 (Import) — imported books may have existing covers to extract or replace.

## ✅ Scope (In)

- Launch cover designer after writing (or from shelf context menu).
- Template presets: solid colors, gradients, patterns (10–15 kid-friendly options).
- Text on cover: title, author name (auto-filled), optional subtitle.
- Sticker/illustration library (20–30 simple, inclusive vector illustrations).
- Image upload: user can upload a photo or drawing from device.
- Spine auto-generated from cover design (color + title) with manual override.
- Edge decoration: simple patterns or solid color.
- Live preview: see how cover, spine, and edge look together.
- Save and apply to book.

## ❌ Scope (Out)

- **Freehand drawing tool** — Could Have for V1.2; requires canvas implementation.
- **Advanced typography** (custom fonts, curved text, layers) — Could Have for V1.2.
- **AI-generated covers** — Won't Have; unnecessary complexity and cost.
- **Video/animated covers** — Won't Have; performance and accessibility concerns.
- **Community/shared cover templates** — Won't Have; no social features.

## 📋 Business Rules

1. Every book MUST have a default cover generated from title + random pleasant color if user skips designer.
2. Spine MUST be readable at small sizes (shelf view); title text has max length and font size constraints.
3. Uploaded images MUST be screened for file type and size; no executable or script files.
4. All assets MUST be stored securely and associated only with the user's account.

## 🚦 Non-Functional Requirements

- **Performance**: Designer preview updates <200ms after each change on mobile.
- **Security**: Uploaded images sanitized (strip EXIF, validate mime type, size limit 5MB).
- **Accessibility**: Designer usable with keyboard and screen reader alternatives (e.g., voiceover reads template names).

## 🗺️ High-Level User Flow

```mermaid
graph TD
    A[Finish Writing / Tap "Design Cover"] --> B[Choose Template]
    B --> C[Customize Colors / Text / Stickers]
    C --> D[Upload Image Optionally]
    D --> E[Preview Cover + Spine + Edge]
    E --> F[Save & Apply]
    F --> G[Return to Shelf with New Look]
```

## 📖 Feature Scenarios (BDD)

### Feature: Design a Cover

**Scenario**: Julia uses a template
- **Given** Julia finishes writing her book
- **When** she chooses a "Galaxy" template, changes colors, and adds a star sticker
- **Then** the cover, spine, and edge preview update live

**Scenario**: Upload a drawing
- **Given** Julia has a drawing on her tablet
- **When** she uploads it as her cover image
- **Then** the image appears on the cover and a matching spine is generated

**Scenario**: Skip designer
- **Given** Julia doesn't want to design a cover now
- **When** she taps "Skip"
- **Then** a default cover is assigned and she can edit later

## 🧪 Acceptance Criteria (Epic Level)

- [ ] Designer opens with template selection.
- [ ] User can change colors, add text, and place stickers.
- [ ] Image upload supported (JPG, PNG) with size limits.
- [ ] Live preview shows cover, spine, and edge together.
- [ ] Spine auto-generated from cover with optional manual edit.
- [ ] Default cover assigned if user skips.
- [ ] Assets saved and appear correctly on shelf and reader.

## ⚠️ Risks and Assumptions

- **Risk**: Complex design tools frustrate children. → **Mitigation**: Heavily template-driven; customization is optional, not required.
- **Assumption**: Kids care more about colors and stickers than font kerning. → **Validation**: Test with target age group; prioritize color/sticker over typography.

## 🔄 PM Decomposition Hints

- Split by design element: cover story, spine story, edge story.
- Split by input method: template picker, color picker, sticker placement, image upload.
- Split by lifecycle: design for new book, redesign existing book.
- One story for asset storage and retrieval pipeline.

---

*Last updated: 2026-05-07*  
*Owner: ProductOwner*
