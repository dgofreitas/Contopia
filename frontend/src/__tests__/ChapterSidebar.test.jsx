// Contopia — ChapterSidebar Component Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterSidebar from '../app/editor/ChapterSidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Mock dnd-kit modules
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: (sensor) => sensor,
  useSensors: (...sensors) => sensors,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToVerticalAxis: vi.fn(),
}));

// Mock child components
vi.mock('../app/editor/ChapterListItem', () => ({
  default: ({ chapter, isActive }) => (
    <div data-testid={`chapter-item-${chapter._id}`} data-active={isActive}>
      {chapter.title}
    </div>
  ),
}));

vi.mock('../app/editor/AddChapterButton', () => ({
  default: ({ chaptersCount, onAdd, isCreating }) => (
    <button data-testid="add-chapter-btn" onClick={onAdd} disabled={chaptersCount >= 50 || isCreating}>
      Add Chapter ({chaptersCount})
    </button>
  ),
}));

// Mock useReorderChapters
vi.mock('../hooks/useReorderChapters', () => ({
  default: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}));

const sampleChapters = [
  { _id: 'c1', title: 'Chapter 1', order: 0 },
  { _id: 'c2', title: 'Chapter 2', order: 1 },
  { _id: 'c3', title: 'Chapter 3', order: 2 },
];

const defaultProps = {
  bookId: 'book123',
  chapters: sampleChapters,
  activeChapterId: 'c1',
  onSelectChapter: vi.fn(),
  onAddChapter: vi.fn(),
  onRenameChapter: vi.fn(),
  onDeleteChapter: vi.fn(),
  isCreatingChapter: false,
};

describe('ChapterSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar with chapters', () => {
    render(<ChapterSidebar {...defaultProps} />);
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('Chapter 2')).toBeInTheDocument();
    expect(screen.getByText('Chapter 3')).toBeInTheDocument();
  });

  it('renders chapter navigation heading', () => {
    render(<ChapterSidebar {...defaultProps} />);
    const headings = screen.getAllByText('chapterNav');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state message when no chapters', () => {
    render(<ChapterSidebar {...defaultProps} chapters={[]} />);
    // Empty state uses the translation key as text content
    const emptyMessages = screen.getAllByText('addChapter');
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
  });

  it('renders add chapter button', () => {
    render(<ChapterSidebar {...defaultProps} />);
    expect(screen.getByTestId('add-chapter-btn')).toBeInTheDocument();
  });

  it('marks active chapter item as active', () => {
    render(<ChapterSidebar {...defaultProps} activeChapterId="c2" />);
    expect(screen.getByTestId('chapter-item-c2')).toHaveAttribute('data-active', 'true');
  });

  it('calls onAddChapter when add button clicked', async () => {
    const onAddChapter = vi.fn();
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} onAddChapter={onAddChapter} />);
    await user.click(screen.getByTestId('add-chapter-btn'));
    expect(onAddChapter).toHaveBeenCalledTimes(1);
  });

  it('shows screen reader live region', () => {
    render(<ChapterSidebar {...defaultProps} />);
    const liveRegion = document.getElementById('chapter-reorder-announce');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('passes isCreating to add button', () => {
    render(<ChapterSidebar {...defaultProps} isCreatingChapter={true} />);
    expect(screen.getByTestId('add-chapter-btn')).toBeDisabled();
  });
});
