// Contopia — ParentSetupPasswordPage Tests (STORY-052)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ParentSetupPasswordPage from '../app/parent/ParentSetupPasswordPage';

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock('../lib/parent-api-client', () => ({
  default: { post: mockPost, get: vi.fn() },
}));

vi.mock('../stores/parent-auth-store', () => ({
  default: (selector) => selector ? selector({ parentToken: null }) : { parentToken: null },
}));

function renderSetupPage(token = 'valid-setup-token') {
  return render(
    <MemoryRouter initialEntries={[`/parent/setup-password?token=${token}`]}>
      <Routes>
        <Route path="/parent/setup-password" element={<ParentSetupPasswordPage />} />
        <Route path="/parent/login" element={<div data-testid="parent-login">Parent Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ParentSetupPasswordPage', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  // ── No token ──

  it('shows "Invalid Link" when no token in query params', () => {
    render(
      <MemoryRouter initialEntries={['/parent/setup-password']}>
        <Routes>
          <Route path="/parent/setup-password" element={<ParentSetupPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
  });

  // ── Rendering ──

  it('renders password setup form when token is present', () => {
    renderSetupPage();

    expect(screen.getByText(/set your password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  // ── NFR-SEC-04: Password validation ──

  it('shows error when password is too short (< 8 chars)', async () => {
    const user = userEvent.setup();
    renderSetupPage();

    await user.type(screen.getByLabelText(/^password/i), 'short');

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows error when password has no uppercase letter', async () => {
    const user = userEvent.setup();
    renderSetupPage();

    await user.type(screen.getByLabelText(/^password/i), 'lowercase1');

    await waitFor(() => {
      expect(screen.getByText(/at least 1 uppercase/i)).toBeInTheDocument();
    });
  });

  it('shows error when password has no number', async () => {
    const user = userEvent.setup();
    renderSetupPage();

    await user.type(screen.getByLabelText(/^password/i), 'NoNumber');

    await waitFor(() => {
      expect(screen.getByText(/at least 1 number/i)).toBeInTheDocument();
    });
  });

  it('shows success indicator for valid password', async () => {
    const user = userEvent.setup();
    renderSetupPage();

    await user.type(screen.getByLabelText(/^password/i), 'Password1');

    await waitFor(() => {
      expect(screen.getByText(/password meets requirements/i)).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderSetupPage();

    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different1');

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  // ── Submission ──

  it('submits token and password to POST /api/parent/setup-password', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      data: { data: { parentId: 'p1', email: 'parent@test.com', passwordSet: true } },
    });

    renderSetupPage('my-token-123');

    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/setup-password', {
        token: 'my-token-123',
        password: 'Password1',
      });
    });
  });

  it('shows success screen after successful password setup', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      data: { data: { parentId: 'p1', email: 'parent@test.com', passwordSet: true } },
    });

    renderSetupPage();

    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password set/i)).toBeInTheDocument();
    });
  });

  // ── Token expiry ──

  it('shows error for expired token', async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue({
      response: { data: { error: { code: 'TOKEN_EXPIRED' } } },
    });

    renderSetupPage();

    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(screen.getByText(/setup link has expired/i)).toBeInTheDocument();
    });
  });
});
