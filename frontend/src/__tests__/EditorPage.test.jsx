// Contopia — EditorPage Integration Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditorPage from '../app/editor/EditorPage';

// Mock react-router-dom's useParams
const mockBookId = 'book123';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ bookId: mockBookId }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Mock all child hooks
const mockCreateChapterMutate = vi.fn();
const mockUpdateChapterMutate = vi.fn();
const mockDeleteChapterMutate = vi.fn();

const mockUseChaptersQuery = vi.fn(() => ({
  data: {
    data: [
      { _id: 'c1', title: 'Chapter 1', order: 0 },
      { _id: 'c2', title: 'Chapter 2', order: 1 },
      { _id: 'c3', title: 'Chapter 3', order: 2 },
    ],
  },
  isLoading: false,
}));

vi.mock('../hooks/useChaptersQuery', () => ({
  default: () => mockUseChaptersQuery(),
}));

vi.mock('../hooks/useCreateChapter', () => ({
  default: vi.fn(() => ({
    mutate: mockCreateChapterMutate,
    isPending: false,
  })),
}));

vi.mock('../hooks/useUpdateChapter', () => ({
  default: vi.fn(() => ({
    mutate: mockUpdateChapterMutate,
  })),
}));

vi.mock('../hooks/useDeleteChapter', () => ({
  default: vi.fn(() => ({
    mutate: mockDeleteChapterMutate,
  })),
}));

// Mock child components to simplify
vi.mock('../app/editor/ChapterSidebar', () => ({
  default: ({
    chapters,
    activeChapterId,
    onSelectChapter,
    onAddChapter,
    onRenameChapter,
    onDeleteChapter,
  }) => (
    <div data-testid="chapter-sidebar">
      <span data-testid="active-chapter-id">{activeChapterId}</span>
      <span data-testid="chapters-count">{chapters.length}</span>
      <button data-testid="select-chapter" onClick={() => onSelectChapter('c2')}>
        Select Ch 2
      </button>
      <button data-testid="add-chapter" onClick={onAddChapter}>
        Add
      </button>
      <button
        data-testid="rename-chapter"
        onClick={() => onRenameChapter({ chapterId: 'c1', title: 'Renamed' })}
      >
        Rename
      </button>
      <button
        data-testid="delete-chapter"
        onClick={() => onDeleteChapter({ chapterId: 'c1' })}
      >
        Delete
      </button>
    </div>
  ),
}));

vi.mock('../app/editor/ChapterEditor', () => ({
  default: ({ chapter }) => (
    <div data-testid="chapter-editor">
      {chapter ? chapter.title : 'empty'}
    </div>
  ),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders sidebar and editor', () => {
    renderWithProviders(<EditorPage />);
    expect(screen.getByTestId('chapter-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('chapter-editor')).toBeInTheDocument();
  });

  it('default active chapter is the first chapter', () => {
    renderWithProviders(<EditorPage />);
    expect(screen.getByTestId('active-chapter-id')).toHaveTextContent('c1');
  });

  it('renders editor with first chapter title', () => {
    renderWithProviders(<EditorPage />);
    expect(screen.getByTestId('chapter-editor')).toHaveTextContent('Chapter 1');
  });

  it('shows loading state when isLoading is true', () => {
    mockUseChaptersQuery.mockReturnValueOnce({
      data: null,
      isLoading: true,
    });

    renderWithProviders(<EditorPage />);
    expect(screen.getByText('chapterNav')).toBeInTheDocument();
  });

  it('calls onAddChapter when add button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditorPage />);
    await user.click(screen.getByTestId('add-chapter'));
    expect(mockCreateChapterMutate).toHaveBeenCalledWith(undefined, expect.any(Object));
  });

  it('calls onRenameChapter when rename triggered', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditorPage />);
    await user.click(screen.getByTestId('rename-chapter'));
    expect(mockUpdateChapterMutate).toHaveBeenCalledWith({
      chapterId: 'c1',
      title: 'Renamed',
    });
  });

  it('calls onDeleteChapter when delete triggered', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditorPage />);
    await user.click(screen.getByTestId('delete-chapter'));
    expect(mockDeleteChapterMutate).toHaveBeenCalledWith(
      { chapterId: 'c1' },
      expect.any(Object)
    );
  });

  it('calls onSelectChapter and switches active chapter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditorPage />);
    expect(screen.getByTestId('active-chapter-id')).toHaveTextContent('c1');
    await user.click(screen.getByTestId('select-chapter'));
    expect(screen.getByTestId('active-chapter-id')).toHaveTextContent('c2');
  });

  it('passes correct chapters count to sidebar', () => {
    renderWithProviders(<EditorPage />);
    expect(screen.getByTestId('chapters-count')).toHaveTextContent('3');
  });
});
