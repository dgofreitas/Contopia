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

  it('renders form with email and name inputs and submit button', () => {
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    expect(screen.getByLabelText('register.parentEmail')).toBeInTheDocument();
    expect(screen.getByLabelText('register.childFirstName')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'register.submit' })).toBeInTheDocument();
  });

  it('shows validation error when email is invalid', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    const emailInput = screen.getByLabelText('register.parentEmail');
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    // Both visible <p> and sr-only <span> render same text — use getAllByText
    expect(screen.getAllByText('register.errorEmailInvalid').length).toBeGreaterThan(0);
  });

  it('shows validation error when name contains numbers/symbols', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    const nameInput = screen.getByLabelText('register.childFirstName');
    await user.type(nameInput, 'João123');
    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    // Both visible <p> and sr-only <span> render same text — use getAllByText
    expect(screen.getAllByText('register.errorNameInvalid').length).toBeGreaterThan(0);
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSubmit={mockOnSubmit} isPending={false} />);

    await user.type(screen.getByLabelText('register.parentEmail'), 'parent@example.com');
    await user.type(screen.getByLabelText('register.childFirstName'), 'João');
    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    // handleSubmit passes the data as first arg, event as second
    const callArgs = mockOnSubmit.mock.calls[0];
    expect(callArgs[0]).toEqual(
      expect.objectContaining({
        parentEmail: 'parent@example.com',
        childFirstName: 'João',
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

    const emailInput = screen.getByLabelText('register.parentEmail');
    await user.type(emailInput, 'bad');
    await user.click(screen.getByRole('button', { name: 'register.submit' }));

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'parentEmail-error');
  });
});