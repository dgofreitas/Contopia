// Contopia — ChapterListItem Component Tests (STORY-017)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterListItem from '../app/editor/ChapterListItem';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Mock @dnd-kit/sortable to avoid needing DnD context
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

const sampleChapter = { _id: 'c1', title: 'Chapter 1', order: 0 };

const defaultProps = {
  chapter: sampleChapter,
  isActive: false,
  onSelect: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  position: 0,
  totalCount: 3,
};

describe('ChapterListItem', () => {
  it('renders chapter title', () => {
    render(<ChapterListItem {...defaultProps} />);
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
  });

  it('has correct aria-label with position', () => {
    render(<ChapterListItem {...defaultProps} position={0} totalCount={3} />);
    expect(screen.getByRole('listitem')).toHaveAttribute(
      'aria-label',
      'Chapter 1: Chapter 1'
    );
  });

  it('applies active styling when isActive is true', () => {
    const { container } = render(<ChapterListItem {...defaultProps} isActive={true} />);
    const listItem = container.querySelector('li');
    expect(listItem.className).toContain('bg-amber-100');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} onSelect={onSelect} />);
    await user.click(screen.getByRole('listitem'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('calls onSelect on Enter key', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} onSelect={onSelect} />);
    const listItem = screen.getByRole('listitem');
    listItem.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('renders delete button', () => {
    render(<ChapterListItem {...defaultProps} />);
    expect(screen.getByLabelText('chapterDelete')).toBeInTheDocument();
  });

  it('opens delete dialog when delete button clicked', async () => {
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} />);
    await user.click(screen.getByLabelText('chapterDelete'));
    expect(screen.getByText('chapterDeleteConfirm')).toBeInTheDocument();
  });

  it('renders reorder buttons', () => {
    render(<ChapterListItem {...defaultProps} />);
    expect(screen.getByLabelText('chapterMoveUp')).toBeInTheDocument();
    expect(screen.getByLabelText('chapterMoveDown')).toBeInTheDocument();
  });

  it('disables move up for first item (position 0)', () => {
    render(<ChapterListItem {...defaultProps} position={0} totalCount={3} />);
    expect(screen.getByLabelText('chapterMoveUp')).toBeDisabled();
    expect(screen.getByLabelText('chapterMoveDown')).toBeEnabled();
  });

  it('disables move down for last item', () => {
    render(<ChapterListItem {...defaultProps} position={2} totalCount={3} />);
    expect(screen.getByLabelText('chapterMoveUp')).toBeEnabled();
    expect(screen.getByLabelText('chapterMoveDown')).toBeDisabled();
  });

  it('calls onMoveUp when up button clicked', async () => {
    const onMoveUp = vi.fn();
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} position={1} totalCount={3} onMoveUp={onMoveUp} />);
    await user.click(screen.getByLabelText('chapterMoveUp'));
    expect(onMoveUp).toHaveBeenCalledWith('c1');
  });

  it('calls onMoveDown when down button clicked', async () => {
    const onMoveDown = vi.fn();
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} position={0} totalCount={3} onMoveDown={onMoveDown} />);
    await user.click(screen.getByLabelText('chapterMoveDown'));
    expect(onMoveDown).toHaveBeenCalledWith('c1');
  });

  it('renders drag handle with correct aria-label', () => {
    render(<ChapterListItem {...defaultProps} />);
    const handle = screen.getByLabelText('chapterReorder');
    expect(handle).toBeInTheDocument();
  });

  // === NEW TESTS for uncovered lines ===

  // Covers line 42-43: handleRename calls onRename with { chapterId, title }
  it('calls onRename with chapterId and new title when InlineEditTitle saves', async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} onRename={onRename} />);

    // InlineEditTitle renders a button showing the title. Click to enter edit mode.
    const titleBtn = screen.getByLabelText('chapterRename');
    await user.click(titleBtn);

    // Now an input appears with the current title value
    const input = screen.getByRole('textbox');
    // Clear all text and type new one (use tripple-click + type to avoid space issues)
    await user.tripleClick(input);
    await user.keyboard('RenamedChapter');

    // Press Enter to save
    await user.keyboard('{Enter}');

    // onRename should be called with { chapterId: 'c1', title: 'RenamedChapter' }
    expect(onRename).toHaveBeenCalledWith({
      chapterId: 'c1',
      title: 'RenamedChapter',
    });
  });

  // Covers lines 46-48: handleConfirmDelete calls onDelete and closes dialog
  it('calls onDelete with chapterId when delete is confirmed in dialog', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} onDelete={onDelete} />);

    // Open delete dialog
    await user.click(screen.getByLabelText('chapterDelete'));

    // Confirm dialog — find the Button with color="failure" (the confirm button)
    // Use getAllByText and find the one inside a button element
    const confirmBtn = screen.getByRole('button', { name: 'chapterDelete' });
    await user.click(confirmBtn);

    // onDelete should be called with { chapterId: 'c1' }
    expect(onDelete).toHaveBeenCalledWith({ chapterId: 'c1' });
  });

  // Covers lines 46-48: dialog is closed after confirm (setShowDeleteDialog(false))
  it('closes delete dialog after confirming deletion', async () => {
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} />);

    // Open dialog
    await user.click(screen.getByLabelText('chapterDelete'));
    expect(screen.getByText('chapterDeleteConfirm')).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: 'chapterDelete' });
    await user.click(confirmBtn);

    // Dialog should be closed now
    expect(screen.queryByText('chapterDeleteConfirm')).not.toBeInTheDocument();
  });

  // Covers line 42-43: handleRename called with empty title should not trigger onRename
  it('does not call onRename when title is empty after save', async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} onRename={onRename} />);

    // Click to enter edit mode
    const titleBtn = screen.getByLabelText('chapterRename');
    await user.click(titleBtn);

    // Clear the input
    const input = screen.getByRole('textbox');
    await user.clear(input);

    // Press Enter with empty value
    await user.keyboard('{Enter}');

    // onRename should NOT be called (empty title is not saved)
    expect(onRename).not.toHaveBeenCalled();
  });

  // Covers isDragging style
  it('has full opacity when not dragging', () => {
    const { container } = render(<ChapterListItem {...defaultProps} />);
    const listItem = container.querySelector('li');
    expect(listItem.style.opacity).toBe('1');
  });

  // Covers keyboard Space key handler (line 67-70)
  it('calls onSelect on Space key', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ChapterListItem {...defaultProps} onSelect={onSelect} />);
    const listItem = screen.getByRole('listitem');
    listItem.focus();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  // Covers canMoveUp/canMoveDown boundary cases
  it('disables move up and move down for single item', () => {
    render(<ChapterListItem {...defaultProps} position={0} totalCount={1} />);
    expect(screen.getByLabelText('chapterMoveUp')).toBeDisabled();
    expect(screen.getByLabelText('chapterMoveDown')).toBeDisabled();
  });
});
