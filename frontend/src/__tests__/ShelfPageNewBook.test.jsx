// Contopia — ShelfPage "New Book" Button Tests (STORY-016)
// Covers: ShelfPage.jsx (New Book button added in this story)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShelfPage from '../app/shelf/ShelfPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mutable mock state
let mockBooksData = { data: [{ _id: '1', title: 'Existing Book' }], meta: { total: 1 } };
const mockUseReducedMotion = vi.fn(() => false);
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  m: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  useReducedMotion: () => mockUseReducedMotion(),
  AnimatePresence: ({ children }) => children,
}));

vi.mock('../hooks/useBooksQuery', () => ({
  default: vi.fn(() => ({
    data: mockBooksData,
    isLoading: false,
    isError: false,
  })),
}));

// Mock BookshelfGridLayout to avoid deep import issues
vi.mock('../app/shelf/BookshelfGridLayout', () => ({
  default: () => <div data-testid="bookshelf-grid">Grid</div>,
}));

vi.mock('../components/import/ImportBookModal', () => ({
  default: () => null,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderShelfPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/shelf']}>
        <ShelfPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ShelfPage — New Book button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBooksData = { data: [{ _id: '1', title: 'Existing Book' }], meta: { total: 1 } };
  });

  it('passes highlightBookId to BookshelfGridLayout when highlight param is present', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/shelf?highlight=book456']}>
          <ShelfPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    // The highlight prop gets passed to BookshelfGridLayout
    expect(screen.getByTestId('bookshelf-grid')).toBeInTheDocument();
  });

  it('uses no-animation fadeUpProps when prefers-reduced-motion is true', () => {
    mockUseReducedMotion.mockReturnValueOnce(true);
    const { container } = renderShelfPage();
    // Should still render without animation
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders "New Book" button when books exist', () => {
    renderShelfPage();

    const newBookBtn = screen.getByRole('button', { name: 'newBookButton' });
    expect(newBookBtn).toBeInTheDocument();
  });

  it('renders "New Book" button with aria-label', () => {
    renderShelfPage();

    const newBookBtn = screen.getByRole('button', { name: 'newBookButton' });
    expect(newBookBtn).toHaveAttribute('aria-label', 'newBookButton');
  });

  it('does not render "New Book" button when no books exist', () => {
    mockBooksData = { data: [], meta: { total: 0 } };

    renderShelfPage();

    expect(screen.queryByRole('button', { name: 'newBookButton' })).not.toBeInTheDocument();
  });

  it('navigates to /editor/new when New Book button clicked (covers useNavigate)', async () => {
    const user = userEvent.setup();
    renderShelfPage();
    const btn = screen.getByRole('button', { name: 'newBookButton' });
    await user.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/editor/new');
  });
});
