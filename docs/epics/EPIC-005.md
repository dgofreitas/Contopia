# EPIC-005: Book Import System

**Status**: Draft  
**Priority**: Should Have  
**Estimate**: M  
**Target Release**: V1.1

---

## 👤 Personas Impacted

- **Primary**: Julia — The Young Author — *She wants to add e-books, school PDFs, or stories she downloaded to her shelf.*
- **Secondary**: Professora Ana — The Educator — *She wants students to import templates or reading materials.*

## 🎯 Business Value

Import expands the bookshelf beyond original creations, making Estante Digital a true personal library. It increases shelf population quickly (which drives engagement per EPIC-001 KPIs) and provides an on-ramp for users who may not write immediately. Supporting common school formats (PDF, EPUB, TXT) removes friction.

## 📊 Success Metrics (KPIs)

- **Primary KPI**: >90% of supported file imports (TXT, PDF, EPUB) complete without user-reported errors.
- **Secondary KPIs**:
  - >30% of active users have at least one imported book by day 30.
  - Average time to import <60 seconds from file selection to shelf placement.

## 📝 Description

Allow Julia to import books from her device into Estante Digital. Supported formats: **TXT**, **PDF**, and **EPUB**. The system extracts content, attempts to extract or generate a cover/thumbnail, and places the book on the shelf. The user can then redesign the cover using EPIC-004 if desired.

## 🔗 Dependencies

- **Blocked by**: EPIC-001 (Bookshelf), EPIC-002 (Reading), EPIC-010 (Platform Foundation).
- **Blocks**: None.
- **Related to**: EPIC-004 (Cover Designer) — imported books may use default or extracted covers.

## ✅ Scope (In)

- File picker supporting TXT, PDF, EPUB.
- Client-side or server-side parsing and content extraction.
- Metadata extraction (title, author) where available.
- Cover/thumbnail extraction from EPUB or first-page PDF render.
- Fallback cover generation if no cover found (title + color).
- Progress indicator during import.
- Error handling for corrupted or unsupported files (friendly message, not crash).
- Post-import flow: direct to shelf or prompt to design cover.
- Size limit: 25MB per file (generous for books; prevents abuse).

## ❌ Scope (Out)

- **DOCX / Word import** — Could Have for V1.2; complex formatting mapping.
- **DRM-protected files** — Won't Have; legally and technically infeasible.
- **Batch import** — Could Have for V1.2; MVP is single-file.
- **Cloud import** (Google Drive, Dropbox) — Could Have for V2.0.
- **Automatic content categorization / tagging** — Won't Have; unnecessary complexity.

## 📋 Business Rules

1. Imported books MUST be treated as "read-only" by default; user cannot edit imported content.
2. Imported books MUST have the same cover/spine customization capability as original books.
3. File types outside TXT/PDF/EPUB MUST be rejected with a clear, friendly message.
4. Imported content MUST be scanned for malware/executable payload (even if disguised as PDF).
5. User MUST be warned if import will exceed storage quota.

## 🚦 Non-Functional Requirements

- **Performance**: Import of 5MB EPUB completes in <30s on mid-range mobile.
- **Security**: Files scanned server-side; sandboxed parsing; no execution of user-uploaded content.
- **Compliance**: Imported content is private; no indexing or analysis for recommendations.

## 🗺️ High-Level User Flow

```mermaid
graph TD
    A[Tap "Import Book"] --> B[Select File from Device]
    B --> C[System Parses File]
    C --> D[Extract Title / Cover]
    D --> E[Generate Fallback if Needed]
    E --> F[Place on Shelf]
    F --> G[Prompt to Design Cover]
```

## 📖 Feature Scenarios (BDD)

### Feature: Import a Book

**Scenario**: Import a TXT file
- **Given** Julia selects a .txt file
- **When** the import completes
- **Then** a new book appears on her shelf with the filename as title and a default cover

**Scenario**: Import an EPUB with cover
- **Given** Julia selects an .epub with embedded cover art
- **When** the import completes
- **Then** the book appears with the extracted cover on the shelf

**Scenario**: Import fails gracefully
- **Given** Julia selects a corrupted PDF
- **When** the import fails
- **Then** she sees a friendly message: "Oops! This file didn't work. Try another?"

## 🧪 Acceptance Criteria (Epic Level)

- [ ] Supports TXT, PDF, and EPUB import.
- [ ] Extracts content and renders it in the reader.
- [ ] Extracts or generates cover/thumbnail.
- [ ] 25MB file size limit enforced.
- [ ] Friendly error messages for unsupported or corrupted files.
- [ ] Imported books appear on shelf and are readable.
- [ ] Security scanning prevents malicious uploads.

## ⚠️ Risks and Assumptions

- **Risk**: PDF parsing is notoriously variable (scanned pages vs. text). → **Mitigation**: Use robust library (e.g., pdf.js, pandoc); clearly communicate limitations.
- **Assumption**: Most target users have TXT or EPUB, not complex DOCX. → **Validation**: Survey parents on common file types their children receive.

## 🔄 PM Decomposition Hints

- Split by file format: TXT import story, PDF import story, EPUB import story.
- Split by pipeline: file upload, parsing/extraction, cover extraction, shelf placement.
- One story for error handling and user messaging.
- One spike story to evaluate parsing libraries.

---

*Last updated: 2026-05-07*  
*Owner: ProductOwner*
