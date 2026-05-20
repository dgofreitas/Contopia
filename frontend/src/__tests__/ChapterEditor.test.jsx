// Contopia — ChapterEditor Unit Tests (STORY-017, STORY-018)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ChapterEditor from '../app/editor/ChapterEditor';

// ── Module-level mocks ──────────────────────────────────────────────────────

// Mock i18n (already global in setup.js, but explicit for safety)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Track the onUpdate callback passed to TipTapEditor
let registeredOnUpdate = null;
let registeredEditorRef = null;

const mockTipTapEditor = {
  getHTML: vi.fn(() => '<p>Hello</p>'),
  isDestroyed: false,
  commands: { setContent: vi.fn() },
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({ toggleBold: vi.fn(() => ({ run: vi.fn() })) })),
  })),
  can: vi.fn(() => ({
    chain: vi.fn(() => ({ focus: vi.fn(() => ({ toggleBold: vi.fn(() => ({ run: vi.fn(() => true) })) })) })),
  })),
  isActive: vi.fn(() => false),
  destroy: vi.fn(),
};

vi.mock('../components/editor/TipTapEditor', () => ({
  default: ({ onUpdate, editorRef, content, placeholder, ariaLabel, chapterId }) => {
    registeredOnUpdate = onUpdate;
    registeredEditorRef = editorRef;
    // Call editorRef with mock editor instance so editorInstance is set
    if (editorRef) {
      editorRef(mockTipTapEditor);
    }
    return (
      <div data-testid="tiptap-editor" data-content={content} data-chapterid={chapterId}>
        TipTap Editor
      </div>
    );
  },
}));

vi.mock('../components/editor/EditorToolbar', () => ({
  default: ({ onAnnounce }) => (
    <div data-testid="editor-toolbar" onClick={() => onAnnounce && onAnnounce('boldApplied')}>
      Toolbar
    </div>
  ),
}));

vi.mock('../components/editor/AutoSaveIndicator', () => ({
  default: ({ isSaving, lastSavedAt, isDirty }) => (
    <div
      data-testid="auto-save-indicator"
      data-issaving={isSaving ? 'true' : 'false'}
      data-isdirty={isDirty ? 'true' : 'false'}
      data-lastsaved={lastSavedAt != null ? 'set' : 'null'}
    >
      AutoSave
    </div>
  ),
}));

// Create store mocks at module level so tests can inspect
const mockSaveDraft = vi.fn();
const mockClearDraft = vi.fn();

vi.mock('../stores/book-store', () => ({
  default: vi.fn((selector) => {
    const state = { saveDraft: mockSaveDraft, clearDraft: mockClearDraft };
    return selector(state);
  }),
}));

// ── Mock useEditor from @tiptap/react ───────────────────────────────────────
const mockEditor = {
  getHTML: vi.fn(() => '<p>Hello</p>'),
  isDestroyed: false,
  commands: { setContent: vi.fn() },
  destroy: vi.fn(),
};

