# Code Analysis — STORY-018
**Analyzer**: CodeAnalyzer | **Date**: 2026-05-20

## Summary
- **Type**: Fullstack (Express + React)
- **Stack**: Node.js / Express / Mongoose 8 / React 18 / Vite 5 / TanStack Query 5 / Zustand 5 / @dnd-kit / Tailwind 3 / TipTap 2.8 (installed, unused)
- **Pattern**: Layered (Router → Manager → DAO → Mongoose Model), Feature-based frontend (`app/editor/`)
- **Complexity**: Low | **Risk**: Low (greenfield rich-text integration; no existing rich-text code to migrate)

---

## Architecture
**Pattern**: Layered backend (Router → Manager → DAO) / Flat feature-based frontend (`src/app/editor/`)

**Backend Structure**:
| Directory/File | Role |
|---|---|
| `backend/src/app/editor/chapter-router.js` | HTTP routes for `PUT /api/v1/chapters/:chapterId` |
| `backend/src/app/editor/chapter-manager.js` | Business logic: ownership checks, wordCount computation, audit logging |
| `backend/src/app/book/book-dao.js` (lines 43-89) | Data access: CRUD operations on Chapter model |
| `backend/src/app/book/book-model.js` (lines 93-140) | Mongoose schema for Chapter |
| `backend/src/app/common/validation-schemas.js` (lines 157-172) | Zod validation for chapter PUT body |

**Frontend Structure**:
| Path | Role |
|---|---|
| `frontend/src/app/editor/EditorPage.jsx` | Page container: orchestrates sidebar + editor, state management |
| `frontend/src/app/editor/ChapterEditor.jsx` | **PLACEHOLDER** — dashed empty box (no content editing yet) |
| `frontend/src/app/editor/ChapterSidebar.jsx` | Drag-and-drop chapter list (@dnd-kit), mobile drawer |
| `frontend/src/app/editor/ChapterListItem.jsx` | Sortable chapter item with inline rename, delete, reorder |
| `frontend/src/app/editor/InlineEditTitle.jsx` | Inline text editing for chapter title |
| `frontend/src/app/editor/NewBookPage.jsx` | Book creation page |
| `frontend/src/app/editor/NewBookForm.jsx` | React Hook Form + Zod for book creation |
| `frontend/src/stores/book-store.js` | Zustand: books, chapters, **draft** state |

---

## Impact Analysis
| Component | Path | Reason | Complexity |
|-----------|------|--------|------------|
| Chapter Mongoose schema | `backend/src/app/book/book-model.js:93-140` | `content` field type is `String` — stores HTML; no change needed for TipTap | **None** |
| Chapter PUT validation | `backend/src/app/common/validation-schemas.js:165-172` | `content: z.string().optional()` — validates as plain string; no change needed | **None** |
| Chapter PUT router | `backend/src/app/editor/chapter-router.js:14-31` | Passes `req._body` directly to manager; no parsing/transformation of content | **None** |
| Chapter manager | `backend/src/app/editor/chapter-manager.js:28-76` | Auto-computes `wordCount` via `content.split(/\s+/)` — **must update for HTML content** (strip tags before counting) | **Medium** |
| ChapterEditor component | `frontend/src/app/editor/ChapterEditor.jsx:4-34` | **Full rewrite needed** — currently renders dashed placeholder box; replace with TipTap `<EditorContent>` | **High** |
| EditorPage | `frontend/src/app/editor/EditorPage.jsx` | Passes `activeChapter` to `ChapterEditor`; add `onContentChange` callback + auto-save orchestration | **Medium** |
| useUpdateChapter hook | `frontend/src/hooks/useUpdateChapter.js` | Already sends `updates` object to `PUT /v1/chapters/:chapterId`; just needs `content` in the payload | **Low** |
| Zustand book-store | `frontend/src/stores/book-store.js:21-24,56-64` | Has `draft`, `saveDraft()`, `clearDraft()` — ready for auto-save draft state | **Low** |
| sanitize.js | `frontend/src/lib/sanitize.js:1-15` | Currently strips ALL tags via `DOMPurify`; will need new function for TipTap content display (allow safe HTML) | **Medium** |
| Package.json | `frontend/package.json:23-24` | `@tiptap/react` and `@tiptap/starter-kit` already installed at `^2.8.0` | **None** |

