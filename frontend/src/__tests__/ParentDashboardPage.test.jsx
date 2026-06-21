import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import ParentDashboardPage from '../app/parent/ParentDashboardPage';
import AddChildPage from '../app/parent/AddChildPage';

const mockDashboardData = {
  data: {
    email: 'parent@test.com',
    children: [
      { childId: 'c1', firstName: 'Julia', createdAt: '2025-01-15T10:00:00Z' },
    ],
  },
};

const mockDashboardEmpty = {
  data: {
    email: 'parent@test.com',
    children: [],
  },
};

vi.mock('../stores/parent-auth-store', () => {
  const state = {
    parentToken: 'parent-jwt',
    parentUser: { parentId: 'p1', email: 'parent@test.com', childId: 'c1', childFirstName: 'Julia', dashNav: ['activity', 'export', 'delete', 'privacy'] },
    setParentUser: vi.fn(),
  };
  const storeFn = (selector) => selector ? selector(state) : state;
  storeFn.getState = () => state;
  return { default: storeFn };
});

vi.mock('../lib/parent-api-client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockImplementation((url) => {
      if (url === '/activity/summary') {
        return Promise.resolve({
          data: { data: { booksWritten: 5, booksRead: 3, readingTimeMinutes: 45, childFirstName: 'Julia', childId: 'c1', hasActivity: true } },
        });
      }
      if (url === '/activity/books') {
        return Promise.resolve({
          data: { data: { books: [], total: 0, limit: 20, offset: 0 } },
        });
      }
      if (url === '/dashboard') {
        return Promise.resolve({ data: mockDashboardData });
      }
      if (url === '/deletion-request/status') {
        return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
      }
      return Promise.resolve({
        data: { data: { parentId: 'p1', email: 'parent@test.com', childId: 'c1', childFirstName: 'Julia', dashNav: ['activity', 'export', 'delete', 'privacy'] } },
      });
    }),
  },
}));

vi.mock('../hooks/useParentAuth', () => ({
  default: () => ({
    isAuthenticated: true,
    isIdle: false,
    idleTime: 0,
    parentSessionExpiresAt: Date.now() + 1800000,
    continueParentSession: vi.fn(),
    logout: vi.fn().mockResolvedValue(),
  }),
}));

function createWrapper(initialRoute = '/parent/dashboard') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [initialRoute] },
        createElement(Routes, null,
          createElement(Route, { path: '/parent/login', element: createElement('div', { 'data-testid': 'parent-login' }, 'Login') }),
          createElement(Route, { path: '/register', element: createElement('div', { 'data-testid': 'register-page' }, 'Register') }),
          createElement(Route, { path: '/parent', element: createElement('div', { 'data-testid': 'parent-unified' }, 'Unified') }),
          createElement(Route, { path: '/parent/dashboard/add-child', element: createElement('div', { 'data-testid': 'add-child-page' }, 'Add Child') }),
          createElement(Route, { path: '/parent/dashboard/*', element: children }),
        ),
      ),
    );
  };
}

/** Helper: mock API to return empty dashboard (no children) for all tabs. */
function mockEmptyDashboard(parentApiClient) {
  parentApiClient.get.mockImplementation((url) => {
    if (url === '/dashboard') return Promise.resolve({ data: mockDashboardEmpty });
    if (url === '/activity/summary')
      return Promise.resolve({ data: { data: { hasActivity: false, childFirstName: '', childId: '' } } });
    if (url === '/activity/books')
      return Promise.resolve({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });
    if (url === '/deletion-request/status')
      return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
    if (url === '/privacy-policy')
      return Promise.resolve({ data: { data: { sections: [] } } });
    return Promise.resolve({ data: {} });
  });
}

