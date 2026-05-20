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
    // Dialog should open (checked via presence of warning text in dialog body)
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
});
