// Contopia — ToastContainer Component Tests (STORY-008)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock ErrorToast to simplify testing — just renders a div with toast data
vi.mock('../components/common/ErrorToast', () => ({
  default: ({ id, code, message, onDismiss }) => (
    <div data-testid={`error-toast-${id}`} data-code={code} data-message={message || ''}>
      {message || code}
      <button data-testid={`dismiss-${id}`} onClick={() => onDismiss(id)}>
        GOT_IT
      </button>
    </div>
  ),
}));

const mockUseErrorStore = vi.fn();

vi.mock('../stores/error-store', () => ({
  useErrorStore: (selector) => mockUseErrorStore(selector),
}));

import ToastContainer from '../components/common/ToastContainer';

describe('ToastContainer', () => {
  beforeEach(() => {
    mockUseErrorStore.mockReset();
  });

  it('renders nothing when toasts array is empty', () => {
    mockUseErrorStore.mockImplementation((selector) => {
      const state = { toasts: [], removeToast: vi.fn() };
      return selector(state);
    });

    const { container } = render(<ToastContainer />);
    // The wrapping div is always there, but no toast children
    expect(container.querySelector('[data-testid^="error-toast-"]')).toBeNull();
  });

  it('renders a single toast', () => {
    const toasts = [{ id: 't-1', code: 'VALIDATION_ERROR', message: 'Bad input', timestamp: 1 }];
    mockUseErrorStore.mockImplementation((selector) => {
      const state = { toasts, removeToast: vi.fn() };
      return selector(state);
    });

    render(<ToastContainer />);
    expect(screen.getByText('Bad input')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    const toasts = [
      { id: 't-1', code: 'ERR_A', message: 'First', timestamp: 1 },
      { id: 't-2', code: 'ERR_B', message: 'Second', timestamp: 2 },
    ];
    mockUseErrorStore.mockImplementation((selector) => {
      const state = { toasts, removeToast: vi.fn() };
      return selector(state);
    });

    render(<ToastContainer />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('passes removeToast as the onDismiss callback', () => {
    const removeToast = vi.fn();
    const toasts = [{ id: 't-1', code: 'ERR', message: 'Error', timestamp: 1 }];
    mockUseErrorStore.mockImplementation((selector) => {
      const state = { toasts, removeToast };
      return selector(state);
    });

    render(<ToastContainer />);
    screen.getByTestId('dismiss-t-1').click();
    expect(removeToast).toHaveBeenCalledWith('t-1');
  });

  it('renders container with aria-live="assertive"', () => {
    mockUseErrorStore.mockImplementation((selector) => {
      const state = { toasts: [], removeToast: vi.fn() };
      return selector(state);
    });

    const { container } = render(<ToastContainer />);
    const outerDiv = container.firstChild;
    expect(outerDiv).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders toasts with correct code attribute', () => {
    const toasts = [
      { id: 't-1', code: 'NOT_FOUND', message: 'Missing', timestamp: 1 },
    ];
    mockUseErrorStore.mockImplementation((selector) => {
      const state = { toasts, removeToast: vi.fn() };
      return selector(state);
    });

    render(<ToastContainer />);
    const toastEl = screen.getByTestId('error-toast-t-1');
    expect(toastEl).toHaveAttribute('data-code', 'NOT_FOUND');
  });

  it('renders correct number of toast elements matching toasts count', () => {
    const toasts = [
      { id: 't-1', code: 'A', message: 'M1', timestamp: 1 },
      { id: 't-2', code: 'B', message: 'M2', timestamp: 2 },
      { id: 't-3', code: 'C', message: 'M3', timestamp: 3 },
    ];
    mockUseErrorStore.mockImplementation((selector) => {
      const state = { toasts, removeToast: vi.fn() };
      return selector(state);
    });

    render(<ToastContainer />);
    const rendered = screen.getAllByText(/^M[123]$/);
    expect(rendered).toHaveLength(3);
  });
});
