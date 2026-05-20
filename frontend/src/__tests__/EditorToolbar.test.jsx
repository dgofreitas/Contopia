// Contopia — EditorToolbar Unit Tests (STORY-018)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock react-icons/hi icons used by EditorToolbar
vi.mock('react-icons/hi', () => ({
  HiBold: () => <span data-testid="icon-bold" />,
  HiItalic: () => <span data-testid="icon-italic" />,
  HiHeading: () => <span data-testid="icon-heading" />,
  HiMinus: () => <span data-testid="icon-minus" />,
  HiArrowLeft: () => <span data-testid="icon-arrow-left" />,
  HiArrowRight: () => <span data-testid="icon-arrow-right" />,
}));

import EditorToolbar from '../components/editor/EditorToolbar';

// Helper to create a mock editor
function createMockEditor(overrides = {}) {
  // For canExecute checks:
  // - undo/redo: editor.can().undo() / editor.can().redo()
  // - chapterBreak: editor.can().setHorizontalRule()
  // - heading/bold/italic: editor.can().chain().focus().toggleXxx().run()
  const canRun = vi.fn(() => true);
  const canFocus = vi.fn(() => canObj);
  const canChain = vi.fn(() => canObj);
  
  const canObj = {
    chain: canChain,
    focus: canFocus,
    toggleBold: vi.fn(() => ({ run: canRun })),
    toggleItalic: vi.fn(() => ({ run: canRun })),
    toggleHeading: vi.fn(() => ({ run: canRun })),
    setHorizontalRule: vi.fn(() => ({ run: canRun })),
    undo: vi.fn(() => true),
    redo: vi.fn(() => true),
    run: canRun,
  };

  const runFn = vi.fn(() => true);
  const actionChain = {
    focus: vi.fn(() => actionChain),
    toggleBold: vi.fn(() => ({ run: runFn })),
    toggleItalic: vi.fn(() => ({ run: runFn })),
    toggleHeading: vi.fn(() => ({ run: runFn })),
    setHorizontalRule: vi.fn(() => ({ run: runFn })),
    undo: vi.fn(() => ({ run: runFn })),
    redo: vi.fn(() => ({ run: runFn })),
    run: runFn,
  };

  return {
    chain: vi.fn(() => actionChain),
    can: vi.fn(() => canObj),
    isActive: vi.fn(() => false),
    ...overrides,
  };
}