describe('ParentDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Activity Summary as default tab', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Resumo de Atividade')).toBeInTheDocument();
    });
  });

  it('renders child name in child list', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      const juliaElements = screen.getAllByText('Julia');
      expect(juliaElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('has COPPA footer text', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/coppa compliant/i)).toBeInTheDocument();
    });
  });

  // ── STORY-065: Empty state Activity tab ────────────────────────────────

  it('shows empty state Activity tab with distinct amber empty state when no children exist', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('activity-empty-tab')).toBeInTheDocument();
    });
    // Activity tab uses the new activityCta key (amber outline)
    expect(screen.getByText('dashboardEmptyState.activityCta')).toBeInTheDocument();
    // Activity heading
    expect(screen.getByText('dashboardEmptyState.activityTitle')).toBeInTheDocument();
    // Second paragraph exists
    expect(screen.getByText('dashboardEmptyState.activitySecondParagraph')).toBeInTheDocument();
  });

  it('shows CTA button in empty state Activity tab', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    const cta = await waitFor(() => screen.getByText('dashboardEmptyState.activityCta'));
    expect(cta).toBeInTheDocument();
  });

  // ── STORY-065: Export empty state ──────────────────────────────────────

  it('renders Export empty-state tab with blue accent and second paragraph', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper('/parent/dashboard/export') });
    await waitFor(() => {
      expect(screen.getByTestId('export-empty-tab')).toBeInTheDocument();
    });
    // Distinct heading
    expect(screen.getByText('dashboardEmptyState.exportTitle')).toBeInTheDocument();
    // First paragraph
    expect(screen.getByText('dashboardEmptyState.exportDescription')).toBeInTheDocument();
    // Second paragraph (data-export expectation)
    expect(screen.getByText('dashboardEmptyState.exportSecondParagraph')).toBeInTheDocument();
    // Distinct CTA
    expect(screen.getByText('dashboardEmptyState.exportCta')).toBeInTheDocument();
  });

  // ── STORY-065: Delete empty state ─────────────────────────────────────

  it('renders Delete empty-state tab with gray/red accent and second paragraph', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper('/parent/dashboard/delete') });
    await waitFor(() => {
      expect(screen.getByTestId('delete-empty-tab')).toBeInTheDocument();
    });
    // Distinct heading
    expect(screen.getByText('dashboardEmptyState.deleteTitle')).toBeInTheDocument();
    // First paragraph
    expect(screen.getByText('dashboardEmptyState.deleteDescription')).toBeInTheDocument();
    // Second paragraph (GDPR/LGPD rights)
    expect(screen.getByText('dashboardEmptyState.deleteSecondParagraph')).toBeInTheDocument();
    // Distinct CTA
    expect(screen.getByText('dashboardEmptyState.deleteCta')).toBeInTheDocument();
  });

  // ── STORY-065: Privacy tab (no empty state) ────────────────────────────

  it('renders Privacy tab (PrivacyPolicyPage) even with no children', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper('/parent/dashboard/privacy') });
    await waitFor(() => {
      expect(screen.queryByTestId('activity-empty-tab')).not.toBeInTheDocument();
    });
  });

  // ── STORY-065: Tab navigation renders distinct content ────────────────

  it('tab navigation renders visually distinct content for Activity, Export, Delete, Privacy', async () => {
    const user = userEvent.setup();
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });

    // Start on Activity tab
    await waitFor(() => {
      expect(screen.getByTestId('activity-empty-tab')).toBeInTheDocument();
    });

    // Navigate to Export
    const exportBtn = screen.getByRole('button', { name: /export/i });
    await user.click(exportBtn);
    await waitFor(() => {
      expect(screen.getByTestId('export-empty-tab')).toBeInTheDocument();
    });
    expect(screen.getByText('dashboardEmptyState.exportTitle')).toBeInTheDocument();

    // Navigate to Delete
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByTestId('delete-empty-tab')).toBeInTheDocument();
    });
    expect(screen.getByText('dashboardEmptyState.deleteTitle')).toBeInTheDocument();

    // Navigate to Privacy
    const privacyBtn = screen.getByRole('button', { name: /privacy/i });
    await user.click(privacyBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('activity-empty-tab')).not.toBeInTheDocument();
    });

    // Navigate back to Activity
    const activityBtn = screen.getByRole('button', { name: /activity/i });
    await user.click(activityBtn);
    await waitFor(() => {
      expect(screen.getByTestId('activity-empty-tab')).toBeInTheDocument();
    });
  });

  // ── STORY-065: aria-live region ────────────────────────────────────────

  it('has aria-live polite region for screen reader announcements', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      const liveRegion = screen.getByTestId('tab-content-live-region');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });

  // ── STORY-065: CTA navigation from any empty state ─────────────────────

  it('REGRESSION: clicking add-child CTA from Activity tab navigates to /parent/dashboard/add-child', async () => {
    const user = userEvent.setup();
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    const addChildButton = await waitFor(() => screen.getByText('dashboardEmptyState.activityCta'));
    await user.click(addChildButton);

    await waitFor(() => {
      expect(screen.getByTestId('add-child-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('parent-unified')).not.toBeInTheDocument();
    expect(screen.queryByTestId('register-page')).not.toBeInTheDocument();
  });

  it('CTA from Export empty state navigates to /parent/dashboard/add-child', async () => {
    const user = userEvent.setup();
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper('/parent/dashboard/export') });
    const cta = await waitFor(() => screen.getByText('dashboardEmptyState.exportCta'));
    await user.click(cta);

    await waitFor(() => {
      expect(screen.getByTestId('add-child-page')).toBeInTheDocument();
    });
  });

  it('CTA from Delete empty state navigates to /parent/dashboard/add-child', async () => {
    const user = userEvent.setup();
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper('/parent/dashboard/delete') });
    const cta = await waitFor(() => screen.getByText('dashboardEmptyState.deleteCta'));
    await user.click(cta);

    await waitFor(() => {
      expect(screen.getByTestId('add-child-page')).toBeInTheDocument();
    });
  });

  // ── STORY-065: Mobile responsive attributes ────────────────────────────

  it('empty state CTAs have full-width and min-height 44px for mobile tap targets', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    mockEmptyDashboard(parentApiClient);

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('activity-empty-tab')).toBeInTheDocument();
    });

    const cta = screen.getByTestId('activity-add-child-cta');
    // The CTA button should have min-h-[44px] for mobile tap targets
    expect(cta.className).toContain('min-h-[44px]');
    // The CTA should be full-width on mobile (w-full) and auto on larger screens
    expect(cta.className).toContain('w-full');
    expect(cta.className).toContain('sm:w-auto');
  });

  // ── Existing tests (unchanged) ─────────────────────────────────────────

  it('renders sidebar navigation with ARIA labels', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Parent dashboard sidebar')).toBeInTheDocument();
    });
  });

  it('renders hamburger menu button with accessible label', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      const hamburger = screen.getByLabelText('Open sidebar navigation');
      expect(hamburger).toBeInTheDocument();
    });
  });

  it('renders logout button in sidebar', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Log out of parent account')).toBeInTheDocument();
    });
  });

  it('renders sidebar nav items', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    const nav = await waitFor(() => screen.getByRole('navigation', { name: /parent dashboard navigation/i }));
    expect(nav).toHaveTextContent('Activity');
    expect(nav).toHaveTextContent('Export');
    expect(nav).toHaveTextContent('Delete');
    expect(nav).toHaveTextContent('Privacy');
  });

  // ── STORY-063: Multi-child and full-flow integration tests ───────────────

  it('renders all children in sidebar and Activity tab when multiple children exist', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    const multiChildDashboard = {
      data: {
        email: 'parent@test.com',
        children: [
          { childId: 'c1', firstName: 'Julia', createdAt: '2025-01-15T10:00:00Z' },
          { childId: 'c2', firstName: 'Lucas', createdAt: '2025-02-20T10:00:00Z' },
        ],
      },
    };
    parentApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard') return Promise.resolve({ data: multiChildDashboard });
      if (url === '/activity/summary')
        return Promise.resolve({
          data: {
            data: {
              booksWritten: 5,
              booksRead: 3,
              readingTimeMinutes: 45,
              childFirstName: 'Julia',
              childId: 'c1',
              hasActivity: true,
              children: [
                { childId: 'c1', firstName: 'Julia' },
                { childId: 'c2', firstName: 'Lucas' },
              ],
            },
          },
        });
      if (url === '/activity/books')
        return Promise.resolve({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });
      if (url === '/deletion-request/status')
        return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
      return Promise.resolve({ data: {} });
    });

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });

    await waitFor(() => {
      const sidebar = screen.getByLabelText('Parent dashboard sidebar');
      expect(within(sidebar).getByText('Julia')).toBeInTheDocument();
      expect(within(sidebar).getByText('Lucas')).toBeInTheDocument();
    });

    await waitFor(() => {
      const main = screen.getByRole('main');
      expect(within(main).getByText('Julia')).toBeInTheDocument();
      expect(within(main).getByText('Lucas')).toBeInTheDocument();
    });
  });

  it('does not show empty-state CTA when hasChildren is true', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Resumo de Atividade')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('activity-empty-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('export-empty-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-empty-tab')).not.toBeInTheDocument();
    // The old addChildButton key should not appear
    expect(screen.queryByText('dashboardEmptyState.addChildButton')).not.toBeInTheDocument();
    // The new activityCta key should not appear either
    expect(screen.queryByText('dashboardEmptyState.activityCta')).not.toBeInTheDocument();
  });

  it('full flow: empty state CTA → add child form → submit → POST called → navigate back', async () => {
    const user = userEvent.setup();
    const { default: parentApiClient } = await import('../lib/parent-api-client');

    const emptyDashboard = { data: { email: 'parent@test.com', children: [] } };
    const emptySummary = { data: { data: { hasActivity: false, childFirstName: '', childId: '' } } };

    parentApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard') return Promise.resolve({ data: emptyDashboard });
      if (url === '/activity/summary') return Promise.resolve(emptySummary);
      if (url === '/activity/books')
        return Promise.resolve({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });
      if (url === '/deletion-request/status')
        return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
      return Promise.resolve({ data: {} });
    });

    parentApiClient.post.mockResolvedValue({
      data: { data: { childId: 'c-new', firstName: 'Emma', avatarSeed: 'fox' } },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
    });
    function FlowWrapper({ children }) {
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ['/parent/dashboard'] },
          createElement(
            Routes,
            null,
            createElement(Route, { path: '/parent/dashboard/add-child', element: createElement(AddChildPage) }),
            createElement(Route, { path: '/parent/dashboard/*', element: createElement(ParentDashboardPage) }),
          ),
        ),
      );
    }

    render(createElement(ParentDashboardPage), { wrapper: FlowWrapper });

    // 1. Empty state — CTA visible (new key)
    const cta = await waitFor(() => screen.getByText('dashboardEmptyState.activityCta'));
    expect(screen.getByTestId('activity-empty-tab')).toBeInTheDocument();

    // 2. Click CTA → navigate to add-child page
    await user.click(cta);
    await waitFor(() => {
      expect(screen.getByText('addChild.title')).toBeInTheDocument();
    });

    // 3. Fill form and submit
    const nameInput = screen.getByLabelText('addChild.nameLabel');
    await user.type(nameInput, 'Emma');
    const submit = screen.getByRole('button', { name: /addChild.submit/i });
    await user.click(submit);

    // 4. Verify POST was called with correct payload
    await waitFor(() => {
      expect(parentApiClient.post).toHaveBeenCalledWith('/children', { firstName: 'Emma' });
    });

    // 5. Verify navigation back to dashboard
    await waitFor(() => {
      expect(screen.getByTestId('activity-empty-tab')).toBeInTheDocument();
    });
  });
});
