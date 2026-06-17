// Contopia — RegisterForm Component Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from '../components/auth/RegisterForm';

describe('RegisterForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders form with email, password inputs, age consent checkbox and submit button', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    expect(screen.getByLabelText('register.email')).toBeInTheDocument();
    expect(screen.getByLabelText('register.password')).toBeInTheDocument();
    expect(screen.getByLabelText('register.ageConsentLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'register.submit' })).toBeInTheDocument();
  });

  it('shows validation error when email is invalid', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    const emailInput = screen.getByLabelText('register.email');
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    // Both visible <p> and sr-only <span> render same text — use getAllByText
    expect(screen.getAllByText('register.errorEmailInvalid').length).toBeGreaterThan(0);
  });

  it('shows validation error when password is too weak', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    const passwordInput = screen.getByLabelText('register.password');
    await user.type(passwordInput, 'short');
    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    expect(screen.getAllByText('register.errorPasswordInvalid').length).toBeGreaterThan(0);
  });

  it('shows validation error when age consent is not checked', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    expect(screen.getAllByText('register.errorAgeConsent').length).toBeGreaterThan(0);
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.type(screen.getByLabelText('register.email'), 'parent@example.com');
    await user.type(screen.getByLabelText('register.password'), 'Secure1pass');
    await user.click(screen.getByLabelText('register.ageConsentLabel'));
    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    // handleSubmit passes the data as first arg, event as second
    const callArgs = mockOnSubmit.mock.calls[0];
    expect(callArgs[0]).toEqual(
      expect.objectContaining({
        email: 'parent@example.com',
        password: 'Secure1pass',
        ageConsent: true,
      }),
    );
  });

  it('displays server error when serverError prop is provided', () => {
    render(
      <RegisterForm
        onSubmit={mockOnSubmit}
        isPending={false}
        serverError="Something went wrong"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('shows spinner when isPending is true', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={true} />);

    // Spinner is rendered inside the button when isPending
    const button = screen.getByRole('button', { name: 'register.submit' });
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('submit button is disabled when isPending is true', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={true} />);

    expect(screen.getByRole('button', { name: 'register.submit' })).toBeDisabled();
  });

  it('form has correct aria attributes', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    const form = screen.getByRole('form', { name: 'register.title' });
    expect(form).toHaveAttribute('aria-label', 'register.title');
  });

  it('inputs have aria-invalid when validation errors exist', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    const emailInput = screen.getByLabelText('register.email');
    await user.type(emailInput, 'bad');
    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
  });
});