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
      // Child name appears in the sidebar child list
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

  it('shows empty state Activity tab with add-child CTA when no children exist', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard') {
        return Promise.resolve({ data: mockDashboardEmpty });
      }
      if (url === '/activity/summary') {
        return Promise.resolve({ data: { data: { hasActivity: false, childFirstName: '', childId: '' } } });
      }
      if (url === '/activity/books') {
        return Promise.resolve({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });
      }
      if (url === '/deletion-request/status') {
        return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
      }
      return Promise.resolve({ data: {} });
    });

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('activity-empty-tab')).toBeInTheDocument();
    });
    // The empty-state Activity tab shows the add-child CTA
    expect(screen.getByText('dashboardEmptyState.addChildButton')).toBeInTheDocument();
  });

  it('shows CTA button in empty state Activity tab', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard') {
        return Promise.resolve({ data: mockDashboardEmpty });
      }
      if (url === '/activity/summary') {
        return Promise.resolve({ data: { data: { hasActivity: false, childFirstName: '', childId: '' } } });
      }
      if (url === '/activity/books') {
        return Promise.resolve({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });
      }
      if (url === '/deletion-request/status') {
        return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
      }
      return Promise.resolve({ data: {} });
    });

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    const cta = await waitFor(() => screen.getByText('dashboardEmptyState.addChildButton'));
    expect(cta).toBeInTheDocument();
  });

  it('renders Export empty-state tab when navigating to /parent/dashboard/export with no children', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard') return Promise.resolve({ data: mockDashboardEmpty });
      if (url === '/activity/summary')
        return Promise.resolve({ data: { data: { hasActivity: false, childFirstName: '', childId: '' } } });
      if (url === '/activity/books')
        return Promise.resolve({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });
      if (url === '/deletion-request/status')
        return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
      return Promise.resolve({ data: {} });
    });

    render(createElement(ParentDashboardPage), { wrapper: createWrapper('/parent/dashboard/export') });
    await waitFor(() => {
      expect(screen.getByTestId('export-empty-tab')).toBeInTheDocument();
    });
    expect(screen.getByText('dashboardEmptyState.exportTitle')).toBeInTheDocument();
  });

  it('renders Delete empty-state tab when navigating to /parent/dashboard/delete with no children', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard') return Promise.resolve({ data: mockDashboardEmpty });
      if (url === '/activity/summary')
        return Promise.resolve({ data: { data: { hasActivity: false, childFirstName: '', childId: '' } } });
      if (url === '/activity/books')
        return Promise.resolve({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });
      if (url === '/deletion-request/status')
        return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
      return Promise.resolve({ data: {} });
    });

    render(createElement(ParentDashboardPage), { wrapper: createWrapper('/parent/dashboard/delete') });
    await waitFor(() => {
      expect(screen.getByTestId('delete-empty-tab')).toBeInTheDocument();
    });
    expect(screen.getByText('dashboardEmptyState.deleteTitle')).toBeInTheDocument();
  });

  it('renders Privacy tab (PrivacyPolicyPage) even with no children', async () => {
    const { default: parentApiClient } = await import('../lib/parent-api-client');
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

    render(createElement(ParentDashboardPage), { wrapper: createWrapper('/parent/dashboard/privacy') });
    // PrivacyPolicyPage renders — just confirm no empty-state crash
    await waitFor(() => {
      expect(screen.queryByTestId('activity-empty-tab')).not.toBeInTheDocument();
    });
  });

  it('REGRESSION: clicking add-child CTA navigates to /parent/dashboard/add-child', async () => {
    const user = userEvent.setup();
    const { default: parentApiClient } = await import('../lib/parent-api-client');
    parentApiClient.get.mockImplementation((url) => {
      if (url === '/dashboard') {
        return Promise.resolve({ data: mockDashboardEmpty });
      }
      if (url === '/activity/summary') {
        return Promise.resolve({ data: { data: { hasActivity: false, childFirstName: '', childId: '' } } });
      }
      if (url === '/activity/books') {
        return Promise.resolve({ data: { data: { books: [], total: 0, limit: 20, offset: 0 } } });
      }
      if (url === '/deletion-request/status') {
        return Promise.resolve({ data: { data: { hasPendingDeletion: false } } });
      }
      return Promise.resolve({ data: {} });
    });

    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    const addChildButton = await waitFor(() => screen.getByText('dashboardEmptyState.addChildButton'));
    await user.click(addChildButton);

    // Must land on the add-child page, not on /parent or /register
    await waitFor(() => {
      expect(screen.getByTestId('add-child-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('parent-unified')).not.toBeInTheDocument();
    expect(screen.queryByTestId('register-page')).not.toBeInTheDocument();
  });

  it('renders sidebar navigation with ARIA labels', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      // The <aside> has aria-label "Parent dashboard sidebar" and the <nav> has
      // aria-label "Parent dashboard navigation". The sidebar is the complementary region.
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

    // Both children appear in the sidebar child list
    await waitFor(() => {
      const sidebar = screen.getByLabelText('Parent dashboard sidebar');
      expect(within(sidebar).getByText('Julia')).toBeInTheDocument();
      expect(within(sidebar).getByText('Lucas')).toBeInTheDocument();
    });

    // Both children appear in the Activity tab child session list
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
    // No empty-state tab should be visible
    expect(screen.queryByTestId('activity-empty-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('export-empty-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-empty-tab')).not.toBeInTheDocument();
    // The add-child CTA button should not appear when children exist
    expect(screen.queryByText('dashboardEmptyState.addChildButton')).not.toBeInTheDocument();
  });

  it('full flow: empty state CTA → add child form → submit → POST called → navigate back', async () => {
    const user = userEvent.setup();
    const { default: parentApiClient } = await import('../lib/parent-api-client');

    // Start with empty dashboard
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

    // Wrapper that renders both ParentDashboardPage and AddChildPage.
    // Use staleTime: 0 and gcTime: Infinity so the dashboard query keeps its
    // cached data across remounts, allowing the component to render immediately
    // on navigation back (instead of showing a loading spinner).
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

    // 1. Empty state — CTA visible
    const cta = await waitFor(() => screen.getByText('dashboardEmptyState.addChildButton'));
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

    // 5. Verify navigation back to dashboard (the dashboard heading reappears).
    // With gcTime: Infinity, the cached empty dashboard data is still available,
    // so the component renders immediately (showing the empty state again).
    await waitFor(() => {
      expect(screen.getByTestId('activity-empty-tab')).toBeInTheDocument();
    });
  });
});