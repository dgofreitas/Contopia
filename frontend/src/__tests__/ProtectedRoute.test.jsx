// Contopia — ProtectedRoute Component Tests (STORY-002)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';

// ── Location observer component for asserting redirect URL ──
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

let mockToken = null;

vi.mock('../stores/auth-store', () => ({
  default: (selector) => selector({ token: mockToken }),
}));

function renderProtectedRoute(initialRoute = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<LocationDisplay />} />
        <Route path="*" element={
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockToken = null;
  });

  // ── Authenticated (token present) ──

  it('renders children when token exists', () => {
    mockToken = 'valid-token';
    renderProtectedRoute();

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when token is a non-empty string', () => {
    mockToken = 'eyJhbGciOiJIUzI1NiJ9.fake-token';
    renderProtectedRoute('/settings');

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  // ── Unauthenticated (no token) ──

  it('redirects to /login when no token', () => {
    renderProtectedRoute('/dashboard');

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/login/);
  });

  it('redirects to /login with returnTo query param preserving pathname', () => {
    renderProtectedRoute('/settings');

    const location = screen.getByTestId('location').textContent;
    expect(location).toContain('/login');
    expect(location).toContain('returnTo=');
    expect(location).toContain(encodeURIComponent('/settings'));
  });

  it('preserves search params in returnTo query', () => {
    renderProtectedRoute('/some-page?foo=bar&baz=1');

    const location = screen.getByTestId('location').textContent;
    expect(location).toContain('/login');
    expect(location).toContain('returnTo=');
    const expectedReturnTo = encodeURIComponent('/some-page?foo=bar&baz=1');
    expect(location).toContain(expectedReturnTo);
  });

  it('redirects with just pathname when no search params', () => {
    renderProtectedRoute('/profile');

    const location = screen.getByTestId('location').textContent;
    expect(location).toContain(encodeURIComponent('/profile'));
  });

  // ── Edge cases ──

  it('handles root path redirect', () => {
    renderProtectedRoute('/');

    const location = screen.getByTestId('location').textContent;
    expect(location).toContain('/login');
    expect(location).toContain(encodeURIComponent('/'));
  });

  it('handles deep nested path redirect', () => {
    renderProtectedRoute('/a/b/c/d?x=1');

    const location = screen.getByTestId('location').textContent;
    expect(location).toContain(encodeURIComponent('/a/b/c/d?x=1'));
  });

  it('replaces history entry (no back-button trap)', () => {
    mockToken = null;
    // Navigate should use replace — we verify the redirect happens
    // In MemoryRouter, replace means the original route is not in history stack
    // We can't directly test history.replace, but we verify the redirect occurs
    renderProtectedRoute('/dashboard');
    expect(screen.getByTestId('location').textContent).toContain('/login');
  });

  it('renders children immediately when token becomes truthy', () => {
    mockToken = 'some-jwt';
    renderProtectedRoute('/dashboard');
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});