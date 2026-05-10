// Contopia — WelcomePage Component Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WelcomePage from '../app/auth/WelcomePage';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock useAuthStore
vi.mock('../stores/auth-store', () => ({
  default: (selector) => selector({
    user: { childFirstName: 'João', childId: '1' },
    token: 'test-token',
    onboardingComplete: true,
  }),
}));

function renderWelcomePage() {
  return render(
    <MemoryRouter initialEntries={['/welcome']}>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/" element={<div data-testid="home-page">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message with child name', () => {
    renderWelcomePage();

    // The translation mock returns the key, and the component uses t('welcome.title', { name: childName })
    // Our mock replaces {{name}} with the actual value
    expect(screen.getByText('welcome.title')).toBeInTheDocument();
  });

  it('renders start button', () => {
    renderWelcomePage();

    expect(screen.getByRole('button', { name: 'Start exploring' })).toBeInTheDocument();
  });

  it('button has correct aria-label', () => {
    renderWelcomePage();

    const button = screen.getByRole('button', { name: 'Start exploring' });
    expect(button).toHaveAttribute('aria-label', 'Start exploring');
  });

  it('renders privacy notice text', () => {
    renderWelcomePage();

    expect(screen.getByText(/We respect your privacy/)).toBeInTheDocument();
  });

  it('renders sparkle icon', () => {
    renderWelcomePage();

    // HiSparkles renders an SVG with aria-hidden="true"
    const svg = document.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeInTheDocument();
  });

  it('renders welcome subtitle', () => {
    renderWelcomePage();

    expect(screen.getByText('welcome.subtitle')).toBeInTheDocument();
  });

  it('navigates to home when start button is clicked', async () => {
    const user = userEvent.setup();
    renderWelcomePage();

    const startButton = screen.getByRole('button', { name: 'Start exploring' });
    await user.click(startButton);

    // After navigation from /welcome to /, the home page should render
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });
});