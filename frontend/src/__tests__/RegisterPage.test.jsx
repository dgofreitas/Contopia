// Contopia — RegisterPage Component Tests (STORY-057)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  LazyMotion: ({ children }) => <>{children}</>,
  domAnimation: {},
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useRegister hook
vi.mock('../hooks/useRegister', () => ({
  default: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
    data: null,
    getErrorMessage: vi.fn((err) => err?.response?.data?.error?.code || 'Generic error'),
  }),
}));

// Mock react-icons/hi (used by RegisterForm and RegisterPage)
vi.mock('react-icons/hi', () => ({
  HiCheckCircle: () => <svg data-testid="check-icon" />,
  HiLockClosed: () => <svg data-testid="lock-icon" />,
  HiMail: () => <svg data-testid="mail-icon" />,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// Mock parent-auth-store
vi.mock('../stores/parent-auth-store', () => ({
  default: (selector) => {
    const state = { parentToken: null };
    return selector ? selector(state) : state;
  },
}));

import RegisterPage from '../app/auth/RegisterPage';

describe('RegisterPage (STORY-057)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form with title and subtitle', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('register.title')).toBeInTheDocument();
    expect(screen.getByText('register.subtitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'register.submit' })).toBeInTheDocument();
  });

  it('renders RegisterForm component with email, password, ageConsent fields', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('register.email')).toBeInTheDocument();
    expect(screen.getByLabelText('register.password')).toBeInTheDocument();
    expect(screen.getByLabelText('register.ageConsentLabel')).toBeInTheDocument();
  });

  it('shows COPPA compliance notice', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/COPPA compliant/i)).toBeInTheDocument();
  });
});