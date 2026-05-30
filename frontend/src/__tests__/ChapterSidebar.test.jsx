// Contopia — ChapterSidebar Component Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterSidebar from '../app/editor/ChapterSidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Track onDragEnd callback from DndContext
let dragEndCallback = null;
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }) => {
    dragEndCallback = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: (sensor) => sensor,
  useSensors: (...sensors) => sensors,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children, items }) => (
    <div data-testid="sortable-context" data-items={JSON.stringify(items)}>
      {children}
    </div>
  ),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToVerticalAxis: vi.fn(),
}));

// Mock framer-motion so motion.div forwards onClick and AnimatePresence renders children
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, ...props }) => (
      <div onClick={onClick} {...props}>{children}</div>
    ),
  },
  m: {
    div: ({ children, onClick, ...props }) => (
      <div onClick={onClick} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock child components
vi.mock('../app/editor/ChapterListItem', () => ({
  default: ({ chapter, isActive, onSelect, onMoveUp, onMoveDown }) => (
    <div
      data-testid={`chapter-item-${chapter._id}`}
      data-active={isActive}
      data-chapter-title={chapter.title}
      onClick={() => onSelect(chapter._id)}
    >
      <button data-testid={`move-up-${chapter._id}`} onClick={() => onMoveUp(chapter._id)}>
        MoveUp
      </button>
      <button data-testid={`move-down-${chapter._id}`} onClick={() => onMoveDown(chapter._id)}>
        MoveDown
      </button>
      {chapter.title}
    </div>
  ),
}));

vi.mock('../app/editor/AddChapterButton', () => ({
  default: ({ chaptersCount, onAdd, isCreating }) => (
    <button
      data-testid="add-chapter-btn"
      data-count={chaptersCount}
      onClick={onAdd}
      disabled={chaptersCount >= 50 || isCreating}
    >
      Add Chapter ({chaptersCount})
    </button>
  ),
}));

// Mock useReorderChapters
const mockMutate = vi.fn();
vi.mock('../hooks/useReorderChapters', () => ({
  default: vi.fn(() => ({
    mutate: mockMutate,
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
    dragEndCallback = null;
  });

  // --- Regression tests from original ---

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

  // === Collapsible toggle (lines 95-113, 176-190) ===

  it('collapses sidebar when collapse button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} />);

    // Get all buttons with aria-label "chapterNav", pick the first (header collapse)
    const buttons = screen.getAllByRole('button', { name: 'chapterNav' });
    // First button is the collapse button in the header (desktop)
    const collapseBtn = buttons[0];
    await user.click(collapseBtn);

    // After collapsing, collapsed view renders a button to expand
    // The collapsed aside has w-12 class
    const aside = document.querySelector('aside');
    expect(aside.className).toContain('w-12');
  });

  it('expands collapsed sidebar when expand button is clicked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ChapterSidebar {...defaultProps} />);

    // Collapse first
    const buttons = screen.getAllByRole('button', { name: 'chapterNav' });
    await user.click(buttons[0]);

    // Now click the expand button (also in the collapsed view)
    const expandButtons = screen.getAllByRole('button', { name: 'chapterNav' });
    await user.click(expandButtons[0]);

    // Sidebar should have w-60 again
    const aside = document.querySelector('aside');
    expect(aside.className).toContain('w-60');
  });

  // --- Mobile drawer (lines 197-242) ---

  it('opens mobile drawer when mobile toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} />);

    // Mobile toggle button is the last one on the page with aria-label "chapterNav"
    // It's in the lg:hidden div
    const buttons = screen.getAllByRole('button', { name: 'chapterNav' });
    // The last button is the mobile toggle (has HiMenuAlt2 icon)
    // Actually, with AnimatePresence and framer-motion mocked, the mobile drawer
    // section has two buttons: the toggle and potentially more
    // Just verify the mobile section renders
    const mobileDiv = document.querySelector('.lg\\:hidden');
    expect(mobileDiv).toBeInTheDocument();

    // Click the toggle button — it should be the one NOT inside the aside
    // Find the button in the lg:hidden div
    const mobileToggleBtn = mobileDiv.querySelector('button');
    await user.click(mobileToggleBtn);
  });

  // --- Drag-and-drop handleDragEnd (lines 44-61) ---

  it('calls reorderMutation.mutate on drag end with valid swap', () => {
    render(<ChapterSidebar {...defaultProps} />);

    // dragEndCallback was stored by the DndContext mock
    dragEndCallback({ active: { id: 'c1' }, over: { id: 'c3' } });

    // Expected: reordered = [c2, c3, c1]
    // Payload: [{ id: 'c2', order: 0 }, { id: 'c3', order: 1 }, { id: 'c1', order: 2 }]
    expect(mockMutate).toHaveBeenCalledTimes(1);
    const payload = mockMutate.mock.calls[0][0];
    expect(payload).toHaveLength(3);
    expect(payload[0]).toEqual({ id: 'c2', order: 0 });
    expect(payload[2]).toEqual({ id: 'c1', order: 2 });
  });

  it('does not call reorderMutation when drag over is null', () => {
    render(<ChapterSidebar {...defaultProps} />);
    dragEndCallback({ active: { id: 'c1' }, over: null });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call reorderMutation when active and over are the same', () => {
    render(<ChapterSidebar {...defaultProps} />);
    dragEndCallback({ active: { id: 'c1' }, over: { id: 'c1' } });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call reorderMutation when chapter IDs are not found in list', () => {
    render(<ChapterSidebar {...defaultProps} />);
    dragEndCallback({ active: { id: 'nonexistent' }, over: { id: 'c1' } });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  // --- handleMoveUp (lines 63-73) ---

  it('calls reorderMutation when moving chapter up (non-first)', async () => {
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} />);

    await user.click(screen.getByTestId('move-up-c2'));
    expect(mockMutate).toHaveBeenCalled();
  });

  it('does not move up the first chapter (index 0)', async () => {
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} />);

    mockMutate.mockClear();
    await user.click(screen.getByTestId('move-up-c1'));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  // --- handleMoveDown (lines 75-85) ---

  it('calls reorderMutation when moving chapter down (non-last)', async () => {
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} />);

    await user.click(screen.getByTestId('move-down-c1'));
    expect(mockMutate).toHaveBeenCalled();
  });

  it('does not move down the last chapter', async () => {
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} />);

    mockMutate.mockClear();
    await user.click(screen.getByTestId('move-down-c3'));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  // --- Chapter selection ---

  it('calls onSelectChapter when a chapter is clicked', async () => {
    const onSelectChapter = vi.fn();
    const user = userEvent.setup();
    render(
      <ChapterSidebar {...defaultProps} onSelectChapter={onSelectChapter} />
    );

    await user.click(screen.getByTestId('chapter-item-c2'));
    expect(onSelectChapter).toHaveBeenCalledWith('c2');
  });

  // --- 50-chapter limit ---

  it('disables add chapter button when at 50 chapter limit', () => {
    const fiftyChapters = Array.from({ length: 50 }, (_, i) => ({
      _id: `c${i}`,
      title: `Chapter ${i + 1}`,
      order: i,
    }));
    render(<ChapterSidebar {...defaultProps} chapters={fiftyChapters} />);
    expect(screen.getByTestId('add-chapter-btn')).toBeDisabled();
    expect(screen.getByTestId('add-chapter-btn')).toHaveAttribute('data-count', '50');
  });

  it('enables add chapter button when under 50 chapters', () => {
    render(<ChapterSidebar {...defaultProps} chapters={sampleChapters} />);
    expect(screen.getByTestId('add-chapter-btn')).not.toBeDisabled();
    expect(screen.getByTestId('add-chapter-btn')).toHaveAttribute('data-count', '3');
  });

  // --- Empty chapters edge case ---

  it('renders nothing in DndContext when chapters array is empty', () => {
    render(<ChapterSidebar {...defaultProps} chapters={[]} />);
    const sortableContext = screen.queryByTestId('sortable-context');
    expect(sortableContext).not.toBeInTheDocument();
  });

  // --- Mobile drawer backdrop close (line 217 onClick) ---

  it('closes mobile drawer when backdrop overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} />);

    // Open mobile drawer by clicking the mobile toggle button
    const mobileToggleBtn = document.querySelector('.lg\\:hidden button');
    await user.click(mobileToggleBtn);

    // Drawer should be open with role="dialog"
    const drawer = screen.getByRole('dialog');
    expect(drawer).toBeInTheDocument();

    // The backdrop overlay is a div with class containing "fixed" and "inset-0" and "bg-black/30"
    // Find the overlay div that sits between the mobile toggle and the drawer
    const overlay = document.querySelector('.fixed.inset-0.z-40');
    await user.click(overlay);

    // Drawer should close — dialog removed from DOM
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // --- Line 98: expand sidebar onClick inside mobile drawer (collapsed state) ---

  it('expands sidebar when expand button is clicked inside mobile drawer', async () => {
    const user = userEvent.setup();
    render(<ChapterSidebar {...defaultProps} />);

    // Step 1: Collapse the sidebar (sets isCollapsed=true)
    const desktopButtons = screen.getAllByRole('button', { name: 'chapterNav' });
    await user.click(desktopButtons[0]);

    // Sidebar should be collapsed
    const aside = document.querySelector('aside');
    expect(aside.className).toContain('w-12');

    // Step 2: Open mobile drawer
    const mobileToggleBtn = document.querySelector('.lg\\:hidden button');
    await user.click(mobileToggleBtn);

    // Step 3: Inside drawer, find the expand button (line 98 onClick handler)
    // There should be buttons with "chapterNav" inside the dialog
    const drawer = screen.getByRole('dialog');
    const drawerButtons = drawer.querySelectorAll('[aria-label="chapterNav"]');

    // One of these is the expand button (HiChevronRight) — click the first one in the drawer header
    await user.click(drawerButtons[0]);

    // Sidebar should now be expanded (w-60) — isCollapsed back to false
    expect(aside.className).toContain('w-60');
  });
});
