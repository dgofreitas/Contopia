// Contopia — VerifyPage Component Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyPage from '../app/auth/VerifyPage';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => children,
}));

// We'll use mutable state objects that the mock functions reference.
// This allows tests to change the state before rendering.
let verifyState = {
  isPending: true,
  isSuccess: false,
  isError: false,
  error: null,
  data: null,
};

let registerState = {
  isPending: false,
  error: null,
  data: null,
};

let storeState = {
  user: null,
  token: null,
  onboardingComplete: false,
};

const mockVerifyMutate = vi.fn();
const mockRegisterMutate = vi.fn();

vi.mock('../hooks/useVerify', () => ({
  default: () => ({
    mutate: mockVerifyMutate,
    isPending: verifyState.isPending,
    isSuccess: verifyState.isSuccess,
    isError: verifyState.isError,
    error: verifyState.error,
    data: verifyState.data,
    getStatus: () => {
      if (verifyState.isPending) return 'verifying';
      if (verifyState.isSuccess) return 'success';
      if (verifyState.isError) {
        const status = verifyState.error?.response?.status;
        if (status === 410) return 'expired';
        if (status === 404) return 'invalid';
        return 'error';
      }
      return 'verifying';
    },
    getErrorMessage: () => {
      const errorStatus = verifyState.error?.response?.status;
      if (errorStatus === 410) return 'verify.expired';
      if (errorStatus === 404) return 'verify.invalid';
      return 'register.errorGeneric';
    },
  }),
}));

vi.mock('../hooks/useRegister', () => ({
  default: () => ({
    mutate: mockRegisterMutate,
    isPending: registerState.isPending,
    error: registerState.error,
    data: registerState.data,
    getErrorMessage: (err) => {
      const status = err?.response?.status;
      if (status === 409) return 'register.errorAccountExists';
      if (status === 422) return 'register.errorEmailInvalid';
      return 'register.errorGeneric';
    },
  }),
}));

vi.mock('../stores/auth-store', () => ({
  default: (selector) => selector(storeState),
}));

function renderVerifyPage(initialPath = '/verify/test-token') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/welcome" element={<div data-testid="welcome-page">Welcome</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyState = { isPending: true, isSuccess: false, isError: false, error: null, data: null };
    registerState = { isPending: false, error: null, data: null };
    storeState = { user: null, token: null, onboardingComplete: false };
  });

  it('renders verifying state initially (spinner + title)', () => {
    renderVerifyPage();

    expect(screen.getByText('verify.title')).toBeInTheDocument();
    expect(mockVerifyMutate).toHaveBeenCalledWith('test-token');
  });

  it('shows success state when verification succeeds', () => {
    verifyState = {
      isPending: false,
      isSuccess: true,
      isError: false,
      error: null,
      data: { token: 'abc', childId: '1', childFirstName: 'João' },
    };

    renderVerifyPage();

    expect(screen.getByText('verify.success')).toBeInTheDocument();
  });

  it('shows expired state when verification returns 410', () => {
    verifyState = {
      isPending: false,
      isSuccess: false,
      isError: true,
      error: { response: { status: 410 } },
      data: null,
    };

    renderVerifyPage();

    expect(screen.getByText('verify.expired')).toBeInTheDocument();
  });

  it('shows invalid state when verification returns 404', () => {
    verifyState = {
      isPending: false,
      isSuccess: false,
      isError: true,
      error: { response: { status: 404 } },
      data: null,
    };

    renderVerifyPage();

    expect(screen.getByText('verify.invalid')).toBeInTheDocument();
  });

  it('clicking resend button shows RegisterForm for re-submission', async () => {
    const user = userEvent.setup();

    // Start in expired state so the resend button is visible
    verifyState = {
      isPending: false,
      isSuccess: false,
      isError: true,
      error: { response: { status: 410 } },
      data: null,
    };

    renderVerifyPage();

    // Find and click the resend button in the VerificationStatus component
    const resendButton = screen.getByRole('button', { name: 'verify.resend' });
    await user.click(resendButton);

    // After clicking resend, the RegisterForm should appear
    expect(screen.getByLabelText('register.parentEmail')).toBeInTheDocument();
  });

  it('success state navigates to /welcome after timeout', async () => {
    vi.useFakeTimers();

    verifyState = {
      isPending: false,
      isSuccess: true,
      isError: false,
      error: null,
      data: { token: 'abc', childId: '1', childFirstName: 'João' },
    };

    renderVerifyPage();

    // Fast-forward the 2s timeout that triggers navigation
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // After navigating to /welcome, the welcome page should be visible
    expect(screen.getByTestId('welcome-page')).toBeInTheDocument();

    vi.useRealTimers();
  });
});