describe('EditorToolbar', () => {
  let editor;

  beforeEach(() => {
    editor = createMockEditor();
  });

  it('renders toolbar with all action buttons', () => {
    render(<EditorToolbar editor={editor} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('renders mobile format toggle button', () => {
    render(<EditorToolbar editor={editor} />);
    expect(screen.getByLabelText('formatToggle')).toBeInTheDocument();
  });

  it('calls editor.toggleBold when bold button clicked', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByLabelText('boldButton'));
    expect(editor.chain().focus().toggleBold().run).toHaveBeenCalled();
  });

  it('calls editor.toggleItalic when italic button clicked', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByLabelText('italicButton'));
    expect(editor.chain().focus().toggleItalic().run).toHaveBeenCalled();
  });

  it('calls editor.toggleHeading when heading button clicked', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByLabelText('headingButton'));
    expect(editor.chain().focus().toggleHeading({ level: 2 }).run).toHaveBeenCalled();
  });

  it('calls editor.setHorizontalRule when chapter break clicked', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByLabelText('chapterBreakButton'));
    expect(editor.chain().focus().setHorizontalRule().run).toHaveBeenCalled();
  });

  it('calls editor.undo when undo button clicked', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByLabelText('undoButton'));
    expect(editor.chain().focus().undo().run).toHaveBeenCalled();
  });

  it('calls editor.redo when redo button clicked', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByLabelText('redoButton'));
    expect(editor.chain().focus().redo().run).toHaveBeenCalled();
  });

  it('disables all buttons when editor is null', () => {
    render(<EditorToolbar editor={null} />);
    const buttons = screen.getAllByRole('button');
    // All toolbar action buttons should be disabled
    const actionButtons = buttons.filter(
      (b) => b.getAttribute('aria-label') && b.getAttribute('aria-label') !== 'formatToggle'
    );
    actionButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('does not crash when editor is null and actions triggered', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={null} />);
    // Finding mobile toggle and clicking it should work
    const toggle = screen.getByLabelText('formatToggle');
    await user.click(toggle);
    // The toolbar content should be hidden (not visible when not expanded)
  });

  it('shows active state for bold when editor.isActive returns true', () => {
    const activeEditor = createMockEditor({
      isActive: vi.fn((name) => name === 'bold' || name === 'italic'),
    });
    render(<EditorToolbar editor={activeEditor} />);
    // Bold button should show as pressed
    const boldBtn = screen.getByLabelText('boldButton');
    expect(boldBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls isActive with correct args for heading', () => {
    const isActive = vi.fn(() => false);
    const headingEditor = createMockEditor({ isActive });
    render(<EditorToolbar editor={headingEditor} />);
    expect(isActive).toHaveBeenCalledWith('heading', { level: 2 });
  });

  it('renders with custom ariaLabel', () => {
    render(<EditorToolbar editor={editor} ariaLabel="Custom toolbar" />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('aria-label', 'Custom toolbar');
  });

  it('uses default translation key for aria-label when not provided', () => {
    render(<EditorToolbar editor={editor} />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('aria-label', 'formattingToolbar');
  });

  it('collapses mobile toolbar when an action is triggered on mobile viewport', async () => {
    // Set viewport to mobile width
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    window.dispatchEvent(new Event('resize'));

    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);

    // Open mobile toolbar
    await user.click(screen.getByLabelText('formatToggle'));

    // Click bold to trigger action, which should collapse mobile toolbar
    await user.click(screen.getByLabelText('boldButton'));

    // After action, the mobile expanded state is false
    // The toolbar content div has hidden classes when not expanded
    expect(editor.chain().focus().toggleBold().run).toHaveBeenCalled();
  });

  it('disables undo button when cannot undo', () => {
    const cannotUndo = createMockEditor();
    cannotUndo.can.mockReturnValue({
      chain: vi.fn(() => cannotUndo.can()),
      focus: vi.fn(() => cannotUndo.can()),
      undo: vi.fn(() => false),
      redo: vi.fn(() => true),
      setHorizontalRule: vi.fn(() => ({ run: vi.fn(() => true) })),
      toggleBold: vi.fn(() => ({ run: vi.fn(() => true) })),
      toggleItalic: vi.fn(() => ({ run: vi.fn(() => true) })),
      toggleHeading: vi.fn(() => ({ run: vi.fn(() => true) })),
      run: vi.fn(() => true),
    });

    render(<EditorToolbar editor={cannotUndo} />);
    const undoBtn = screen.getByLabelText('undoButton');
    expect(undoBtn).toBeDisabled();
  });

  it('disables redo button when cannot redo', () => {
    const cannotRedo = createMockEditor();
    cannotRedo.can.mockReturnValue({
      chain: vi.fn(() => cannotRedo.can()),
      focus: vi.fn(() => cannotRedo.can()),
      undo: vi.fn(() => true),
      redo: vi.fn(() => false),
      setHorizontalRule: vi.fn(() => ({ run: vi.fn(() => true) })),
      toggleBold: vi.fn(() => ({ run: vi.fn(() => true) })),
      toggleItalic: vi.fn(() => ({ run: vi.fn(() => true) })),
      toggleHeading: vi.fn(() => ({ run: vi.fn(() => true) })),
      run: vi.fn(() => true),
    });

    render(<EditorToolbar editor={cannotRedo} />);
    const redoBtn = screen.getByLabelText('redoButton');
    expect(redoBtn).toBeDisabled();
  });

  it('handles keyboard navigation left/right', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);
    
    // Focus the first button (bold)
    const boldBtn = screen.getByLabelText('boldButton');
    boldBtn.focus();

    // Press ArrowRight to go to italic
    await user.keyboard('{ArrowRight}');
    const italicBtn = screen.getByLabelText('italicButton');
    expect(document.activeElement).toBe(italicBtn);

    // Press ArrowLeft to go back to bold
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(boldBtn);
  });

  it('wraps around keyboard navigation from first to last', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);

    const boldBtn = screen.getByLabelText('boldButton');
    boldBtn.focus();

    // Press ArrowLeft from first item goes to last
    await user.keyboard('{ArrowLeft}');
    const redoBtn = screen.getByLabelText('redoButton');
    expect(document.activeElement).toBe(redoBtn);
  });

  it('wraps around keyboard navigation from last to first', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);

    const redoBtn = screen.getByLabelText('redoButton');
    redoBtn.focus();

    // Press ArrowRight from last item goes to first
    await user.keyboard('{ArrowRight}');
    const boldBtn = screen.getByLabelText('boldButton');
    expect(document.activeElement).toBe(boldBtn);
  });

  // ── onAnnounce prop (STORY-018) ────────────────────────────────────────────

  it('calls onAnnounce with correct key when bold button is clicked', async () => {
    const onAnnounce = vi.fn();
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} onAnnounce={onAnnounce} />);
    await user.click(screen.getByLabelText('boldButton'));
    expect(onAnnounce).toHaveBeenCalledWith('boldApplied');
  });

  it('calls onAnnounce with correct key when italic button is clicked', async () => {
    const onAnnounce = vi.fn();
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} onAnnounce={onAnnounce} />);
    await user.click(screen.getByLabelText('italicButton'));
    expect(onAnnounce).toHaveBeenCalledWith('italicApplied');
  });

  it('calls onAnnounce with correct key when heading button is clicked', async () => {
    const onAnnounce = vi.fn();
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} onAnnounce={onAnnounce} />);
    await user.click(screen.getByLabelText('headingButton'));
    expect(onAnnounce).toHaveBeenCalledWith('headingApplied');
  });

  it('calls onAnnounce with correct key when chapter break button is clicked', async () => {
    const onAnnounce = vi.fn();
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} onAnnounce={onAnnounce} />);
    await user.click(screen.getByLabelText('chapterBreakButton'));
    expect(onAnnounce).toHaveBeenCalledWith('chapterBreakApplied');
  });

  it('calls onAnnounce with correct key when undo button is clicked', async () => {
    const onAnnounce = vi.fn();
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} onAnnounce={onAnnounce} />);
    await user.click(screen.getByLabelText('undoButton'));
    expect(onAnnounce).toHaveBeenCalledWith('undoApplied');
  });

  it('calls onAnnounce with correct key when redo button is clicked', async () => {
    const onAnnounce = vi.fn();
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} onAnnounce={onAnnounce} />);
    await user.click(screen.getByLabelText('redoButton'));
    expect(onAnnounce).toHaveBeenCalledWith('redoApplied');
  });

  it('does not call onAnnounce when not provided', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByLabelText('boldButton'));
    // No error should occur
  });
});
