// Contopia — UnifiedParentPage Component Tests (STORY-062)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  checkEmailMutate: vi.fn(),
  checkEmailReset: vi.fn(),
  axiosPost: vi.fn(),
  store: {
    setParentToken: vi.fn(),
    setParentRefreshToken: vi.fn(),
    setParentUser: vi.fn(),
    setParentSession: vi.fn(),
    register: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  LazyMotion: ({ children }) => <>{children}</>,
  domAnimation: {},
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

// Mock react-icons/hi
vi.mock('react-icons/hi', () => ({
  HiLockClosed: () => <svg data-testid="lock-icon" />,
  HiMail: () => <svg data-testid="mail-icon" />,
  HiCheckCircle: () => <svg data-testid="check-icon" />,
}));

// Mock react-icons/fa
vi.mock('react-icons/fa', () => ({
  FaEnvelope: () => <svg data-testid="fa-envelope" />,
  FaLock: () => <svg data-testid="fa-lock" />,
}));

// Mock flowbite-react
vi.mock('flowbite-react', () => {
  const React = require('react');
  const MockLabel = ({ htmlFor, value, children, ...props }) => {
    const labelProps = {};
    if (htmlFor) labelProps.htmlFor = htmlFor;
    return <label {...labelProps} {...props}>{value || children}</label>;
  };
  // forwardRef is required: react-hook-form register() returns a ref that
  // must reach the native <input>. Without forwardRef, form validation
  // cannot read the DOM value and every submit fails.
  const MockTextInput = React.forwardRef((props, forwardedRef) => {
    const { id, type, placeholder, icon: Icon, disabled, color, helperText, value, ...rest } = props;
    // Merge forwardedRef with any callback ref from register()'s ref merge
    // (the component sometimes uses ref={e => { register('field').ref(e); customRef.current = e; }})
    const mergedRef = React.useCallback((node) => {
      // Apply the forwarded ref
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
      // Apply any existing ref from ...rest (register merge-ref pattern)
      if (rest.ref) {
        if (typeof rest.ref === 'function') rest.ref(node);
        else rest.ref.current = node;
      }
    }, [forwardedRef, rest.ref]);
    const { ref: _restRef, ...restWithoutRef } = rest;
    const inputProps = {
      id,
      type: type || 'text',
      placeholder,
      disabled,
      'data-color': color || undefined,
      'data-testid': id ? `input-${id}` : 'input-unknown',
      ...restWithoutRef,
      ref: mergedRef,
    };
    // Only set value when explicitly provided (for disabled display inputs).
    // When undefined, omit value so react-hook-form register() can manage
    // the input as uncontrolled — typing events then update form state correctly.
    if (value !== undefined) inputProps.value = value;
    return (
      <div>
        <input {...inputProps} />
        {helperText && <p className="helper-text">{helperText}</p>}
      </div>
    );
  });
  const MockButton = ({ children, onClick, disabled, type, ...props }) => (
    <button onClick={onClick} disabled={disabled} type={type || 'button'} {...props}>
      {children}
    </button>
  );
  const MockAlert = ({ children, color, icon: Icon, ...props }) => (
    <div data-color={color} role="alert" {...props}>{Icon && <Icon />}{children}</div>
  );
  const MockCheckbox = React.forwardRef(({ id, ...props }, ref) => (
    <input id={id} type="checkbox" ref={ref} {...props} />
  ));
  const MockSpinner = ({ size }) => <span data-testid="spinner" data-size={size} />;
  return {
    Label: MockLabel,
    TextInput: MockTextInput,
    Button: MockButton,
    Alert: MockAlert,
    Checkbox: MockCheckbox,
    Spinner: MockSpinner,
  };
});

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({
    mutate: mocks.checkEmailMutate,
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
    data: null,
    reset: mocks.checkEmailReset,
  })),
  useQueryClient: vi.fn(() => ({})),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }) => <>{children}</>,
}));

// Mock useCheckEmail hook
vi.mock('../hooks/useCheckEmail', () => ({
  default: () => ({
    mutate: mocks.checkEmailMutate,
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
    data: null,
    reset: mocks.checkEmailReset,
  }),
}));