---

## Dependencies
**Services**: `ChapterEditor → useUpdateChapter → apiClient → PUT /v1/chapters/:chapterId → chapterRouter → chapterManager → book-dao(updateChapterById) → MongoDB`

**Common**: `apiClient` (Axios instance), `DOMPurify` (installed at `^3.4.3`), `@tiptap/starter-kit` (includes bold, italic, underline, strike, heading, bulletList, orderedList, blockquote, code, codeBlock, horizontalRule, hardBreak, paragraph, text, history)

---

## Patterns & Conventions

### Backend
**Naming**: Manager pattern (`updateChapterManager`, `createChapterManager`) — stateless business logic functions
**Error handling**: Custom error objects with `.code` and `.status` properties; `handleError()` wrapper in router
**Validation**: Zod schemas in shared `validation-schemas.js`; `validate()` middleware in router
**Testing**: Vitest with in-memory MongoDB (`mongodb-memory-server`); unit + integration tests
**Audit**: Fire-and-forget `createActivityLog()` calls with `.catch()` for logging failures

### Frontend
**Naming**: PascalCase components, camelCase hooks; feature-based co-location in `app/editor/`
**State**: TanStack Query for server state (chapters CRUD); Zustand for client-only state (draft, auth, errors)
**Testing**: Vitest + Testing Library; mock `react-i18next` with identity translator
**Formatting**: Flowbite-React components (`Button`, `Modal`, `Spinner`, `Tooltip`); Tailwind classes
**Icons**: `react-icons/hi` (HeroIcons v2)
**Animations**: Framer Motion for page transitions and mobile drawer

### TipTap Status
**Already in dependencies**: `@tiptap/react ^2.8.0` + `@tiptap/starter-kit ^2.8.0`
**Usage**: ⚠️ **ZERO** — No `useEditor`, `EditorContent`, `BubbleMenu`, `FloatingMenu`, or any TipTap import found in codebase
**Extensions**: None configured — starter-kit is default set only
**Toolbar**: None exists — no formatting toolbar component exists anywhere

---

## Risks
1. **Word Count with HTML** (`backend/src/app/editor/chapter-manager.js:57`) — `content.split(/\s+/)` counts HTML tags as "words"; must strip HTML before counting to get accurate word counts after TipTap integration. This is the only backend code change needed.
2. **Content Security** (`frontend/src/lib/sanitize.js:5`) — Current `sanitizeText()` strips ALL HTML tags with `ALLOWED_TAGS: []`. Displaying TipTap HTML output requires a new sanitization function that allows safe tags (b, i, p, h1-h6, ul, ol, li, blockquote, etc.) while stripping scripts and event handlers. DOMPurify is already installed and configured for this use case.
3. **Auto-save timing** — No debounce mechanism exists today; will need either a debounced auto-save or an explicit save button to avoid hammering the API on every keystroke. Zustand `isDraftSaving` flag exists but is unused.
4. **Mobile UX** — ChapterSidebar already has a mobile bottom drawer; TipTap editor must work responsively within the remaining viewport.

---

## Recommendations

### Strategy: Greenfield tipTap Integration
Since `ChapterEditor.jsx` is a placeholder (34 lines, no existing content editing), this is essentially a greenfield integration on the frontend. Backend needs only a word-count fix.

### Order of Execution
1. **New TipTap editor component** (`frontend/src/components/editor/TipTapEditor.jsx`) — `useEditor()` with starter-kit extensions, `EditorContent`, optional `BubbleMenu` for formatting toolbar
2. **New formatting toolbar** (`frontend/src/components/editor/EditorToolbar.jsx`) — Bold, Italic, Underline, Headings, Lists, Blockquote buttons using TipTap's `editor.chain().focus().toggleBold().run()` pattern
3. **Rewrite `ChapterEditor.jsx`** — Replace dashed placeholder with TipTapEditor + toolbar + auto-save debounce
4. **Update `EditorPage.jsx`** — Wire `onContentChange` callback to debounced auto-save via `useUpdateChapter`
5. **Backend wordCount fix** (`chapter-manager.js:57`) — Strip HTML tags before counting: `content.replace(/<[^>]*>/g, '').split(/\s+/)...`
6. **New sanitize function** (`sanitize.js`) — Add `sanitizeRichContent(html)` with TipTap-safe tag allowlist
7. **Zustand draft integration** — Use `book-store.js` `saveDraft()` and `isDraftSaving` during auto-save cycles

