import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import ParentDashboardPage from '../app/parent/ParentDashboardPage';

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
      expect(screen.getByText('Julia')).toBeInTheDocument();
    });
  });

  it('has COPPA footer text', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/coppa compliant/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no children exist', async () => {
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
      expect(screen.getByTestId('dashboard-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('Bem-vindo ao painel dos pais!')).toBeInTheDocument();
    expect(screen.getByText('Você ainda não cadastrou nenhum filho.')).toBeInTheDocument();
  });

  it('shows CTA button with correct label in empty state', async () => {
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
      expect(screen.getByLabelText('Adicionar primeiro filho')).toBeInTheDocument();
    });
  });

  it('renders sidebar navigation with ARIA labels', async () => {
    render(createElement(ParentDashboardPage), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /parent dashboard sidebar/i })).toBeInTheDocument();
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
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /parent dashboard sidebar/i })).toBeInTheDocument();
    });
    const nav = screen.getByRole('navigation', { name: /parent dashboard sidebar/i });
    expect(nav).toHaveTextContent('Activity');
    expect(nav).toHaveTextContent('Export');
    expect(nav).toHaveTextContent('Delete');
    expect(nav).toHaveTextContent('Privacy');
  });
});