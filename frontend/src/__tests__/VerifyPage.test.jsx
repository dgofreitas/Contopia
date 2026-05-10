// Contopia — VerifyPage Component Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const mockVerifyMutate = vi.fn();
const mockRegisterMutate = vi.fn();

// Factory function that creates fresh state per mock invocation
function createVerifyHookMock(initialState) {
  const state = { ...initialState };
  return {
    hook: () => ({
      mutate: mockVerifyMutate,
      isPending: state.isPending,
      isSuccess: state.isSuccess,
      isError: state.isError,
      error: state.error,
      data: state.data,
      getStatus: () => {
        if (state.isPending) return 'verifying';
        if (state.isSuccess) return 'success';
        if (state.isError) {
          const status = state.error?.response?.status;
          if (status === 410) return 'expired';
          if (status === 404) return 'invalid';
          return 'error';
        }
        return 'verifying';
      },
      getErrorMessage: () => {
        const errorStatus = state.error?.response?.status;
        if (errorStatus === 410) return 'verify.expired';
        if (errorStatus === 404) return 'verify.invalid';
        return 'register.errorGeneric';
      },
    }),
    state,
  };
}

function createRegisterHookMock(initialState) {
  const state = { ...initialState };
  return {
    hook: () => ({
      mutate: mockRegisterMutate,
      isPending: state.isPending,
      error: state.error,
      data: state.data,
      getErrorMessage: (err) => {
        const status = err?.response?.status;
        if (status === 409) return 'register.errorAccountExists';
        if (status === 422) return 'register.errorEmailInvalid';
        return 'register.errorGeneric';
      },
    }),
    state,
  };
}

function createStoreMock(initialState) {
  const state = { ...initialState };
  return {
    selector: (selector) => selector(state),
    state,
  };
}

let verifyMock, registerMock, storeMock;

vi.mock('../hooks/useVerify', () => ({
  default: () => verifyMock.hook(),
}));

vi.mock('../hooks/useRegister', () => ({
  default: () => registerMock.hook(),
}));

vi.mock('../stores/auth-store', () => ({
  default: (selector) => storeMock.selector(selector),
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
    verifyMock = createVerifyHookMock({
      isPending: true, isSuccess: false, isError: false, error: null, data: null,
    });
    registerMock = createRegisterHookMock({
      isPending: false, error: null, data: null,
    });
    storeMock = createStoreMock({
      user: null, token: null, onboardingComplete: false,
    });
  });

  it('renders verifying state initially (spinner + title)', () => {
    renderVerifyPage();

    expect(screen.getByText('verify.title')).toBeInTheDocument();
    expect(mockVerifyMutate).toHaveBeenCalledWith('test-token');
  });

  it('shows success state when verification succeeds', () => {
    verifyMock.state.isPending = false;
    verifyMock.state.isSuccess = true;
    verifyMock.state.data = { childId: '1' };

    renderVerifyPage();

    expect(screen.getByText('verify.success')).toBeInTheDocument();
  });

  it('shows expired state when verification returns 410', () => {
    verifyMock.state.isPending = false;
    verifyMock.state.isError = true;
    verifyMock.state.error = { response: { status: 410 } };

    renderVerifyPage();

    expect(screen.getByText('verify.expired')).toBeInTheDocument();
  });

  it('shows invalid state when verification returns 404', () => {
    verifyMock.state.isPending = false;
    verifyMock.state.isError = true;
    verifyMock.state.error = { response: { status: 404 } };

    renderVerifyPage();

    expect(screen.getByText('verify.invalid')).toBeInTheDocument();
  });

  it('clicking resend button shows RegisterForm for re-submission', async () => {
    const user = userEvent.setup();

    // Start in expired state so the resend button is visible
    verifyMock.state.isPending = false;
    verifyMock.state.isError = true;
    verifyMock.state.error = { response: { status: 410 } };

    renderVerifyPage();

    // Find and click the resend button in the VerificationStatus component
    const resendButton = screen.getByRole('button', { name: 'verify.resend' });
    await user.click(resendButton);

    // After clicking resend, the RegisterForm should appear
    expect(screen.getByLabelText('register.parentEmail')).toBeInTheDocument();
  });

  it('success state navigates to /welcome after timeout', async () => {
    vi.useFakeTimers();

    verifyMock.state.isPending = false;
    verifyMock.state.isSuccess = true;
    verifyMock.state.data = { childId: '1' };

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