### Testing Required
- **Unit**: TipTapEditor renders with initial content; toolbar toggles formatting; auto-save fires on content change
- **Unit**: `sanitizeRichContent()` allows safe HTML, strips `<script>`, `onerror`, etc.
- **Unit**: Backend wordCount correctly counts visible words (not HTML tags)
- **Integration**: Full EditorPage flow: load chapter → edit content → auto-save → reload → content persists
- **Integration**: Mobile responsive: toolbar accessible on small screens

---

## Files to Create/Modify

### Create
| File | Purpose |
|---|---|
| `frontend/src/components/editor/TipTapEditor.jsx` | TipTap `useEditor()` + `EditorContent` component |
| `frontend/src/components/editor/EditorToolbar.jsx` | Formatting toolbar (bold, italic, headings, lists, etc.) |
| `frontend/src/__tests__/TipTapEditor.test.jsx` | Tests for editor rendering and toolbar interactions |
| `frontend/src/__tests__/EditorToolbar.test.jsx` | Tests for toolbar button behavior |

### Modify
| File | Change | Impact |
|---|---|---|
| `frontend/src/app/editor/ChapterEditor.jsx` | Replace dashed placeholder with TipTapEditor + toolbar + auto-save debounce | **High** |
| `frontend/src/app/editor/EditorPage.jsx` | Add `onContentChange` handler for auto-save | **Medium** |
| `backend/src/app/editor/chapter-manager.js:57` | Strip HTML before word counting | **Medium** |
| `frontend/src/lib/sanitize.js` | Add `sanitizeRichContent()` with safe HTML allowlist | **Medium** |

---

## Key Evidence

### Chapter content field type — `String`, stores HTML
```js
// backend/src/app/book/book-model.js:112-115
content: {
  type: String,
  default: '',
},
```
Test confirms HTML storage (`backend/src/app/editor/__tests__/chapter-model.test.js:119`):
```js
content: '<p>Hello world</p>',
```

### Current ChapterEditor — Placeholder (no rich text)
```jsx
// frontend/src/app/editor/ChapterEditor.jsx:23-28
<div className="min-h-[60vh] rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center">
  <p className="text-gray-400 text-sm">
    {t('autoSaveHint')}
  </p>
</div>
```

### Word count uses raw content string (bug for HTML)
```js
// backend/src/app/editor/chapter-manager.js:56-58
if (updates.content !== undefined) {
  cleanUpdates.wordCount = updates.content.split(/\s+/).filter((w) => w.length > 0).length;
}
```

### TipTap installed but completely unused
```json
// frontend/package.json:23-24
"@tiptap/react": "^2.8.0",
"@tiptap/starter-kit": "^2.8.0",
```
Zero imports of `@tiptap` found anywhere in `frontend/src/`.

### Zustand draft state ready
```js
// frontend/src/stores/book-store.js:21-24,56-64
draft: null,
draftLastSavedAt: null,
isDraftSaving: false,
saveDraft: (content) => {
  set({ draft: content, draftLastSavedAt: Date.now() });
},
clearDraft: () => set({ draft: null, draftLastSavedAt: null }),
```

### Validation accepts content as plain string
```js
// backend/src/app/common/validation-schemas.js:165-172
export const chapterPutBodySchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  content: z.string().optional(),
  wordCount: z.number().int().min(0).optional(),
}).refine(
  (data) => data.title !== undefined || data.content !== undefined || data.wordCount !== undefined,
  { message: 'At least one field must be provided for update' },
);
```

---

**Ready for**: Architect
