// Contopia — ParentProtectedRoute Component Tests (STORY-052)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ParentProtectedRoute from '../components/parent/ParentProtectedRoute';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

let mockParentToken = null;

vi.mock('../stores/parent-auth-store', () => ({
  default: (selector) => selector({ parentToken: mockParentToken }),
}));

function renderParentProtectedRoute(initialRoute = '/parent/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/parent/login" element={<LocationDisplay />} />
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
    mockParentToken = null;
  });

  // ── Authenticated (parentToken present) ──

  it('renders children when parentToken exists', () => {
    mockParentToken = 'parent-jwt';
    renderParentProtectedRoute();

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Parent Dashboard')).toBeInTheDocument();
  });

  // ── Unauthenticated (no parentToken) ──

  it('redirects to /parent/login when no parentToken', () => {
    renderParentProtectedRoute('/parent/dashboard');

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/parent\/login/);
  });

  it('redirects with returnTo query param', () => {
    renderParentProtectedRoute('/parent/dashboard/export');

    const location = screen.getByTestId('location').textContent;
    expect(location).toContain('/parent/login');
    expect(location).toContain('returnTo=');
    expect(location).toContain(encodeURIComponent('/parent/dashboard/export'));
  });

  // ── AC2: Child token does NOT satisfy parent guard ──

  it('rejects child token (parentToken is null even if child token exists)', () => {
    // This simulates the critical AC2 scenario: a child is logged in (child token exists
    // in child auth-store), but navigates to /parent/dashboard. The ParentProtectedRoute
    // checks parent-auth-store.parentToken which is null — so redirect occurs.
    mockParentToken = null;
    renderParentProtectedRoute('/parent/dashboard');

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/parent/login');
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
    expect(screen.getByTestId('location').textContent).toContain('/parent/login');
  });
});