vi.mock('@tiptap/react', () => ({
  useEditor: () => mockEditor,
  EditorContent: () => null,
}));

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ChapterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    registeredOnUpdate = null;
    registeredEditorRef = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Rendering tests ─────────────────────────────────────────────────────

  it('renders chapter title when chapter is provided', () => {
    const chapter = { _id: 'c1', title: 'My Chapter', content: '' };
    render(<ChapterEditor chapter={chapter} />);
    expect(screen.getByText('My Chapter')).toBeInTheDocument();
  });

  it('renders empty state message when no chapter', () => {
    render(<ChapterEditor chapter={null} />);
    expect(screen.getByText('addChapter')).toBeInTheDocument();
  });

  it('renders undefined chapter as empty state', () => {
    render(<ChapterEditor chapter={undefined} />);
    expect(screen.getByText('addChapter')).toBeInTheDocument();
  });

  it('renders TipTap editor when chapter exists', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} />);
    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
  });

  it('renders auto save indicator when chapter exists', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} />);
    expect(screen.getByTestId('auto-save-indicator')).toBeInTheDocument();
  });

  it('renders EditorToolbar when editor instance is available', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} />);
    // Toolbar renders because useEditor mock returns an editor
    expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
  });

  it('passes chapter content and id to TipTapEditor', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '<p>Hello</p>' };
    render(<ChapterEditor chapter={chapter} />);
    const editor = screen.getByTestId('tiptap-editor');
    expect(editor).toHaveAttribute('data-content', '<p>Hello</p>');
    expect(editor).toHaveAttribute('data-chapterid', 'c1');
  });

  // ── Auto-save behavior ──────────────────────────────────────────────────

  it('triggers auto-save after debounce delay when content updates', () => {
    const onContentChange = vi.fn(() => Promise.resolve());
    const chapter = { _id: 'c1', title: 'Test', content: '' };

    render(<ChapterEditor chapter={chapter} onContentChange={onContentChange} />);

    // Simulate TipTapEditor calling onUpdate
    act(() => {
      registeredOnUpdate('<p>New content</p>');
    });

    // AutoSaveIndicator should show dirty state immediately
    const indicator = screen.getByTestId('auto-save-indicator');
    expect(indicator).toHaveAttribute('data-isdirty', 'true');

    // Time-travel past the debounce delay (1500ms)
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // onContentChange should have been called
    expect(onContentChange).toHaveBeenCalledWith({
      chapterId: 'c1',
      content: '<p>New content</p>',
    });
  });

  it('shows saving state during async save', async () => {
    let resolvePromise;
    const savePromise = new Promise((resolve) => { resolvePromise = resolve; });
    const onContentChange = vi.fn(() => savePromise);
    const chapter = { _id: 'c1', title: 'Test', content: '' };

    render(<ChapterEditor chapter={chapter} onContentChange={onContentChange} />);

    act(() => {
      registeredOnUpdate('<p>Test</p>');
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should be in saving state
    const indicator = screen.getByTestId('auto-save-indicator');
    expect(indicator).toHaveAttribute('data-issaving', 'true');

    // Resolve the save
    await act(async () => {
      resolvePromise();
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should no longer be saving
    const indicatorAfter = screen.getByTestId('auto-save-indicator');
    expect(indicatorAfter).toHaveAttribute('data-issaving', 'false');
  });

  it('saves draft when async save fails', async () => {
    const onContentChange = vi.fn(() => Promise.reject(new Error('Save failed')));
    const chapter = { _id: 'c1', title: 'Test', content: '' };

    render(<ChapterEditor chapter={chapter} onContentChange={onContentChange} />);

    act(() => {
      registeredOnUpdate('<p>Failed content</p>');
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Wait for promise rejection to propagate
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should have called saveDraft with the sanitized content
    expect(mockSaveDraft).toHaveBeenCalled();
  });

  it('clears draft on successful save', async () => {
    const onContentChange = vi.fn(() => Promise.resolve());
    const chapter = { _id: 'c1', title: 'Test', content: '' };

    render(<ChapterEditor chapter={chapter} onContentChange={onContentChange} />);

    act(() => {
      registeredOnUpdate('<p>Success</p>');
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockClearDraft).toHaveBeenCalled();
  });

  it('cancels previous debounce timer when content updates rapidly', () => {
    const onContentChange = vi.fn(() => Promise.resolve());
    const chapter = { _id: 'c1', title: 'Test', content: '' };

    render(<ChapterEditor chapter={chapter} onContentChange={onContentChange} />);

    // Simulate rapid edits
    act(() => {
      registeredOnUpdate('<p>First draft</p>');
    });

    act(() => {
      vi.advanceTimersByTime(500); // Before debounce fires
    });

    act(() => {
      registeredOnUpdate('<p>Second draft</p>');
    });

    // Only 500ms from last edit — should not have fired yet
    expect(onContentChange).not.toHaveBeenCalled();

    // Advance full debounce from last edit
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should have fired only once with the final content
    expect(onContentChange).toHaveBeenCalledTimes(1);
    expect(onContentChange).toHaveBeenCalledWith({
      chapterId: 'c1',
      content: '<p>Second draft</p>',
    });
  });

  // ── Chapter change behavior (uncovered lines 71-81) ──────────────────────

  it('resets dirty state when chapter changes', () => {
    const chapter1 = { _id: 'c1', title: 'Chapter 1', content: '' };
    const chapter2 = { _id: 'c2', title: 'Chapter 2', content: '' };

    const { rerender } = render(<ChapterEditor chapter={chapter1} />);

    // Make it dirty
    act(() => {
      registeredOnUpdate('<p>Edited</p>');
    });

    let indicator = screen.getByTestId('auto-save-indicator');
    expect(indicator).toHaveAttribute('data-isdirty', 'true');

    // Switch to a different chapter
    rerender(<ChapterEditor chapter={chapter2} />);

    indicator = screen.getByTestId('auto-save-indicator');
    expect(indicator).toHaveAttribute('data-isdirty', 'false');
  });

  it('clears lastSavedAt when chapter changes', async () => {
    const chapter1 = { _id: 'c1', title: 'Chapter 1', content: '' };
    const chapter2 = { _id: 'c2', title: 'Chapter 2', content: '' };
    const onContentChange = vi.fn(() => Promise.resolve());

    const { rerender } = render(
      <ChapterEditor chapter={chapter1} onContentChange={onContentChange} />
    );

    // Trigger a save
    act(() => { registeredOnUpdate('<p>Save me</p>'); });
    await act(async () => { vi.advanceTimersByTime(1500); });
    await act(async () => { vi.advanceTimersByTimeAsync(0); });

    // lastSavedAt should now be set
    let indicator = screen.getByTestId('auto-save-indicator');
    expect(indicator).toHaveAttribute('data-lastsaved', 'set');

    // Switch chapter
    rerender(<ChapterEditor chapter={chapter2} />);

    indicator = screen.getByTestId('auto-save-indicator');
    expect(indicator).toHaveAttribute('data-lastsaved', 'null');
  });

  it('cancels pending debounce when chapter changes', () => {
    const chapter1 = { _id: 'c1', title: 'Chapter 1', content: '' };
    const chapter2 = { _id: 'c2', title: 'Chapter 2', content: '' };
    const onContentChange = vi.fn(() => Promise.resolve());

    const { rerender } = render(
      <ChapterEditor chapter={chapter1} onContentChange={onContentChange} />
    );

    // Trigger an edit but don't advance time past debounce
    act(() => {
      registeredOnUpdate('<p>Pending</p>');
    });

    // Switch chapter immediately (before debounce fires)
    rerender(<ChapterEditor chapter={chapter2} onContentChange={onContentChange} />);

    // Advance past debounce — should NOT fire for chapter1
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onContentChange).not.toHaveBeenCalled();
  });

  // ── Unmount cleanup (uncovered lines 83-89) ─────────────────────────────

  it('cleans up debounce timer on unmount', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    const onContentChange = vi.fn(() => Promise.resolve());

    const { unmount } = render(
      <ChapterEditor chapter={chapter} onContentChange={onContentChange} />
    );

    // Trigger edit
    act(() => {
      registeredOnUpdate('<p>Will be cleaned</p>');
    });

    // Unmount before debounce
    unmount();

    // Advance past debounce — should NOT fire
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onContentChange).not.toHaveBeenCalled();
  });

  it('handles synchronous onContentChange (non-promise)', () => {
    const onContentChange = vi.fn(() => undefined); // synchronous, returns nothing
    const chapter = { _id: 'c1', title: 'Test', content: '' };

    render(<ChapterEditor chapter={chapter} onContentChange={onContentChange} />);

    act(() => {
      registeredOnUpdate('<p>Sync save</p>');
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should have been called
    expect(onContentChange).toHaveBeenCalled();

    // Should not be in saving state (no promise)
    const indicator = screen.getByTestId('auto-save-indicator');
    expect(indicator).toHaveAttribute('data-issaving', 'false');
  });

  // ── aria-live announcement (STORY-018) ────────────────────────────────────

  it('populates aria-live region when toolbar announces formatting action', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('');

    const toolbar = screen.getByTestId('editor-toolbar');
    act(() => {
      toolbar.click();
    });

    expect(liveRegion).toHaveTextContent('boldApplied');
  });

  it('clears aria-live region after announcement timeout', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} />);

    const toolbar = screen.getByTestId('editor-toolbar');
    act(() => {
      toolbar.click();
    });

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('boldApplied');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(liveRegion).toHaveTextContent('');
  });

  it('cancels previous announcement timer on rapid announcements', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} />);

    const toolbar = screen.getByTestId('editor-toolbar');
    const liveRegion = screen.getByRole('status');

    act(() => {
      toolbar.click();
    });

    expect(liveRegion).toHaveTextContent('boldApplied');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      toolbar.click();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(liveRegion).toHaveTextContent('boldApplied');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(liveRegion).toHaveTextContent('');
  });

  it('cleans up announcement timer on unmount', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    const { unmount } = render(<ChapterEditor chapter={chapter} />);

    const toolbar = screen.getByTestId('editor-toolbar');
    act(() => {
      toolbar.click();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });
});
