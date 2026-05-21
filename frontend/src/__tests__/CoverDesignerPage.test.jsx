// Contopia — CoverDesignerPage Integration Tests (STORY-022)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CoverDesignerPage from '../app/cover/CoverDesignerPage';

const mockBookId = 'book-123';
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ bookId: mockBookId }),
    useNavigate: () => mockNavigate,
  };
});

// Mock the save template hook
const mockMutateAsync = vi.fn();
vi.mock('../hooks/useSaveTemplate', () => ({
  useSaveTemplate: () => ({
    mutateAsync: (...args) => mockMutateAsync(...args),
    isPending: false,
  }),
}));

// Mock useBookEditQuery
let mockEditQueryData = {
  _id: mockBookId,
  title: 'My Adventure',
  author: { name: 'Julia' },
  templateId: null,
};
const mockUseBookEditQuery = vi.fn(() => ({ data: mockEditQueryData, isLoading: false, error: null }));
vi.mock('../hooks/useBookEditQuery', () => ({ default: () => mockUseBookEditQuery() }));

// Mock cover store
import { useCoverStore } from '../stores/cover-store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CoverDesignerPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('CoverDesignerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    useCoverStore.setState({ selectedTemplateId: null });
    // Reset mock data defaults
    mockEditQueryData = {
      _id: mockBookId,
      title: 'My Adventure',
      author: { name: 'Julia' },
      templateId: null,
    };
    mockUseBookEditQuery.mockReturnValue({ data: mockEditQueryData, isLoading: false, error: null });
    mockMutateAsync.mockResolvedValue({});
  });

  describe('loading state', () => {
    it('shows spinner while loading book data', () => {
      mockUseBookEditQuery.mockReturnValue({ data: null, isLoading: true, error: null });
      renderPage();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when book fetch fails', () => {
      mockUseBookEditQuery.mockReturnValue({ data: null, isLoading: false, error: new Error('Fail') });
      renderPage();
      expect(screen.getByText('Failed to load book data.')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('renders the page title', () => {
      renderPage();
      expect(screen.getByText('title')).toBeInTheDocument(); // i18n key
    });

    it('renders the template gallery', () => {
      renderPage();
      const gallery = screen.getByRole('group');
      expect(gallery).toBeInTheDocument();
    });

    it('renders the cover preview', () => {
      renderPage();
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('renders skip and customize action buttons', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'actions.skip' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'actions.customize' })).toBeInTheDocument();
    });

    it('customize is disabled initially (no selection)', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'actions.customize' })).toBeDisabled();
    });

    it('shows choose template prompt when no template selected', () => {
      renderPage();
      expect(screen.getByText('preview.chooseTemplate')).toBeInTheDocument();
    });
  });

  describe('template selection', () => {
    it('selecting a template enables customize button', async () => {
      renderPage();
      const user = userEvent.setup();

      // Find first template button and click it
      const templateButtons = screen.getAllByRole('button');
      // First is skip, second is customize, rest are templates
      const firstTemplate = templateButtons.find(
        (btn) => !btn.getAttribute('aria-label')?.includes('actions.')
      );
      expect(firstTemplate).toBeDefined();

      await user.click(firstTemplate);

      // Customize button should now be enabled
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'actions.customize' })).not.toBeDisabled();
      });
    });

    it('selecting a template updates the cover store', async () => {
      renderPage();
      const user = userEvent.setup();

      const templateButtons = screen.getAllByRole('button');
      const firstTemplate = templateButtons.find(
        (btn) => !btn.getAttribute('aria-label')?.includes('actions.')
      );

      await user.click(firstTemplate);

      await waitFor(() => {
        expect(useCoverStore.getState().selectedTemplateId).toBeTruthy();
      });
    });

    it('selecting a different template changes selection', async () => {
      renderPage();
      const user = userEvent.setup();

      const templateButtons = screen.getAllByRole('button');
      const templates = templateButtons.filter(
        (btn) => !btn.getAttribute('aria-label')?.includes('actions.')
      );

      await user.click(templates[0]);
      const firstId = useCoverStore.getState().selectedTemplateId;

      await user.click(templates[1]);
      await waitFor(() => {
        expect(useCoverStore.getState().selectedTemplateId).not.toBe(firstId);
      });
    });
  });

  describe('skip flow', () => {
    it('calls saveTemplate with null and navigates to /shelf on skip', async () => {
      renderPage();
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({});

      await user.click(screen.getByRole('button', { name: 'actions.skip' }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({ bookId: mockBookId, templateId: null });
      });
      expect(mockNavigate).toHaveBeenCalledWith('/shelf');
    });

    it('does not navigate on skip when save fails (error caught silently)', async () => {
      renderPage();
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('Network error'));

      await user.click(screen.getByRole('button', { name: 'actions.skip' }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
      // navigate is inside the try block — not called when error is thrown
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('customize flow', () => {
    it('calls saveTemplate with selected templateId and navigates to customize', async () => {
      renderPage();
      const user = userEvent.setup();

      // First select a template
      const templateButtons = screen.getAllByRole('button');
      const templates = templateButtons.filter(
        (btn) => !btn.getAttribute('aria-label')?.includes('actions.')
      );
      await user.click(templates[0]);
      await waitFor(() => {
        expect(useCoverStore.getState().selectedTemplateId).toBeTruthy();
      });

      mockMutateAsync.mockResolvedValue({});

      // Then click customize
      await user.click(screen.getByRole('button', { name: 'actions.customize' }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          bookId: mockBookId,
          templateId: useCoverStore.getState().selectedTemplateId,
        });
      });
      expect(mockNavigate).toHaveBeenCalledWith(`/cover/${mockBookId}/customize`);
    });

    it('does not navigate when customize clicked but no template selected', async () => {
      renderPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'actions.customize' }));

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith(`/cover/${mockBookId}/customize`);
    });

    it('does not navigate on customize when save fails (error caught silently)', async () => {
      renderPage();
      const user = userEvent.setup();

      // Select a template first
      const templateButtons = screen.getAllByRole('button');
      const templates = templateButtons.filter(
        (btn) => !btn.getAttribute('aria-label')?.includes('actions.')
      );
      await user.click(templates[0]);
      await waitFor(() => {
        expect(useCoverStore.getState().selectedTemplateId).toBeTruthy();
      });

      mockMutateAsync.mockRejectedValue(new Error('Save failed'));

      // Click customize
      await user.click(screen.getByRole('button', { name: 'actions.customize' }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
      // navigate is inside try block — not called on error
      expect(mockNavigate).not.toHaveBeenCalledWith(`/cover/${mockBookId}/customize`);
    });
  });

  describe('existing templateId from book', () => {
    it('pre-selects template when book has templateId', async () => {
      mockEditQueryData = {
        _id: mockBookId,
        title: 'My Adventure',
        author: { name: 'Julia' },
        templateId: 'galaxy',
      };
      mockUseBookEditQuery.mockReturnValue({ data: mockEditQueryData, isLoading: false, error: null });

      renderPage();

      await waitFor(() => {
        expect(useCoverStore.getState().selectedTemplateId).toBe('galaxy');
      });
    });

    it('customize is enabled when book has pre-existing templateId', async () => {
      mockEditQueryData = {
        _id: mockBookId,
        title: 'My Adventure',
        author: { name: 'Julia' },
        templateId: 'galaxy',
      };
      mockUseBookEditQuery.mockReturnValue({ data: mockEditQueryData, isLoading: false, error: null });

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'actions.customize' })).not.toBeDisabled();
      });
    });
  });
});
