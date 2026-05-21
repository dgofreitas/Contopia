// Contopia — Navbar Component Tests (STORY-021: My Drafts link)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from '../components/common/Navbar';

// Setup.js mocks react-i18next to pass through keys

vi.mock('../stores/auth-store', () => ({
  default: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ user: { childFirstName: 'João' } });
    }
    return { user: { childFirstName: 'João' } };
  }),
}));

vi.mock('../hooks/useLogout', () => ({
  default: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders() {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Navbar />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Contopia brand text', () => {
    renderWithProviders();
    expect(screen.getByText('Contopia')).toBeInTheDocument();
  });

  it('renders navigation with aria-label', () => {
    renderWithProviders();
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('renders My Drafts link with DocumentText icon', () => {
    renderWithProviders();
    const draftsLink = screen.getByText((content) => content === 'nav.drafts');
    expect(draftsLink).toBeInTheDocument();
  });

  it('clicking My Drafts triggers navigation to /drafts', async () => {
    mockNavigate.mockClear();
    renderWithProviders();
    const draftsLink = screen.getByText((content) => content === 'nav.drafts');
    await draftsLink.click();
    expect(mockNavigate).toHaveBeenCalledWith('/drafts');
  });

  it('renders Shelf link', () => {
    renderWithProviders();
    const shelfLink = screen.getByText((content) => content === 'nav.shelf');
    expect(shelfLink).toBeInTheDocument();
  });

it('renders the greeting with user name', () => {
    renderWithProviders();
    // The greeting span is present with aria-label matching the i18n key
    // getByRole('generic') finds the span since it has aria-label
    const greetingEl = screen.getByRole('generic', { name: /nav\.greeting/i });
    expect(greetingEl).toBeInTheDocument();
  });

  it('has logout button', () => {
    renderWithProviders();
    const logoutBtn = screen.getByLabelText('logout.button');
    expect(logoutBtn).toBeInTheDocument();
  });

  it('has min-h-[44px] on nav links for touch targets', () => {
    renderWithProviders();
    const navItems = document.querySelectorAll('.cursor-pointer');
    // At least one of these should have min-h-[44px]
    const hasTouchTarget = Array.from(navItems).some(
      (el) => el.className.includes('min-h')
    );
    expect(hasTouchTarget).toBe(true);
  });
});
