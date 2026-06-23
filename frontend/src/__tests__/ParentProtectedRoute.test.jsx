// Contopia — ParentProtectedRoute Component Tests (STORY-052 / STORY-062 / STORY-064)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ParentProtectedRoute from '../components/parent/ParentProtectedRoute';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

// Mock store state shared across selectors and getState() calls.
let mockState;

vi.mock('../stores/parent-auth-store', () => ({
  default: Object.assign(
    (selector) => selector(mockState),
    { getState: () => mockState },
  ),
}));

// Mock parent-api-client.get('/me')
const mockGet = vi.fn();
vi.mock('../lib/parent-api-client', () => ({
  default: { get: (...args) => mockGet(...args) },
}));

function makeState(overrides = {}) {
  return {
    parentToken: null,
    parentUser: null,
    setParentUser: vi.fn((user) => {
      mockState.parentUser = user;
    }),
    ...overrides,
  };
}

function renderParentProtectedRoute(initialRoute = '/parent/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/parent" element={<LocationDisplay />} />
        <Route path="*" element={
          <ParentProtectedRoute>
            <div data-testid="protected-content">Parent Dashboard</div>
          </ParentProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ParentProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = makeState();
    mockGet.mockReset();
  });

  // ── Authenticated (parentToken + parentUser present) ──

  it('renders children when parentToken exists', () => {
    mockState = makeState({ parentToken: 'parent-jwt', parentUser: { parentId: 'p1' } });
    renderParentProtectedRoute();

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Parent Dashboard')).toBeInTheDocument();
  });

  it('does not call /me when both parentToken and parentUser are present', () => {
    mockState = makeState({ parentToken: 'parent-jwt', parentUser: { parentId: 'p1' } });
    renderParentProtectedRoute();
    expect(mockGet).not.toHaveBeenCalled();
  });

  // ── STORY-064 (G5/G6): token present but parentUser null → validate via /me ──

  it('shows spinner and calls /me when parentToken present but parentUser null', async () => {
    mockState = makeState({ parentToken: 'parent-jwt', parentUser: null });
    mockGet.mockResolvedValue({ data: { data: { parentId: 'p1', email: 'mom@test.com' } } });

    renderParentProtectedRoute();

    // Spinner shown while validating
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(mockGet).toHaveBeenCalledWith('/me');
  });

  it('renders children after /me succeeds and restores parentUser', async () => {
    const setParentUser = vi.fn((user) => { mockState.parentUser = user; });
    mockState = makeState({ parentToken: 'parent-jwt', parentUser: null, setParentUser });
    mockGet.mockResolvedValue({ data: { data: { parentId: 'p1', email: 'mom@test.com' } } });

    renderParentProtectedRoute();

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(setParentUser).toHaveBeenCalledWith({ parentId: 'p1', email: 'mom@test.com' });
  });

  it('redirects to /parent when /me fails and refresh clears the token', async () => {
    mockState = makeState({ parentToken: 'parent-jwt', parentUser: null });
    // Simulate the 401 interceptor clearing the token during refresh failure.
    mockGet.mockImplementation(() => {
      mockState.parentToken = null;
      return Promise.reject(new Error('401'));
    });

    renderParentProtectedRoute();

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/parent/);
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  // ── Unauthenticated (no parentToken) ──

  it('redirects to /parent when no parentToken', () => {
    renderParentProtectedRoute('/parent/dashboard');

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/parent/);
  });

  it('redirects with returnTo query param', () => {
    renderParentProtectedRoute('/parent/dashboard/export');

    const location = screen.getByTestId('location').textContent;
    expect(location).toContain('/parent');
    expect(location).toContain('returnTo=');
    expect(location).toContain(encodeURIComponent('/parent/dashboard/export'));
  });

  // ── AC2: Child token does NOT satisfy parent guard ──

  it('rejects child token (parentToken is null even if child token exists)', () => {
    mockState = makeState({ parentToken: null });
    renderParentProtectedRoute('/parent/dashboard');

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/parent');
  });

  // ── Preserves search params in returnTo ──

  it('preserves search params in returnTo', () => {
    renderParentProtectedRoute('/parent/dashboard?tab=activity');

    const location = screen.getByTestId('location').textContent;
    expect(location).toContain(encodeURIComponent('/parent/dashboard?tab=activity'));
  });

  // ── replace history entry ──

  it('uses replace for redirect (no back-button trap)', () => {
    renderParentProtectedRoute('/parent/dashboard');
    expect(screen.getByTestId('location').textContent).toContain('/parent');
  });
});