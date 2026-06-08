// Contopia — ParentDashboardPage Tests (STORY-052)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ParentDashboardPage from '../app/parent/ParentDashboardPage';

const { mockParentToken, mockParentUser, mockSetParentUser, mockParentGet } = vi.hoisted(() => {
  let token = 'parent-jwt';
  let user = { parentId: 'p1', email: 'parent@test.com', childId: 'c1', childFirstName: 'Julia', dashNav: ['activity', 'export', 'delete', 'privacy'] };
  const setParentUser = vi.fn();
  return {
    mockParentToken: token,
    mockParentUser: user,
    mockSetParentUser: setParentUser,
    mockParentGet: { value: token, user },
  };
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
      return Promise.resolve({
        data: { data: { parentId: 'p1', email: 'parent@test.com', childId: 'c1', childFirstName: 'Julia', dashNav: ['activity', 'export', 'delete', 'privacy'] } },
      });
    }),
  },
}));

vi.mock('../stores/parent-auth-store', () => ({
  default: (selector) => selector ? selector({
    parentToken: 'parent-jwt',
    parentUser: { parentId: 'p1', email: 'parent@test.com', childId: 'c1', childFirstName: 'Julia', dashNav: ['activity', 'export', 'delete', 'privacy'] },
    setParentUser: vi.fn(),
  }) : {},
}));

// Need a way to control parentToken per-test
let testParentToken = 'parent-jwt';

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

function renderDashboardPage(initialRoute = '/parent/dashboard') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/parent/login" element={<div data-testid="parent-login">Login</div>} />
          <Route path="/parent/dashboard/*" element={<ParentDashboardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ParentDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── AC3: Dashboard shell with nav tabs ──

  it('renders Activity Summary as default tab', async () => {
    renderDashboardPage();
    await waitFor(() => {
      expect(screen.getByText('Resumo de Atividade')).toBeInTheDocument();
    });
  });

  it('renders child name in activity tab', async () => {
    renderDashboardPage();
    await waitFor(() => {
      expect(screen.getByText(/Julia/)).toBeInTheDocument();
    });
  });

  it('navigates to Export tab', async () => {
    const user = userEvent.setup();

    renderDashboardPage();

    const exportLinks = screen.getAllByText('Export');
    await user.click(exportLinks[0]);

    await waitFor(() => {
      expect(screen.getByText(/download your child/i)).toBeInTheDocument();
    });
  });

  it('navigates to Delete tab', async () => {
    const user = userEvent.setup();

    renderDashboardPage();

    const deleteLinks = screen.getAllByText('Delete');
    await user.click(deleteLinks[0]);

    await waitFor(() => {
      expect(screen.getByText(/permanently delete account/i)).toBeInTheDocument();
    });
  });

  it('navigates to Privacy tab', async () => {
    const user = userEvent.setup();

    renderDashboardPage();

    const privacyLinks = screen.getAllByText('Privacy');
    await user.click(privacyLinks[0]);

    await waitFor(() => {
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });
  });

  // ── AC5: Visual distinctness ──

  it('has COPPA footer text', () => {
    renderDashboardPage();
    expect(screen.getByText(/coppa compliant/i)).toBeInTheDocument();
  });

  it('has neutral background (slate, not amber)', () => {
    renderDashboardPage();
    // The main element's parent div has the bg-slate-50 class
    const main = screen.getByRole('main');
    expect(main.parentElement.className).toContain('slate');
  });

  // ── Privacy content ──

  it('shows COPPA compliant info in privacy tab', async () => {
    const user = userEvent.setup();

    renderDashboardPage();

    const privacyLinks = screen.getAllByText('Privacy');
    await user.click(privacyLinks[0]);

    await waitFor(() => {
      expect(screen.getByText('COPPA Compliant')).toBeInTheDocument();
    });
  });

  it('shows No Tracking info in privacy tab', async () => {
    const user = userEvent.setup();

    renderDashboardPage();

    const privacyLinks = screen.getAllByText('Privacy');
    await user.click(privacyLinks[0]);

    await waitFor(() => {
      expect(screen.getByText('No Tracking')).toBeInTheDocument();
    });
  });
});
