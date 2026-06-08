// Contopia — ParentLoginPage Tests (STORY-052)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ParentLoginPage from '../app/parent/ParentLoginPage';

// Use vi.hoisted for mock values used in vi.mock factories
const { mockPost, mockStoreState } = vi.hoisted(() => {
  const post = vi.fn();
  const state = {
    parentToken: null,
    parentRefreshToken: null,
    parentUser: null,
    setParentToken: vi.fn(),
    setParentRefreshToken: vi.fn(),
    setParentUser: vi.fn(),
    setParentSession: vi.fn(),
  };
  return { mockPost: post, mockStoreState: state };
});

vi.mock('../lib/parent-api-client', () => ({
  default: { post: mockPost, get: vi.fn() },
}));

vi.mock('../stores/parent-auth-store', () => ({
  default: (selector) => selector ? selector(mockStoreState) : mockStoreState,
}));

function renderLoginPage(initialRoute = '/parent/login') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/parent/login" element={<ParentLoginPage />} />
        <Route path="/parent/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ParentLoginPage', () => {
  beforeEach(() => {
    mockPost.mockReset();
    Object.assign(mockStoreState, {
      parentToken: null,
      parentRefreshToken: null,
      parentUser: null,
      setParentToken: vi.fn(),
      setParentRefreshToken: vi.fn(),
      setParentUser: vi.fn(),
      setParentSession: vi.fn(),
    });
  });

  // ── Rendering ──

  it('renders login form with email and password fields', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders "Parent Login" heading', () => {
    renderLoginPage();
    expect(screen.getByText('Parent Login')).toBeInTheDocument();
  });

  // ── AC1: Parent can authenticate with email and password ──

  it('submits email and password to POST /api/parent/login', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      data: {
        data: {
          accessToken: 'parent-jwt',
          parentId: 'p1',
          email: 'parent@test.com',
          childId: 'c1',
          childFirstName: 'Julia',
        },
      },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'parent@test.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/login', {
        email: 'parent@test.com',
        password: 'Password1',
      });
    });
  });

  it('stores token and user on successful login', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      data: {
        data: {
          accessToken: 'parent-jwt',
          refreshToken: 'parent-refresh',
          parentId: 'p1',
          email: 'parent@test.com',
          childId: 'c1',
          childFirstName: 'Julia',
        },
      },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'parent@test.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockStoreState.setParentToken).toHaveBeenCalledWith('parent-jwt');
      expect(mockStoreState.setParentRefreshToken).toHaveBeenCalledWith('parent-refresh');
      expect(mockStoreState.setParentUser).toHaveBeenCalledWith({
        parentId: 'p1',
        email: 'parent@test.com',
        childId: 'c1',
        childFirstName: 'Julia',
      });
      expect(mockStoreState.setParentSession).toHaveBeenCalled();
    });
  });

  // ── Error handling ──

  it('shows error for invalid credentials', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue({
      response: { data: { error: { code: 'INVALID_CREDENTIALS' } }, status: 401 },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'wrong@test.com');
    await user.type(screen.getByLabelText(/^password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('shows error for rate limiting', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue({
      response: { status: 429, data: { error: { code: 'RATE_LIMITED' } } },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'parent@test.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
    });
  });

  it('shows error for network failure', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue({ request: {} }); // no response = network error

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'parent@test.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
    });
  });

  // ── Visual distinctness from child login ──

  it('has neutral slate/blue styling (not amber/child colors)', () => {
    renderLoginPage();

    const main = screen.getByRole('main');
    expect(main.className).toContain('slate');
  });
});
