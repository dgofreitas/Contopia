// Contopia — CoverCustomizePage Integration Tests (STORY-023)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CoverCustomizePage from '../app/cover/CoverCustomizePage';
import { useCoverStore } from '../stores/cover-store';
import { COVER_TEMPLATES } from '../lib/cover-templates';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(),
  };
});

// Mock the hooks
vi.mock('../hooks/useSaveCoverCustomization');
vi.mock('../hooks/useBookEditQuery');

// Mock SpineCustomizeSection to simplify integration test
vi.mock('../app/cover/SpineCustomizeSection', () => ({
  default: ({ title }) => <div data-testid="spine-customize-section">Spine: {title}</div>,
}));

const { useParams, useNavigate } = await import('react-router-dom');
const { useSaveCoverCustomization } = await import('../hooks/useSaveCoverCustomization');
const { default: useBookEditQuery } = await import('../hooks/useBookEditQuery');

// Test book data
const mockBook = {
  _id: 'book-123',
  title: 'My Adventure Story',
  author: { name: 'Julia Author' },
  templateId: 'galaxy',
  coverColor: null,
  coverPattern: null,
  spineColor: null,
  spineCustomized: false,
};

const mockTemplate = COVER_TEMPLATES.find(t => t.id === 'galaxy');

describe('CoverCustomizePage', () => {
  let queryClient;
  let mockNavigate;
  let mockSaveMutation;

  beforeEach(() => {
    // Reset store
    useCoverStore.getState().resetStore();

    // Setup mock navigate
    mockNavigate = vi.fn();
    useNavigate.mockReturnValue(mockNavigate);

    // Setup mock params
    useParams.mockReturnValue({ bookId: 'book-123' });

    // Setup query client
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Setup mock mutation
    mockSaveMutation = {
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    };
    useSaveCoverCustomization.mockReturnValue(mockSaveMutation);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/cover/book-123/customize']}>
          <Routes>
            <Route path="/cover/:bookId/customize" element={<CoverCustomizePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  describe('loading state', () => {
    it('shows loading spinner when book data is loading', () => {
      useBookEditQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderComponent();

      // Look for the spinner div by class instead of role
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show color picker or pattern picker while loading', () => {
      useBookEditQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderComponent();

      expect(screen.queryByRole('group', { name: /color/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: /pattern/i })).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when book data fails to load', () => {
      useBookEditQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      renderComponent();

      expect(screen.getByText(/Failed to load book data/i)).toBeInTheDocument();
    });

    it('does not show customization options on error', () => {
      useBookEditQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      renderComponent();

      expect(screen.queryByRole('group', { name: /color/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: /pattern/i })).not.toBeInTheDocument();
    });
  });

  describe('full integration flow', () => {
    beforeEach(() => {
      useBookEditQuery.mockReturnValue({
        data: mockBook,
        isLoading: false,
        error: null,
      });
    });

    it('loads book and displays customization options', () => {
      renderComponent();

      // Check for page heading specifically
      const pageHeading = screen.getByRole('heading', { level: 1 });
      expect(pageHeading).toBeInTheDocument();

      expect(screen.getByRole('group', { name: /color/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /pattern/i })).toBeInTheDocument();
    });

    it('populates store with book data on load', async () => {
      renderComponent();

      await waitFor(() => {
        const state = useCoverStore.getState();
        expect(state.selectedTemplateId).toBe('galaxy');
      });
    });

    it('allows selecting a color', async () => {
      const user = userEvent.setup();
      renderComponent();

      const colorButtons = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-label')?.includes('colorSwatch'));
      await user.click(colorButtons[0]);

      const state = useCoverStore.getState();
      expect(state.baseColor).toBeTruthy();
    });

    it('allows selecting a pattern', async () => {
      const user = userEvent.setup();
      renderComponent();

      const patternButtons = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-label')?.includes('patternSwatch'));
      await user.click(patternButtons[1]);

      const state = useCoverStore.getState();
      expect(state.patternId).toBeTruthy();
    });

    it('navigates back to cover page when Back button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/cover/book-123');
    });

    it('saves customization and navigates to shelf when Save button is clicked', async () => {
      const user = userEvent.setup();

      // Setup initial state
      useCoverStore.getState().setSelectedTemplate('galaxy');
      useCoverStore.getState().setBaseColor('#FF6B6B');
      useCoverStore.getState().setPattern('stripes');

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveMutation.mutateAsync).toHaveBeenCalledWith({
          bookId: 'book-123',
          templateId: 'galaxy',
          coverColor: '#FF6B6B',
          coverPattern: 'stripes',
          spineColor: null,
          spineCustomized: false,
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/shelf');
      });
    });

    it('resets store after successful save', async () => {
      const user = userEvent.setup();

      useCoverStore.getState().setSelectedTemplate('galaxy');
      useCoverStore.getState().setBaseColor('#FF6B6B');
      useCoverStore.getState().setPattern('stripes');

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        const state = useCoverStore.getState();
        expect(state.selectedTemplateId).toBeNull();
        expect(state.baseColor).toBeNull();
        expect(state.patternId).toBeNull();
      });
    });

    it('disables save button while saving', async () => {
      const user = userEvent.setup();

      useBookEditQuery.mockReturnValue({
        data: mockBook,
        isLoading: false,
        error: null,
      });

      mockSaveMutation.isPending = true;

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('handles book with no existing customization', () => {
      const bookWithNoCustomization = {
        ...mockBook,
        templateId: null,
        coverColor: null,
        coverPattern: null,
      };

      useBookEditQuery.mockReturnValue({
        data: bookWithNoCustomization,
        isLoading: false,
        error: null,
      });

      renderComponent();

      expect(screen.getByRole('group', { name: /color/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /pattern/i })).toBeInTheDocument();
    });

    it('handles book with existing template but no color/pattern', () => {
      const bookWithTemplateOnly = {
        ...mockBook,
        coverColor: null,
        coverPattern: null,
      };

      useBookEditQuery.mockReturnValue({
        data: bookWithTemplateOnly,
        isLoading: false,
        error: null,
      });

      renderComponent();

      expect(screen.getByRole('group', { name: /color/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /pattern/i })).toBeInTheDocument();
    });

    it('handles save mutation error gracefully', async () => {
      const user = userEvent.setup();

      useBookEditQuery.mockReturnValue({
        data: mockBook,
        isLoading: false,
        error: null,
      });

      mockSaveMutation.mutateAsync.mockRejectedValue(new Error('Save failed'));

      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should not navigate on error
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('handles book with missing title', () => {
      const bookWithNoTitle = {
        ...mockBook,
        title: null,
      };

      useBookEditQuery.mockReturnValue({
        data: bookWithNoTitle,
        isLoading: false,
        error: null,
      });

      renderComponent();

      expect(screen.getByRole('group', { name: /color/i })).toBeInTheDocument();
    });
  });

  describe('accessibility (NFR-ACC-01)', () => {
    beforeEach(() => {
      useBookEditQuery.mockReturnValue({
        data: mockBook,
        isLoading: false,
        error: null,
      });
    });

    it('has proper heading structure', () => {
      renderComponent();

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('all interactive elements are keyboard accessible', () => {
      renderComponent();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(btn => {
        expect(btn.tagName).toBe('BUTTON');
        expect(btn).toHaveAttribute('type');
      });
    });

    it('color picker group has aria-label', () => {
      renderComponent();

      const colorGroup = screen.getByRole('group', { name: /color/i });
      expect(colorGroup).toBeInTheDocument();
      expect(colorGroup).toHaveAttribute('aria-label');
    });

    it('pattern picker group has aria-label', () => {
      renderComponent();

      const patternGroup = screen.getByRole('group', { name: /pattern/i });
      expect(patternGroup).toBeInTheDocument();
      expect(patternGroup).toHaveAttribute('aria-label');
    });
  });

  describe('NFR-PERF-04: Performance', () => {
    beforeEach(() => {
      useBookEditQuery.mockReturnValue({
        data: mockBook,
        isLoading: false,
        error: null,
      });
    });

    it('renders quickly without delay', async () => {
      const startTime = performance.now();
      renderComponent();
      const endTime = performance.now();

      // Render should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});