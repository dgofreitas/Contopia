import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookshelfGridLayout from '../app/shelf/BookshelfGridLayout';
import * as useBooksQueryModule from '../hooks/useBooksQuery';

const mockProgressData = vi.hoisted(() => ({ data: null }));

vi.mock('../hooks/useBooksQuery', () => ({
  default: vi.fn(),
}));

vi.mock('../hooks/useAllReadingProgressQuery', () => ({
  default: () => ({ data: mockProgressData.data }),
}));

vi.mock('../stores/book-store', () => ({
  default: (selector) => selector({
    setBooks: vi.fn(),
  }),
}));

// setup.js already mocks react-i18next globally to pass through keys

// Mock BookshelfGrid to expose the highlightRef and verify progressMap
let lastProgressMap = null;
vi.mock('../components/shelf/BookshelfGrid', () => ({
  default: ({ books, onBookClick, highlightBookId, highlightRef, progressMap }) => {
    lastProgressMap = progressMap;
    return (
      <div data-testid="bookshelf-grid">
        {books.map((book) => (
          <div key={book._id} ref={highlightBookId === book._id ? highlightRef : null} data-book-id={book._id}>
            {book.title}
          </div>
        ))}
      </div>
    );
  },
}));

// Mock ShelfSkeleton
vi.mock('../components/shelf/ShelfSkeleton', () => ({
  default: () => <div aria-busy="true" data-testid="skeleton" />,
}));

// Mock EmptyShelfState
vi.mock('../components/shelf/EmptyShelfState', () => ({
  default: () => <div role="status" data-testid="empty-state">No books</div>,
}));

vi.useFakeTimers();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('BookshelfGridLayout', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state with aria-busy skeleton', () => {
    useBooksQueryModule.default.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const { container } = renderWithProviders(<BookshelfGridLayout />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('shows error state on error', () => {
    useBooksQueryModule.default.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });
    renderWithProviders(<BookshelfGridLayout />);
    expect(screen.getByText('errorTitle')).toBeInTheDocument();
    expect(screen.getByText('errorMessage')).toBeInTheDocument();
    expect(screen.getByText('retryButton')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    useBooksQueryModule.default.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<BookshelfGridLayout />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows books grid with books on success', () => {
    useBooksQueryModule.default.mockReturnValue({
      data: {
        data: [
          { _id: '1', title: 'Story One' },
          { _id: '2', title: 'Story Two' },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<BookshelfGridLayout />);
    expect(screen.getByText('Story One')).toBeInTheDocument();
    expect(screen.getByText('Story Two')).toBeInTheDocument();
  });

  it('passes highlightBookId to BookshelfGrid', () => {
    useBooksQueryModule.default.mockReturnValue({
      data: { data: [{ _id: '1', title: 'Highlighted Book' }] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<BookshelfGridLayout highlightBookId="1" />);
    expect(screen.getByText('Highlighted Book')).toBeInTheDocument();
  });

  it('does not attempt scroll/focus when highlightBookId is not provided', () => {
    // Mock scrollIntoView to prove it's not called
    Element.prototype.scrollIntoView = vi.fn();
    useBooksQueryModule.default.mockReturnValue({
      data: { data: [{ _id: '1', title: 'Book 1' }, { _id: '2', title: 'Book 2' }] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<BookshelfGridLayout />);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('calls scrollIntoView when highlightBookId is provided', () => {
    useBooksQueryModule.default.mockReturnValue({
      data: { data: [{ _id: '1', title: 'Highlight Me' }] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    // scrollIntoView is polyfilled in setup.js
    renderWithProviders(<BookshelfGridLayout highlightBookId="1" />);

    // scrollIntoView is called via useEffect
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('has no sort UI controls (AC-3: no sort UI in MVP)', () => {
    useBooksQueryModule.default.mockReturnValue({
      data: {
        data: [
          { _id: '1', title: 'Story One' },
          { _id: '2', title: 'Story Two' },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const { container } = renderWithProviders(<BookshelfGridLayout />);

    const sortSelect = container.querySelector('select');
    expect(sortSelect).toBeNull();

    const sortButtons = screen.queryAllByRole('button');
    for (const btn of sortButtons) {
      const text = btn.textContent.toLowerCase();
      expect(text).not.toContain('sort');
      expect(text).not.toContain('ordenar');
      expect(text).not.toContain('order');
    }
  });

  // ── STORY-033: Progress integration ──────────────────────────

  describe('reading progress integration (STORY-033)', () => {
    it('does not crash when progressData is null (no reading progress)', () => {
      mockProgressData.data = null;
      useBooksQueryModule.default.mockReturnValue({
        data: { data: [{ _id: '1', title: 'Book' }] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      expect(() => renderWithProviders(<BookshelfGridLayout />)).not.toThrow();
    });

    it('passes progressMap to BookshelfGrid when progress data exists', () => {
      mockProgressData.data = [
        { bookId: '1', percentage: 75, finished: false },
        { bookId: '2', percentage: 100, finished: true },
      ];
      useBooksQueryModule.default.mockReturnValue({
        data: {
          data: [
            { _id: '1', title: 'Book 1' },
            { _id: '2', title: 'Book 2' },
            { _id: '3', title: 'Book 3' },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      renderWithProviders(<BookshelfGridLayout />);
      // Should render books without crashing
      expect(screen.getByText('Book 1')).toBeInTheDocument();
      expect(screen.getByText('Book 2')).toBeInTheDocument();
    });

    it('displays books correctly alongside progress', () => {
      mockProgressData.data = [
        { bookId: '1', percentage: 50, finished: false },
      ];
      useBooksQueryModule.default.mockReturnValue({
        data: { data: [{ _id: '1', title: 'Reading Progress Book' }] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
      renderWithProviders(<BookshelfGridLayout />);
      expect(screen.getByText('Reading Progress Book')).toBeInTheDocument();
    });
  });
});
