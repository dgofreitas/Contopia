// Contopia — ShelfPage "New Book" Button Tests (STORY-016)
// Covers: ShelfPage.jsx (New Book button added in this story)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShelfPage from '../app/shelf/ShelfPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mutable mock state
let mockBooksData = { data: [{ _id: '1', title: 'Existing Book' }], meta: { total: 1 } };

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  useReducedMotion: vi.fn(() => false),
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
});