// Mock parent-auth-store
vi.mock('../stores/parent-auth-store', () => ({
  default: (selector) => {
    const state = {
      parentToken: null,
      setParentToken: mocks.store.setParentToken,
      setParentRefreshToken: mocks.store.setParentRefreshToken,
      setParentUser: mocks.store.setParentUser,
      setParentSession: mocks.store.setParentSession,
      register: mocks.store.register,
    };
    return selector ? selector(state) : state;
  },
  getState: () => ({ register: mocks.store.register }),
}));

// Mock axios
vi.mock('axios', () => ({
  default: { post: mocks.axiosPost },
  post: mocks.axiosPost,
}));

import UnifiedParentPage from '../app/parent/UnifiedParentPage';

function renderPage(initialEntries = ['/parent']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <UnifiedParentPage />
    </MemoryRouter>,
  );
}

// Helper: make checkEmailMutate call onSuccess with given result
function mockCheckEmailSuccess(exists) {
  mocks.checkEmailMutate.mockImplementation((_data, { onSuccess }) => {
    onSuccess({ exists });
  });
}

// Helper: make checkEmailMutate call onError with given error
function mockCheckEmailError(status, code) {
  mocks.checkEmailMutate.mockImplementation((_data, { onError }) => {
    onError({ response: { status, data: { error: { code } } } });
  });
}

