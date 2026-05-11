// Contopia — LoginForm Component Tests (STORY-002)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../components/auth/LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  // ── Render defaults ──

  it('renders password tab by default with childId and password inputs', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    expect(screen.getByRole('tab', { name: 'login.passwordTab' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'login.magicLinkTab' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText('login.childId')).toBeInTheDocument();
    expect(screen.getByLabelText('login.password')).toBeInTheDocument();
  });

  it('renders tablist with correct aria-label', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'login.title');
  });

  it('renders password tabpanel with correct aria attributes', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    const panel = screen.getByRole('tabpanel', { name: 'login.passwordTab' });
    expect(panel).toHaveAttribute('id', 'password-panel');
    expect(panel).toHaveAttribute('aria-labelledby', 'password-tab');
  });

  // ── Tab switching ──

  it('switches to magic-link tab on click and shows correct fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));

    expect(screen.getByRole('tab', { name: 'login.magicLinkTab' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'login.passwordTab' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText('login.parentEmail')).toBeInTheDocument();
    expect(screen.getByLabelText('login.childFirstName')).toBeInTheDocument();
    expect(screen.queryByLabelText('login.childId')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('login.password')).not.toBeInTheDocument();
  });

  it('switches back to password tab from magic-link tab', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));
    expect(screen.getByLabelText('login.parentEmail')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'login.passwordTab' }));
    expect(screen.getByLabelText('login.childId')).toBeInTheDocument();
    expect(screen.queryByLabelText('login.parentEmail')).not.toBeInTheDocument();
  });

  it('clears magicLinkSent flag when switching back to password tab', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    // Submit magic link to trigger success alert
    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));
    await user.type(screen.getByLabelText('login.parentEmail'), 'p@ex.com');
    await user.type(screen.getByLabelText('login.childFirstName'), 'João');
    await user.click(screen.getByRole('button', { name: 'login.sendMagicLink' }));
    expect(screen.getByText('login.magicLinkSent')).toBeInTheDocument();

    // Switch back to password — success alert should disappear
    await user.click(screen.getByRole('tab', { name: 'login.passwordTab' }));
    expect(screen.queryByText('login.magicLinkSent')).not.toBeInTheDocument();
  });

  // ── Password form submit ──

  it('calls onSubmit with password data on valid submit', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.type(screen.getByLabelText('login.childId'), '507f1f77bcf86cd799439011');
    await user.type(screen.getByLabelText('login.password'), 'pass1234');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      method: 'password',
      childId: '507f1f77bcf86cd799439011',
      password: 'pass1234',
    });
  });

  // ── Magic link form submit ──

  it('calls onSubmit with magic-link data on valid submit', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));
    await user.type(screen.getByLabelText('login.parentEmail'), 'parent@example.com');
    await user.type(screen.getByLabelText('login.childFirstName'), 'João');
    await user.click(screen.getByRole('button', { name: 'login.sendMagicLink' }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      method: 'magic-link',
      parentEmail: 'parent@example.com',
      childFirstName: 'João',
    });
  });

  it('shows magic link sent success alert after submit', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));
    await user.type(screen.getByLabelText('login.parentEmail'), 'p@ex.com');
    await user.type(screen.getByLabelText('login.childFirstName'), 'João');
    await user.click(screen.getByRole('button', { name: 'login.sendMagicLink' }));

    expect(screen.getByText('login.magicLinkSent')).toBeInTheDocument();
  });

  // ── Validation errors ──

  it('shows validation error for empty childId on password tab', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    await waitFor(() => {
      const childIdInput = screen.getByLabelText('login.childId');
      expect(childIdInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(screen.getAllByText('login.errorNotFound').length).toBeGreaterThan(0);
  });

  it('shows validation error for empty password on password tab', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.type(screen.getByLabelText('login.childId'), 'abc123');
    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    await waitFor(() => {
      const passwordInput = screen.getByLabelText('login.password');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(screen.getAllByText('login.errorInvalidCredentials').length).toBeGreaterThan(0);
  });

  it('shows validation error for invalid email on magic-link tab', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));
    await user.type(screen.getByLabelText('login.parentEmail'), 'not-an-email');
    await user.type(screen.getByLabelText('login.childFirstName'), 'João');
    await user.click(screen.getByRole('button', { name: 'login.sendMagicLink' }));

    await waitFor(() => {
      const emailInput = screen.getByLabelText('login.parentEmail');
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(screen.getAllByText('register.errorEmailInvalid').length).toBeGreaterThan(0);
  });

  it('shows validation error for invalid childFirstName (numbers/symbols) on magic-link tab', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));
    await user.type(screen.getByLabelText('login.parentEmail'), 'parent@example.com');
    await user.type(screen.getByLabelText('login.childFirstName'), 'João123');
    await user.click(screen.getByRole('button', { name: 'login.sendMagicLink' }));

    await waitFor(() => {
      const nameInput = screen.getByLabelText('login.childFirstName');
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(screen.getAllByText('register.errorNameInvalid').length).toBeGreaterThan(0);
  });

  // ── Loading state ──

  it('disables submit button and shows spinner when isPending is true on password tab', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isPending={true} />);

    const button = screen.getByRole('button', { name: 'login.submit' });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('disables submit button and shows spinner when isPending is true on magic-link tab', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={true} />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));

    const button = screen.getByRole('button', { name: 'login.sendMagicLink' });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  // ── Server error ──

  it('shows server error alert when serverError prop is provided', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} serverError="Invalid credentials" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid credentials');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('hides magic link success alert when server error is present', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} serverError="Failed" />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));
    await user.type(screen.getByLabelText('login.parentEmail'), 'p@ex.com');
    await user.type(screen.getByLabelText('login.childFirstName'), 'João');
    await user.click(screen.getByRole('button', { name: 'login.sendMagicLink' }));

    // server error takes priority over success
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    expect(screen.queryByText('login.magicLinkSent')).not.toBeInTheDocument();
  });

  // ── Accessibility ──

  it('password input has aria-describedby pointing to error element on validation failure', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('button', { name: 'login.submit' }));

    await waitFor(() => {
      const childIdInput = screen.getByLabelText('login.childId');
      expect(childIdInput).toHaveAttribute('aria-describedby', 'childId-error');
      expect(childIdInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(document.getElementById('childId-error')).toHaveTextContent('login.errorNotFound');
  });

  it('magic-link tabpanel has correct aria attributes', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('tab', { name: 'login.magicLinkTab' }));

    const panel = screen.getByRole('tabpanel', { name: 'login.magicLinkTab' });
    expect(panel).toHaveAttribute('id', 'magic-link-panel');
    expect(panel).toHaveAttribute('aria-labelledby', 'magic-link-tab');
  });

  it('tab buttons have correct aria-controls attributes', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    expect(screen.getByRole('tab', { name: 'login.passwordTab' })).toHaveAttribute('aria-controls', 'password-panel');
    expect(screen.getByRole('tab', { name: 'login.magicLinkTab' })).toHaveAttribute('aria-controls', 'magic-link-panel');
  });

  it('no validation errors shown on initial render', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

    expect(screen.getByLabelText('login.childId')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText('login.password')).toHaveAttribute('aria-invalid', 'false');
  });
});