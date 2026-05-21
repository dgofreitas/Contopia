// Contopia — PublishConfirmDialog Component Tests (STORY-020)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock flowbite-react Modal and Button (JSX works in vi.mock with Vite plugin)
vi.mock('flowbite-react', () => {
  const MockModal = ({ show, onClose, children, ...props }) =>
    show ? (
      <div data-testid="modal" role="dialog" aria-labelledby="publish-confirm-title" {...props}>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null;
  MockModal.Header = () => null;
  MockModal.Body = ({ children }) => <div data-testid="modal-body">{children}</div>;
  const MockButton = ({ children, onClick, disabled, ...rest }) => {
    // Remove non-DOM props that flowbite may pass
    const domProps = Object.keys(rest).reduce((acc, key) => {
      if (!key.startsWith('__') && key !== 'color' && key !== 'ref') acc[key] = rest[key];
      return acc;
    }, {});
    return <button onClick={onClick} disabled={disabled} {...domProps}>{children}</button>;
  };
  return { Modal: MockModal, Button: MockButton };
});

// Mock react-icons
vi.mock('react-icons/hi', () => ({
  HiSparkles: () => <span data-testid="sparkles-icon" />,
  HiX: () => <span data-testid="x-icon" />,
}));

// setup.js already mocks react-i18next globally

import PublishConfirmDialog from '../components/editor/PublishConfirmDialog';

describe('PublishConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isPublishing: false,
    bookTitle: 'My Story',
    errorCode: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when isOpen is true', () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('publishConfirmTitle')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<PublishConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup();
    render(<PublishConfirmDialog {...defaultProps} />);
    await user.click(screen.getByText('publishConfirmButton'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    render(<PublishConfirmDialog {...defaultProps} />);
    await user.click(screen.getByText('publishCancelButton'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables action buttons while publishing', () => {
    render(<PublishConfirmDialog {...defaultProps} isPublishing={true} />);
    // Should show publishing label, not publishConfirmButton
    expect(screen.getByText('publishing')).toBeInTheDocument();
    // Confirm and cancel buttons should be disabled
    expect(screen.getByText('publishing').closest('button')).toBeDisabled();
    expect(screen.getByText('publishCancelButton').closest('button')).toBeDisabled();
  });

  it('shows publishing label when isPublishing is true', () => {
    render(<PublishConfirmDialog {...defaultProps} isPublishing={true} />);
    expect(screen.getByText('publishing')).toBeInTheDocument();
    expect(screen.queryByText('publishConfirmButton')).not.toBeInTheDocument();
  });

  it('shows empty content error message when errorCode is EMPTY_CONTENT', () => {
    render(<PublishConfirmDialog {...defaultProps} errorCode="EMPTY_CONTENT" />);
    expect(screen.getByText('publishEmptyContent')).toBeInTheDocument();
  });

  it('shows generic publish error for other error codes', () => {
    render(<PublishConfirmDialog {...defaultProps} errorCode="SERVER_ERROR" />);
    expect(screen.getByText('publishError')).toBeInTheDocument();
  });

  it('does not show error messages when errorCode is null', () => {
    render(<PublishConfirmDialog {...defaultProps} errorCode={null} />);
    expect(screen.queryByText('publishEmptyContent')).not.toBeInTheDocument();
    expect(screen.queryByText('publishError')).not.toBeInTheDocument();
  });

  it('shows book title in confirm message', () => {
    render(<PublishConfirmDialog {...defaultProps} bookTitle="Alice in Wonderland" />);
    expect(screen.getByText('publishConfirmMessage')).toBeInTheDocument();
  });

  it('focuses cancel button when dialog opens', () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    // The cancel button gets initial focus via ref
    expect(screen.getByText('publishCancelButton')).toBeInTheDocument();
  });

  it('calls onCancel when Escape is pressed', () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not respond to other key presses', () => {
    render(<PublishConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });
});
