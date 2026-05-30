// Contopia — NewBookPage + NewBookForm Component Tests (STORY-016)
// Covers: NewBookPage.jsx, NewBookForm.jsx, useCreateBook.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewBookPage from '../app/editor/NewBookPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock framer-motion to avoid animation issues
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
  useReducedMotion: vi.fn(() => false),
  AnimatePresence: ({ children }) => children,
}));

// Mock react-icons
vi.mock('react-icons/hi', () => ({
  HiPencilAlt: () => <svg data-testid="pencil-icon" aria-hidden="true" />,
  HiPlus: () => <svg data-testid="plus-icon" aria-hidden="true" />,
}));

// Mutable mock state for useCreateBook
let mockCreateBookState = {
  mutate: vi.fn(),
  isPending: false,
  error: null,
};

vi.mock('../hooks/useCreateBook', () => ({
  default: vi.fn(() => mockCreateBookState),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderNewBookPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/editor/new']}>
        <NewBookPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function getTitleInput() {
  return screen.getByLabelText('createBook.titleLabel');
}

function getSummaryTextarea() {
  return screen.getByLabelText('createBook.summaryLabel');
}

function getSubmitButton() {
  return screen.getByRole('button', { name: 'createBook.startWriting' });
}

function getCancelButton() {
  return screen.getByRole('button', { name: 'createBook.cancel' });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NewBookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBookState = {
      mutate: vi.fn(),
      isPending: false,
      error: null,
    };
  });

  // ── Initial render ──────────────────────────────────────────────────────

  it('renders the heading and subtitle', () => {
    renderNewBookPage();

    expect(screen.getByText('createBook.title')).toBeInTheDocument();
    expect(screen.getByText('createBook.subtitle')).toBeInTheDocument();
  });

  it('renders the form with title input and summary textarea', () => {
    renderNewBookPage();

    expect(getTitleInput()).toBeInTheDocument();
    expect(getSummaryTextarea()).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    renderNewBookPage();

    expect(getSubmitButton()).toBeInTheDocument();
    expect(getCancelButton()).toBeInTheDocument();
  });

  it('renders form with role="form" and aria-label', () => {
    renderNewBookPage();

    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-label', 'createBook.formLabel');
  });

  // ── Auto-focus ──────────────────────────────────────────────────────────

  it('auto-focuses the title input on mount', () => {
    renderNewBookPage();

    expect(getTitleInput()).toHaveFocus();
  });

  // ── Validation: empty title ─────────────────────────────────────────────

  it('shows validation error when submitting with empty title', async () => {
    const user = userEvent.setup();
    renderNewBookPage();

    await user.click(getSubmitButton());

    // Error text appears twice (helperText + sr-only span) — use getAllByText
    const errors = screen.getAllByText('createBook.errorTitleRequired');
    expect(errors.length).toBeGreaterThan(0);
    // Also verify the error span exists
    expect(document.getElementById('bookTitle-error')).toBeInTheDocument();
  });

  // ── Validation: title > 120 chars ───────────────────────────────────────

  it('shows validation error when title exceeds 120 characters', async () => {
    const user = userEvent.setup();
    renderNewBookPage();

    const longTitle = 'a'.repeat(121);
    await user.type(getTitleInput(), longTitle);
    await user.click(getSubmitButton());

    const errors = screen.getAllByText('createBook.errorTitleTooLong');
    expect(errors.length).toBeGreaterThan(0);
    expect(document.getElementById('bookTitle-error')).toBeInTheDocument();
  });

  // ── Validation: summary > 500 chars ─────────────────────────────────────

  it('shows validation error when summary exceeds 500 characters', async () => {
    const user = userEvent.setup();
    renderNewBookPage();

    const longSummary = 'a'.repeat(501);
    await user.type(getSummaryTextarea(), longSummary);
    await user.click(getSubmitButton());

    const errors = screen.getAllByText('createBook.errorSummaryTooLong');
    expect(errors.length).toBeGreaterThan(0);
    expect(document.getElementById('bookSummary-error')).toBeInTheDocument();
  });

  // ── Character count elements exist ─────────────────────────────────────

  it('renders character count element for title', () => {
    renderNewBookPage();

    const countEl = document.getElementById('bookTitle-count');
    expect(countEl).toBeInTheDocument();
    expect(countEl).toHaveAttribute('aria-live', 'polite');
  });

  it('renders character count element for summary', () => {
    renderNewBookPage();

    const countEl = document.getElementById('bookSummary-count');
    expect(countEl).toBeInTheDocument();
    expect(countEl).toHaveAttribute('aria-live', 'polite');
  });

  // ── Submit calls useCreateBook.mutate with correct data ─────────────────

  it('calls mutate with title and summary on valid submit', async () => {
    const user = userEvent.setup();
    renderNewBookPage();

    await user.type(getTitleInput(), 'My New Book');
    await user.type(getSummaryTextarea(), 'A great story');
    await user.click(getSubmitButton());

    expect(mockCreateBookState.mutate).toHaveBeenCalledTimes(1);
    expect(mockCreateBookState.mutate).toHaveBeenCalledWith(
      { title: 'My New Book', summary: 'A great story' },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('calls mutate with title and empty summary when only title filled', async () => {
    const user = userEvent.setup();
    renderNewBookPage();

    await user.type(getTitleInput(), 'Title Only');
    await user.click(getSubmitButton());

    expect(mockCreateBookState.mutate).toHaveBeenCalledTimes(1);
    expect(mockCreateBookState.mutate).toHaveBeenCalledWith(
      { title: 'Title Only', summary: '' },
      expect.anything(),
    );
  });

  // ── Cancel button exists and renders ────────────────────────────────────

  it('cancel button renders with correct aria-label', () => {
    renderNewBookPage();

    expect(getCancelButton()).toHaveAttribute('aria-label', 'createBook.cancel');
  });

  // ── isPending disables submit button and shows spinner ──────────────────

  it('disables submit button and shows spinner when isPending is true', () => {
    mockCreateBookState.isPending = true;

    renderNewBookPage();

    const submitButton = getSubmitButton();
    expect(submitButton).toBeDisabled();

    // Spinner should be rendered (role="status" by Flowbite Spinner)
    const spinner = document.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  // ── Server error displays in Alert ──────────────────────────────────────

  it('displays server error from mutation in an Alert', () => {
    mockCreateBookState.error = {
      response: {
        data: {
          error: {
            message: 'Book limit reached',
          },
        },
      },
    };

    renderNewBookPage();

    // Should show the server error message
    expect(screen.getByText('Book limit reached')).toBeInTheDocument();
    // Should be in an alert role with aria-live="polite"
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  // ── Keyboard navigation / Tab order ─────────────────────────────────────

  it('has correct tab order: title → summary → submit → cancel', async () => {
    const user = userEvent.setup();
    renderNewBookPage();

    // Title should be auto-focused on mount
    expect(getTitleInput()).toHaveFocus();

    // Tab to summary
    await user.tab();
    expect(getSummaryTextarea()).toHaveFocus();

    // Tab to submit button
    await user.tab();
    expect(getSubmitButton()).toHaveFocus();

    // Tab to cancel button
    await user.tab();
    expect(getCancelButton()).toHaveFocus();
  });

  // ── Screen reader attributes ────────────────────────────────────────────

  it('title input has aria-describedby pointing to char count', () => {
    renderNewBookPage();

    const titleInput = getTitleInput();
    const describedBy = titleInput.getAttribute('aria-describedby');
    expect(describedBy).toContain('bookTitle-count');
  });

  it('summary textarea has aria-describedby pointing to char count', () => {
    renderNewBookPage();

    const summaryTextarea = getSummaryTextarea();
    const describedBy = summaryTextarea.getAttribute('aria-describedby');
    expect(describedBy).toContain('bookSummary-count');
  });

  it('title input has aria-invalid set to false initially', () => {
    renderNewBookPage();

    expect(getTitleInput()).toHaveAttribute('aria-invalid', 'false');
  });

  it('title input has aria-invalid set to true after validation error', async () => {
    const user = userEvent.setup();
    renderNewBookPage();

    await user.click(getSubmitButton());

    expect(getTitleInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('submit button has aria-label', () => {
    renderNewBookPage();

    expect(getSubmitButton()).toHaveAttribute('aria-label', 'createBook.startWriting');
  });

  it('cancel button has aria-label', () => {
    renderNewBookPage();

    expect(getCancelButton()).toHaveAttribute('aria-label', 'createBook.cancel');
  });
});
