// Contopia — DraftsListPage Component Tests (STORY-021)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DraftsListPage from '../app/drafts/DraftsListPage';

// Mock useDraftsQuery
const mockUseDraftsQuery = vi.fn();
vi.mock('../hooks/useDraftsQuery', () => ({
  default: () => mockUseDraftsQuery(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders() {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <DraftsListPage />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('DraftsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons when isLoading is true', () => {
    mockUseDraftsQuery.mockReturnValue({ data: null, isLoading: true, error: null });

    renderWithProviders();

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    // Should have skeleton items (3 animated placeholders)
    const skeletonItems = list.querySelectorAll('.animate-pulse');
    expect(skeletonItems.length).toBe(3);
  });

  it('renders empty state when no drafts exist', () => {
    mockUseDraftsQuery.mockReturnValue({
      data: { data: [], meta: { pagination: { total: 0 } } },
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    expect(screen.getByText('emptyDraftsMessage')).toBeInTheDocument();
  });

  it('renders draft list with navigation buttons', () => {
    mockUseDraftsQuery.mockReturnValue({
      data: {
        data: [
          { _id: 'd1', title: 'My Draft', updatedAt: '2025-01-15T10:00:00Z', totalWordCount: 150 },
          { _id: 'd2', title: 'Second Draft', updatedAt: '2025-01-14T10:00:00Z', totalWordCount: 80 },
        ],
        meta: { pagination: { total: 2 } },
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    expect(screen.getByText('My Draft')).toBeInTheDocument();
    expect(screen.getByText('Second Draft')).toBeInTheDocument();

    // Each draft has a button navigating to /editor/:id
    const draftButtons = screen.getAllByRole('button');
    expect(draftButtons).toHaveLength(2);

    // Word count rendered via i18n key — mock returns key name directly
    // The component renders t('wordCount', { count: draft.totalWordCount })
    expect(screen.getAllByText((content) => content.includes('wordCount'))).toHaveLength(2);
  });

  it('renders draft with placeholder title when title is missing', () => {
    mockUseDraftsQuery.mockReturnValue({
      data: {
        data: [
          { _id: 'd1', updatedAt: '2025-01-15T10:00:00Z' },
        ],
        meta: { pagination: { total: 1 } },
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    // Default i18n mock returns key as-is with interpolations
    expect(screen.getByText((content) => content.includes('chapterTitlePlaceholder'))).toBeInTheDocument();
  });

  it('renders error state when error is present', () => {
    mockUseDraftsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network error'),
    });

    renderWithProviders();

    expect(screen.getByText('errorTitle')).toBeInTheDocument();
    expect(screen.getByText('errorMessage')).toBeInTheDocument();
  });

  it('renders main heading', () => {
    mockUseDraftsQuery.mockReturnValue({ data: { data: [] }, isLoading: false, error: null });

    renderWithProviders();

    expect(screen.getByText('draftsTitle')).toBeInTheDocument();
  });

  it('list has role="list" and aria-label', () => {
    mockUseDraftsQuery.mockReturnValue({ data: { data: [] }, isLoading: false, error: null });

    // With empty data, no list is rendered
    mockUseDraftsQuery.mockReturnValue({
      data: { data: [{ _id: 'd1', title: 'Draft' }] },
      isLoading: false,
      error: null,
    });

    renderWithProviders();

    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-label', 'draftsTitle');
  });
});
