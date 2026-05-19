// Contopia — App Route Tests (STORY-016)
// Covers: App.jsx (NewBookPage route), ShelfPage.jsx (New Book button)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock all route components that are not part of this story
vi.mock('../app/auth/RegisterPage', () => ({ default: () => <div data-testid="register-page">Register</div> }));
vi.mock('../app/auth/VerifyPage', () => ({ default: () => <div data-testid="verify-page">Verify</div> }));
vi.mock('../app/auth/WelcomePage', () => ({ default: () => <div data-testid="welcome-page">Welcome</div> }));
vi.mock('../app/auth/LoginPage', () => ({ default: () => <div data-testid="login-page">Login</div> }));
vi.mock('../app/editor/EditorPage', () => ({ default: () => <div data-testid="editor-page">Editor</div> }));
vi.mock('../app/reader/ReaderPage', () => ({ default: () => <div data-testid="reader-page">Reader</div> }));
vi.mock('../app/settings/SettingsPage', () => ({ default: () => <div data-testid="settings-page">Settings</div> }));

// Mock the target pages
vi.mock('../app/editor/NewBookPage', () => ({
  default: () => <div data-testid="new-book-page">New Book Page</div>,
}));

vi.mock('../app/shelf/ShelfPage', () => ({
  default: () => <div data-testid="shelf-page">Shelf Page</div>,
}));

// Mock components used by App
vi.mock('../components/common/ProtectedRoute', () => ({
  default: ({ children }) => <div data-testid="protected-route">{children}</div>,
}));
vi.mock('../components/common/Navbar', () => ({
  default: () => <nav data-testid="navbar">Nav</nav>,
}));
vi.mock('../components/auth/SessionTimeoutModal', () => ({
  default: () => null,
}));
vi.mock('../components/common/OfflineBanner', () => ({
  default: () => null,
}));
vi.mock('../components/common/ToastContainer', () => ({
  default: () => null,
}));

vi.mock('../stores/auth-store', () => ({
  default: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ token: 'mock-token' });
    }
    return 'mock-token';
  }),
}));

// Mock error-store — zustand stores have .getState on the hook
vi.mock('../stores/error-store', () => {
  const mockState = { toasts: [], isOffline: false, setOffline: vi.fn() };
  const hook = Object.assign(
    vi.fn((selector) => {
      if (typeof selector === 'function') return selector(mockState);
      return mockState;
    }),
    { getState: vi.fn(() => mockState) },
  );
  return { useErrorStore: hook };
});

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }) => children,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderApp(initialRoute = '/shelf') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App Routes — NewBookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders NewBookPage at /editor/new route', () => {
    renderApp('/editor/new');

    expect(screen.getByTestId('new-book-page')).toBeInTheDocument();
  });

  it('renders ShelfPage at /shelf route', () => {
    renderApp('/shelf');

    expect(screen.getByTestId('shelf-page')).toBeInTheDocument();
  });
});
