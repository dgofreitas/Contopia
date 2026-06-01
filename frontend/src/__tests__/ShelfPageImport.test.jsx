import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShelfPage from '../app/shelf/ShelfPage';

let mockBooksData = { data: [{ _id: '1', title: 'Existing Book' }], meta: { total: 1 } };
const mockUseReducedMotion = vi.fn(() => false);
const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  m: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  useReducedMotion: () => mockUseReducedMotion(),
  AnimatePresence: ({ children }) => children,
}));

vi.mock('../hooks/useBooksQuery', () => ({
  default: vi.fn(() => ({
    data: mockBooksData,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('../hooks/useImportBook', () => ({
  default: vi.fn(() => ({
    mutate: mockMutate,
    mutateAsync: mockMutate,
    isPending: false,
    progress: 0,
    error: null,
    reset: mockReset,
  })),
}));

vi.mock('../app/shelf/BookshelfGridLayout', () => ({
  default: () => <div data-testid="bookshelf-grid">Grid</div>,
}));

vi.mock('flowbite-react', () => {
  const MockModal = ({ show, onClose, children, ...props }) =>
    show ? (
      <div data-testid="modal" role="dialog" {...props}>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null;
  MockModal.Header = () => null;
  MockModal.Body = ({ children }) => <div data-testid="modal-body">{children}</div>;
  const MockButton = ({ children, onClick, disabled, ...rest }) => {
    const domProps = Object.keys(rest).reduce((acc, key) => {
      if (!key.startsWith('__') && key !== 'color' && key !== 'ref') acc[key] = rest[key];
      return acc;
    }, {});
    return <button onClick={onClick} disabled={disabled} {...domProps}>{children}</button>;
  };
  return { Modal: MockModal, Button: MockButton };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderShelfPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/shelf']}>
        <ShelfPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ShelfPage — Import Book button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBooksData = { data: [{ _id: '1', title: 'Existing Book' }], meta: { total: 1 } };
  });

  it('renders "Import Book" button when books exist', () => {
    renderShelfPage();

    const importBtn = screen.getByRole('button', { name: 'importBookButton' });
    expect(importBtn).toBeInTheDocument();
  });

  it('does not render "Import Book" button when no books exist', () => {
    mockBooksData = { data: [], meta: { total: 0 } };

    renderShelfPage();

    expect(screen.queryByRole('button', { name: 'importBookButton' })).not.toBeInTheDocument();
  });

  it('opens ImportBookModal with format=pdf when Import button clicked', async () => {
    const user = userEvent.setup();
    renderShelfPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const importBtn = screen.getByRole('button', { name: 'importBookButton' });
    await user.click(importBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('buttonPdf')).toBeInTheDocument();
  });

  it('closes ImportBookModal when modal close is triggered', async () => {
    const user = userEvent.setup();
    renderShelfPage();

    const importBtn = screen.getByRole('button', { name: 'importBookButton' });
    await user.click(importBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('modal-close');
    await user.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});