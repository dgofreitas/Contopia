import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockMutate = vi.fn();
const mockReset = vi.fn();

let mockImportState = {
  isPending: false,
  progress: 0,
  error: null,
};

vi.mock('../hooks/useImportBook', () => ({
  default: vi.fn(() => ({
    mutate: mockMutate,
    mutateAsync: mockMutate,
    isPending: mockImportState.isPending,
    progress: mockImportState.progress,
    error: mockImportState.error,
    reset: mockReset,
  })),
}));

let reducedMotionValue = false;
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => reducedMotionValue,
  AnimatePresence: ({ children }) => children,
}));

vi.mock('flowbite-react', () => {
  const MockModal = ({ show, onClose, children, popup, ...props }) =>
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

vi.mock('react-icons/hi', () => ({
  HiUpload: () => <span data-testid="upload-icon" />,
  HiX: () => <span data-testid="x-icon" />,
}));

import ImportBookModal from '../components/import/ImportBookModal';

describe('ImportBookModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function renderModal(props = {}) {
    return render(
      <QueryClientProvider client={queryClient}>
        <ImportBookModal isOpen={true} onClose={vi.fn()} {...props} />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockImportState = {
      isPending: false,
      progress: 0,
      error: null,
    };
    reducedMotionValue = false;
    queryClient.clear();
  });

  it('renders file picker with .txt accept filter', () => {
    renderModal();
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute('accept', '.txt,text/plain');
  });

  it('shows progress and uploading state during upload', () => {
    mockImportState.isPending = true;
    mockImportState.progress = 50;

    renderModal();

    expect(screen.getByText('uploading')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows unsupportedType error when selecting .docx file', () => {
    renderModal();
    const fileInput = document.querySelector('input[type="file"]');
    const badFile = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    Object.defineProperty(badFile, 'type', { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent('import.unsupportedType');
  });

  it('shows fileTooBig error when file exceeds 25MB', () => {
    renderModal();
    const fileInput = document.querySelector('input[type="file"]');
    const bigFile = new File(['x'], 'big.txt', { type: 'text/plain' });
    Object.defineProperty(bigFile, 'size', { value: 26 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent('import.fileTooBig');
  });

  it('shows uploadFailed error from hook', () => {
    mockImportState.error = new Error('UPLOAD_FAILED');

    renderModal();

    expect(screen.getByRole('alert')).toHaveTextContent('import.uploadFailed');
  });

  it('has accessible ARIA labels and close button works', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'import-book-title');

    const titleEl = document.getElementById('import-book-title');
    expect(titleEl).toBeInTheDocument();

    const closeButton = screen.getByTestId('modal-close');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows noFile error when import button clicked without file', () => {
    renderModal();
    const importButton = screen.getByText('buttonTxt');
    expect(importButton).toBeDisabled();
  });

  it('calls mutate with selected file on import button click', () => {
    renderModal();
    const fileInput = document.querySelector('input[type="file"]');
    const testFile = new File(['hello world'], 'story.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const importButton = screen.getByText('buttonTxt');
    expect(importButton).not.toBeDisabled();

    fireEvent.click(importButton);

    expect(mockMutate).toHaveBeenCalledWith(
      { file: testFile },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('shows success message when progress is 100 and no error', () => {
    mockImportState.progress = 100;
    mockImportState.isPending = false;
    mockImportState.error = null;

    renderModal();

    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('shows success state when progress 100 even while still pending', () => {
    mockImportState.progress = 100;
    mockImportState.isPending = true;
    mockImportState.error = null;

    renderModal();

    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('uses reduced motion progress bar when prefers-reduced-motion', () => {
    reducedMotionValue = true;
    mockImportState.isPending = true;
    mockImportState.progress = 30;

    renderModal();

    const progressbar = screen.getByRole('progressbar');
    const bar = progressbar.querySelector('div');
    expect(bar).toHaveStyle({ width: '30%' });
    expect(bar).not.toHaveAttribute('initial');
  });

  it('does not render when isOpen is false', () => {
    render(<QueryClientProvider client={queryClient}>
      <ImportBookModal isOpen={false} onClose={vi.fn()} />
    </QueryClientProvider>);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders PAYLOAD_TOO_LARGE error from hook', () => {
    mockImportState.error = new Error('PAYLOAD_TOO_LARGE');

    renderModal();

    expect(screen.getByRole('alert')).toHaveTextContent('import.fileTooBig');
  });
});