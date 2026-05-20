// Contopia — ChapterEditor Unit Tests (STORY-019)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ChapterEditor from '../app/editor/ChapterEditor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

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
  default: ({ saveStatus, lastSavedAt, isDirty, conflictInfo }) => (
    <div
      data-testid="auto-save-indicator"
      data-savestatus={saveStatus || 'idle'}
      data-isdirty={isDirty ? 'true' : 'false'}
      data-lastsaved={lastSavedAt != null ? 'set' : 'null'}
      data-conflictinfo={conflictInfo || 'none'}
    >
      AutoSave
    </div>
  ),
}));

const mockUseAutoSave = vi.fn();
vi.mock('../hooks/useAutoSave', () => ({
  default: (...args) => mockUseAutoSave(...args),
}));

const mockUseDraftRecovery = vi.fn();
vi.mock('../hooks/useDraftRecovery', () => ({
  default: (...args) => mockUseDraftRecovery(...args),
}));

vi.mock('../lib/sanitize', () => ({
  sanitizeRichContent: (html) => html,
}));

describe('ChapterEditor', () => {
  const defaultAutoSaveReturn = {
    isSaving: false,
    isLocalSaving: false,
    isDirty: false,
    isOffline: false,
    lastSavedAt: null,
    saveStatus: 'idle',
    conflictInfo: null,
    saveNow: vi.fn(),
  };

  const defaultDraftRecoveryReturn = {
    hasDraft: false,
    draftContent: null,
    shouldRestore: false,
    conflictWarning: null,
    restoreDraft: vi.fn(),
    discardDraft: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    registeredOnUpdate = null;
    registeredEditorRef = null;

    mockUseAutoSave.mockReturnValue({ ...defaultAutoSaveReturn });
    mockUseDraftRecovery.mockReturnValue({ ...defaultDraftRecoveryReturn });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders chapter title when chapter is provided', () => {
    const chapter = { _id: 'c1', title: 'My Chapter', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);
    expect(screen.getByText('My Chapter')).toBeInTheDocument();
  });

  it('renders empty state message when no chapter', () => {
    render(<ChapterEditor chapter={null} bookId="b1" />);
    expect(screen.getByText('addChapter')).toBeInTheDocument();
  });

  it('renders undefined chapter as empty state', () => {
    render(<ChapterEditor chapter={undefined} bookId="b1" />);
    expect(screen.getByText('addChapter')).toBeInTheDocument();
  });

  it('renders TipTap editor when chapter exists', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);
    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
  });

  it('renders auto save indicator when chapter exists', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);
    expect(screen.getByTestId('auto-save-indicator')).toBeInTheDocument();
  });

  it('renders EditorToolbar when editor instance is available', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);
    expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
  });

  it('passes chapter content and id to TipTapEditor', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '<p>Hello</p>' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);
    const editor = screen.getByTestId('tiptap-editor');
    expect(editor).toHaveAttribute('data-content', '<p>Hello</p>');
    expect(editor).toHaveAttribute('data-chapterid', 'c1');
  });

  it('calls useAutoSave with correct props', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '', updatedAt: '2025-06-15T14:30:00Z' };
    const onContentChange = vi.fn();
    render(<ChapterEditor chapter={chapter} bookId="b1" onContentChange={onContentChange} />);

    expect(mockUseAutoSave).toHaveBeenCalled();
    const callArgs = mockUseAutoSave.mock.calls[0][0];
    expect(callArgs.bookId).toBe('b1');
    expect(callArgs.chapterId).toBe('c1');
    expect(callArgs.serverVersion).toBe('2025-06-15T14:30:00Z');
    expect(callArgs.enabled).toBe(true);
  });

  it('calls useDraftRecovery with correct props', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '', updatedAt: '2025-06-15T14:30:00Z' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);

    expect(mockUseDraftRecovery).toHaveBeenCalledWith('b1', 'c1', '2025-06-15T14:30:00Z');
  });

  it('passes saveStatus to AutoSaveIndicator', () => {
    mockUseAutoSave.mockReturnValue({
      ...defaultAutoSaveReturn,
      saveStatus: 'saving',
      isDirty: true,
    });

    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);

    const indicator = screen.getByTestId('auto-save-indicator');
    expect(indicator).toHaveAttribute('data-savestatus', 'saving');
    expect(indicator).toHaveAttribute('data-isdirty', 'true');
  });

  it('updates content through useAutoSave hook when content changes', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);

    act(() => {
      registeredOnUpdate('<p>New content</p>');
    });

    expect(mockUseAutoSave).toHaveBeenCalled();
  });

  it('shows draft recovery banner when hasDraft is true and no restored content', () => {
    mockUseDraftRecovery.mockReturnValue({
      ...defaultDraftRecoveryReturn,
      hasDraft: true,
      draftContent: '<p>Saved content</p>',
      shouldRestore: true,
    });

    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);

    expect(screen.getByText('unsavedChanges')).toBeInTheDocument();
  });

  it('restores draft content when shouldRestore is true', () => {
    mockUseDraftRecovery.mockReturnValue({
      ...defaultDraftRecoveryReturn,
      hasDraft: true,
      draftContent: '<p>Restored content</p>',
      shouldRestore: true,
    });

    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);

    const editor = screen.getByTestId('tiptap-editor');
    expect(editor).toHaveAttribute('data-content', '<p>Restored content</p>');
  });

  it('clears state on chapter change', () => {
    const chapter1 = { _id: 'c1', title: 'Chapter 1', content: '' };
    const chapter2 = { _id: 'c2', title: 'Chapter 2', content: '' };

    const { rerender } = render(<ChapterEditor chapter={chapter1} bookId="b1" />);

    rerender(<ChapterEditor chapter={chapter2} bookId="b1" />);

    expect(mockUseAutoSave).toHaveBeenCalled();
    const lastCallArgs = mockUseAutoSave.mock.calls[mockUseAutoSave.mock.calls.length - 1][0];
    expect(lastCallArgs.chapterId).toBe('c2');
  });

  it('populates aria-live region when toolbar announces formatting action', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    render(<ChapterEditor chapter={chapter} bookId="b1" />);

    const toolbar = screen.getByTestId('editor-toolbar');
    act(() => {
      toolbar.click();
    });

    const liveRegions = screen.getAllByRole('status');
    expect(liveRegions.some(el => el.textContent.includes('boldApplied'))).toBe(true);
  });

    const liveRegions = screen.getAllByRole('status');
    expect(liveRegions.length).toBeGreaterThanOrEqual(1);
    expect(liveRegions.some(el => el.textContent.includes('boldApplied'))).toBe(true);
  });

  it('cleans up announcement timer on unmount', () => {
    const chapter = { _id: 'c1', title: 'Test', content: '' };
    const { unmount } = render(<ChapterEditor chapter={chapter} bookId="b1" />);

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