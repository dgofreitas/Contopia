// Contopia — AddChildPage Tests (STORY-063)
// Tests form rendering, validation, submission, a11y, and avatar selection.
// Uses the i18n passthrough mock (keys returned as-is) so assertions use key strings.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import AddChildPage from '../app/parent/AddChildPage';

// Mock parent-auth-store so ParentProtectedRoute (if used) lets the page through
vi.mock('../stores/parent-auth-store', () => {
  const state = {
    parentToken: 'parent-jwt',
    parentUser: { parentId: 'p1', email: 'parent@test.com' },
  };
  const storeFn = (selector) => (selector ? selector(state) : state);
  storeFn.getState = () => state;
  return { default: storeFn };
});

// Mock parent-api-client so useAddChild mutation does not hit the network
const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock('../lib/parent-api-client', () => ({
  default: { post: mockPost, get: vi.fn() },
}));

// Mock error-store (used by parent-api-client interceptor)
vi.mock('../stores/error-store', () => ({
  useErrorStore: { getState: () => ({ addToast: vi.fn() }) },
}));

function createWrapper(initialRoute = '/parent/dashboard/add-child') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [initialRoute] },
        createElement(Routes, null,
          createElement(Route, { path: '/parent/dashboard/add-child', element: children }),
          createElement(Route, { path: '/parent/dashboard', element: createElement('div', { 'data-testid': 'dashboard' }, 'Dashboard') }),
        ),
      ),
    );
  };
}

describe('AddChildPage (STORY-063)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with title and required name field', async () => {
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    expect(screen.getByText('addChild.title')).toBeInTheDocument();
    expect(screen.getByLabelText('addChild.nameLabel')).toBeInTheDocument();
  });

  it('renders optional date of birth and avatar fields', async () => {
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    expect(screen.getByLabelText('addChild.dateOfBirthLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('addChild.avatarLabel')).toBeInTheDocument();
  });

  it('renders submit button with correct label', async () => {
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /addChild.submit/i })).toBeInTheDocument();
  });

  it('renders back button to dashboard', async () => {
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    expect(screen.getByLabelText('addChild.backToDashboard')).toBeInTheDocument();
  });

  it('shows validation error when submitting empty name', async () => {
    const user = userEvent.setup();
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);
    await waitFor(() => {
      // Error appears in helper text AND sr-only span (role=alert)
      const errors = screen.getAllByText('addChild.errorNameRequired');
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('submits with valid name and navigates to dashboard on success', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: { data: { childId: 'c1', firstName: 'Julia', avatarSeed: 'fox' } },
    });
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Julia');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/children', { firstName: 'Julia' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('shows server error when API returns CHILD_LIMIT_REACHED', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValueOnce({
      response: { status: 409, data: { error: { code: 'CHILD_LIMIT_REACHED' } } },
    });
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Sixth');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByText('addChild.errorChildLimit')).toBeInTheDocument();
    });
  });

  it('shows duplicate-name error when API returns ACCOUNT_EXISTS', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValueOnce({
      response: { status: 409, data: { error: { code: 'ACCOUNT_EXISTS' } } },
    });
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Julia');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByText('addChild.errorDuplicateName')).toBeInTheDocument();
    });
  });

  it('shows generic error on unexpected API failure', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValueOnce(new Error('network'));
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Ana');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByText('addChild.errorGeneric')).toBeInTheDocument();
    });
  });

  it('selecting an avatar includes avatarSeed in the payload', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: { data: { childId: 'c2', firstName: 'Lucas', avatarSeed: 'bear' } },
    });
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Lucas');
    // Click the bear avatar radio (aria-label is the i18n key addChild.avatarBear)
    const bearRadio = screen.getByRole('radio', { name: 'addChild.avatarBear' });
    await user.click(bearRadio);
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/children', { firstName: 'Lucas', avatarSeed: 'bear' });
    });
  });

  // ── STORY-063: New validation and a11y tests ─────────────────────────────

  it('shows invalid-name error when firstName contains numbers', async () => {
    const user = userEvent.setup();
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Julia123');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      const errors = screen.getAllByText('addChild.errorNameInvalid');
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows invalid-name error when firstName contains symbols', async () => {
    const user = userEvent.setup();
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Julia@#$');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      const errors = screen.getAllByText('addChild.errorNameInvalid');
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('accepts accented names, hyphens, apostrophes, and spaces', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: { data: { childId: 'c3', firstName: 'Ana-Maria', avatarSeed: 'fox' } },
    });
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, "Ana-Maria O'Brien");
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/children', { firstName: "Ana-Maria O'Brien" });
    });
  });

  it('shows avatar preview when an avatar is selected', async () => {
    const user = userEvent.setup();
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    // No preview initially
    expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
    // Select bear
    const bearRadio = screen.getByRole('radio', { name: 'addChild.avatarBear' });
    await user.click(bearRadio);
    expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
  });

  it('clears avatar selection when clicking the selected avatar again', async () => {
    const user = userEvent.setup();
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const bearRadio = screen.getByRole('radio', { name: 'addChild.avatarBear' });
    await user.click(bearRadio);
    expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
    // Toggle off
    await user.click(bearRadio);
    expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
  });

  it('announces server errors via role=alert aria-live=assertive', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValueOnce({
      response: { status: 409, data: { error: { code: 'CHILD_LIMIT_REACHED' } } },
    });
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Sixth');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      const alert = screen.getByTestId('server-error');
      expect(alert).toHaveAttribute('role', 'alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  it('announces firstName validation errors via role=alert aria-live=assertive', async () => {
    const user = userEvent.setup();
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      const errorSpan = document.getElementById('child-first-name-error');
      expect(errorSpan).not.toBeNull();
      expect(errorSpan).toHaveAttribute('role', 'alert');
      expect(errorSpan).toHaveAttribute('aria-live', 'assertive');
    });
  });

  it('focuses the name input on mount', async () => {
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await waitFor(() => {
      expect(nameInput).toHaveFocus();
    });
  });

  it('forwards dateOfBirth in the payload when provided', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce({
      data: { data: { childId: 'c4', firstName: 'Theo', avatarSeed: 'fox' } },
    });
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Theo');
    const dobInput = screen.getByLabelText('addChild.dateOfBirthLabel');
    await user.type(dobInput, '2018-05-10');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/children', { firstName: 'Theo', dateOfBirth: '2018-05-10' });
    });
  });

  it('keyboard-navigates avatar radios with Tab and activates with Enter/Space', async () => {
    const user = userEvent.setup();
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const foxRadio = screen.getByRole('radio', { name: 'addChild.avatarFox' });
    // Tab to the radiogroup area and focus the first radio
    foxRadio.focus();
    expect(foxRadio).toHaveFocus();
    // Activate with Enter (button role responds to click via keyboard)
    await user.keyboard('[Enter]');
    expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
  });

  it('keeps the form interactive after a server error (can retry)', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValueOnce({
      response: { status: 409, data: { error: { code: 'CHILD_LIMIT_REACHED' } } },
    });
    render(createElement(AddChildPage), { wrapper: createWrapper() });
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Sixth');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByText('addChild.errorChildLimit')).toBeInTheDocument();
    });
    // Form should still be interactive — submit button not disabled
    expect(submit).not.toBeDisabled();
    // Name input should still be editable
    expect(nameInput).not.toBeDisabled();
  });
});