describe('UnifiedParentPage (STORY-062)', () => {
  beforeEach(() => {
    // Don't use clearAllMocks — it resets mockImplementation set in test bodies
    // Only clear call counts for assertion accuracy
    mocks.navigate.mockClear();
    mocks.checkEmailReset.mockClear();
    mocks.axiosPost.mockClear();
    Object.values(mocks.store).forEach((fn) => fn.mockClear());
  });

  // ── Initial Render (idle state) ─────────────────────────────────────────

  it('should render email field and "Continuar" button in idle state', () => {
    renderPage();

    expect(screen.getByText('unifiedAuth.title')).toBeInTheDocument();
    expect(screen.getByLabelText('unifiedAuth.emailLabel')).toBeInTheDocument();
    expect(screen.getByText('unifiedAuth.continueButton')).toBeInTheDocument();
    expect(screen.queryByText('unifiedAuth.loginHeading')).not.toBeInTheDocument();
    expect(screen.queryByText('unifiedAuth.registerHeading')).not.toBeInTheDocument();
  });

  it('should show COPPA compliance notice', () => {
    renderPage();
    expect(screen.getByText(/COPPA compliant/i)).toBeInTheDocument();
  });

  it('should render the form with aria-label for accessibility', () => {
    renderPage();
    const form = screen.getByLabelText('unifiedAuth.title');
    expect(form).toBeInTheDocument();
  });

  // ── Email Validation ───────────────────────────────────────────────────

  it('should show email validation error for invalid email on submit', async () => {
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'invalid-email');

    const continueBtn = screen.getByText('unifiedAuth.continueButton');
    await user.click(continueBtn);

    await waitFor(() => {
      const errors = screen.getAllByText('unifiedAuth.errorEmailInvalid');
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should not call checkEmail when email is invalid', async () => {
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'bad');

    const continueBtn = screen.getByText('unifiedAuth.continueButton');
    await user.click(continueBtn);

    expect(mocks.checkEmailMutate).not.toHaveBeenCalled();
  });

  // ── Login Mode ─────────────────────────────────────────────────────────

  it('should transition to login mode when email exists', async () => {
    mockCheckEmailSuccess(true);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'existing@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      // Heading appears twice: in <h2> and in sr-only aria-live region.
      // Use getAllByText to avoid "found multiple elements" error.
      const headings = screen.getAllByText('unifiedAuth.loginHeading');
      expect(headings.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('unifiedAuth.loginSubtitle')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument();
    expect(screen.getByText('unifiedAuth.loginButton')).toBeInTheDocument();
  });

  it('should show "Não é você?" link in login mode', async () => {
    mockCheckEmailSuccess(true);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'existing@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(screen.getByText('unifiedAuth.notYouLink')).toBeInTheDocument();
    });
  });

  // ── Register Mode ─────────────────────────────────────────────────────

  it('should transition to register mode when email does not exist', async () => {
    mockCheckEmailSuccess(false);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'new@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      const headings = screen.getAllByText('unifiedAuth.registerHeading');
      expect(headings.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('unifiedAuth.registerSubtitle')).toBeInTheDocument();
    });

    expect(screen.getByText('unifiedAuth.registerButton')).toBeInTheDocument();
  });

  it('should show "Já tem conta?" link in register mode', async () => {
    mockCheckEmailSuccess(false);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'new@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(screen.getByText('unifiedAuth.alreadyHaveAccount')).toBeInTheDocument();
    });
  });

  // ── Mode Switching ────────────────────────────────────────────────────

  it('should reset to idle when "Não é você?" is clicked', async () => {
    mockCheckEmailSuccess(true);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'existing@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(screen.getAllByText('unifiedAuth.loginHeading').length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByText('unifiedAuth.notYouLink'));

    expect(screen.getByText('unifiedAuth.continueButton')).toBeInTheDocument();
    // After reset, the visible login heading should be gone;
    // the sr-only aria-live region may persist but the h2 heading should not.
    expect(screen.queryByRole('heading', { name: 'unifiedAuth.loginHeading' })).not.toBeInTheDocument();
  });

  it('should reset to idle when "Já tem conta?" is clicked', async () => {
    mockCheckEmailSuccess(false);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'new@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(screen.getAllByText('unifiedAuth.registerHeading').length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByText('unifiedAuth.alreadyHaveAccount'));

    expect(screen.getByText('unifiedAuth.continueButton')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'unifiedAuth.registerHeading' })).not.toBeInTheDocument();
  });

  // ── 409 Race Condition Handling ────────────────────────────────────────

  it('should switch to login mode when register returns 409 ACCOUNT_EXISTS', async () => {
    mockCheckEmailSuccess(false);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'race@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(screen.getAllByText('unifiedAuth.registerHeading').length).toBeGreaterThanOrEqual(1);
    });

    // Use test-id selectors for register form fields since labels may have
    // non-unique text in the mocked translation-passthrough environment
    const passwordInput = screen.getByTestId('input-register-password');
    await user.type(passwordInput, 'StrongPass1');

    const confirmInput = screen.getByTestId('input-register-confirm-password');
    await user.type(confirmInput, 'StrongPass1');

    const ageConsent = screen.getByRole('checkbox', { name: /ageConsentLabel/i });
    await user.click(ageConsent);

    const axiosError = new Error('Account exists');
    axiosError.response = { status: 409, data: { error: { code: 'ACCOUNT_EXISTS' } } };
    mocks.axiosPost.mockRejectedValue(axiosError);

    await user.click(screen.getByText('unifiedAuth.registerButton'));

    await waitFor(() => {
      expect(screen.getAllByText('unifiedAuth.loginHeading').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('unifiedAuth.errorAccountExistsRace')).toBeInTheDocument();
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────────

  it('should have aria-live region for mode change announcements', async () => {
    mockCheckEmailSuccess(true);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'existing@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      const liveRegions = document.querySelectorAll('[aria-live="polite"]');
      expect(liveRegions.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should have role="alert" on error messages', async () => {
    mockCheckEmailError(500);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'fail@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should have aria-invalid on email input when validation fails', async () => {
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'bad');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  // ── Error States ───────────────────────────────────────────────────────

  it('should show rate limit error when checkEmail returns 429', async () => {
    mockCheckEmailError(429, 'RATE_LIMITED');
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'rate@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(screen.getByText('unifiedAuth.errorRateLimited')).toBeInTheDocument();
    });
  });

  it('should show generic error when checkEmail fails with unknown error', async () => {
    mockCheckEmailError(500);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'fail@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(screen.getByText('unifiedAuth.errorEmailCheckFailed')).toBeInTheDocument();
    });
  });

  // ── Forgot Password ────────────────────────────────────────────────────

  it('should show forgot password message when clicked in login mode', async () => {
    mockCheckEmailSuccess(true);
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByLabelText('unifiedAuth.emailLabel');
    await user.type(emailInput, 'existing@example.com');

    await user.click(screen.getByText('unifiedAuth.continueButton'));

    await waitFor(() => {
      expect(screen.getByText('unifiedAuth.forgotPassword')).toBeInTheDocument();
    });

    await user.click(screen.getByText('unifiedAuth.forgotPassword'));

    expect(screen.getByText('unifiedAuth.forgotPasswordMessage')).toBeInTheDocument();
  });

  // ── Session Expired Alert ───────────────────────────────────────────────

  it('should show session expired alert when expired=true query param', () => {
    renderPage(['/parent?expired=true']);

    expect(screen.getByText('childSession.parentSessionExpired')).toBeInTheDocument();
  });
});
