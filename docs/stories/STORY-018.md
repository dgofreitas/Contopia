# STORY-018: Simplified Rich Text Editor

**Epic**: EPIC-003
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-016, STORY-017

## User Story
As a young author, I want to format my story with bold, italics, headings, and chapter breaks using a simple toolbar, so that my book looks like a real published story without overwhelming me with options.

## Acceptance Criteria
1. **GIVEN** Julia is in the chapter editor, **WHEN** she selects text and taps the **Bold** button, **THEN** the selected text becomes bold and the editor reflects the change immediately.
2. **GIVEN** Julia is in the chapter editor, **WHEN** she selects text and taps the **Italic** button, **THEN** the selected text becomes italic.
3. **GIVEN** Julia wants a chapter heading, **WHEN** she places the cursor on a line and selects "Heading" from the toolbar, **THEN** the line is formatted as a heading (e.g., `h2`).
4. **GIVEN** Julia wants to insert a chapter break, **WHEN** she taps the **Chapter Break** button, **THEN** a visual separator is inserted in the text, and it renders as a horizontal rule or decorative break in the reader.
5. **GIVEN** Julia makes a formatting mistake, **WHEN** she uses Undo (Ctrl+Z / toolbar), **THEN** the last action is reversed.
6. **GIVEN** the toolbar is displayed, **WHEN** the viewport is narrow (mobile), **THEN** the toolbar collapses into a scrollable row or a single "Format" menu to save space.
7. **GIVEN** a screen reader is active, **WHEN** Julia navigates the toolbar, **THEN** each button has a clear `aria-label` (e.g., "Make text bold") and the editor announces format changes.

## Related NFRs
- **NFR-PERF-03**: Typing latency below 50ms for documents up to 10,000 words on mobile.
- **NFR-ACC-01**: WCAG 2.1 AA — editor is keyboard navigable.
- **NFR-ACC-02**: Toolbar buttons operable via keyboard.
- **NFR-ACC-03**: Screen reader announces toolbar actions.
- **NFR-ACC-04**: Toolbar icons have sufficient contrast.
- **NFR-SEC-04**: Editor content sanitized on save (no embedded scripts).
- **NFR-SEC-07**: No third-party scripts loaded in editor.

## Technical Notes
- Evaluate and select a lightweight rich text editor: Tiptap, Slate, or ProseMirror-based solutions.
- Keep toolbar minimal: Bold, Italic, Heading, Chapter Break, Undo/Redo. No font family, font size, or color in MVP.
- Store content in a structured format (HTML with allowlist or JSON); sanitize on server before storage.
- Use virtual scrolling or contenteditable optimizations to maintain typing latency for large documents.
- Mobile considerations: native selection handling can be tricky; test extensively on iOS Safari and Android Chrome.
- Toolbar should be sticky (always visible) on desktop, and floating/collapsible on mobile.
- Do NOT load external plugins, CDNs, or analytics within the editor iframe/context.

## QA Notes
- Measure typing latency with Chrome DevTools for a 10,000-word document; must be <50ms.
- Test all formatting actions on iOS Safari, Android Chrome, and desktop.
- Verify undo/redo works for at least 20 steps.
- Test pasting content from external sources (Word, Google Docs) — strip unsupported styling.
- Test XSS payloads in pasted content (e.g., `<img src=x onerror=alert(1)>`) — verify sanitization.
- Test keyboard-only formatting: select text with Shift+Arrow, apply bold with Ctrl+B.
- Screen reader test: navigate toolbar, apply bold, verify announcement.
