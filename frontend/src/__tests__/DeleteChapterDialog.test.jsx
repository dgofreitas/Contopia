// Contopia — DeleteChapterDialog Component Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteChapterDialog from '../app/editor/DeleteChapterDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('flowbite-react', () => {
  const MockModal = ({ show, onClose, children, ...props }) =>
    show ? (
      <div role="dialog" data-testid="modal" {...props}>
        {children}
        <button onClick={onClose}>close</button>
      </div>
    ) : null;
  MockModal.Header = () => null;
  MockModal.Body = ({ children }) => <div data-testid="modal-body">{children}</div>;
  return {
    Modal: MockModal,
    Button: ({ onClick, children, color, ...props }) => (
      <button onClick={onClick} data-color={color} {...props}>
        {children}
      </button>
    ),
  };
});

describe('DeleteChapterDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(
      <DeleteChapterDialog
        isOpen={true}
        chapterTitle="Chapter 1"
        isLastChapter={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <DeleteChapterDialog
        isOpen={false}
        chapterTitle="Chapter 1"
        isLastChapter={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('shows last chapter warning text when isLastChapter is true', () => {
    render(
      <DeleteChapterDialog
        isOpen={true}
        chapterTitle="Only Chapter"
        isLastChapter={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onCreateReplacement={vi.fn()}
      />
    );
    expect(screen.getByText('chapterDeleteLastWarning')).toBeInTheDocument();
    expect(screen.queryByText('chapterDeleteConfirm')).not.toBeInTheDocument();
  });

  it('shows confirm text with title when not last chapter', () => {
    render(
      <DeleteChapterDialog
        isOpen={true}
        chapterTitle="Chapter 1"
        isLastChapter={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('chapterDeleteConfirm')).toBeInTheDocument();
  });

  it('shows create replacement button when last chapter and handler provided', () => {
    render(
      <DeleteChapterDialog
        isOpen={true}
        chapterTitle="Last"
        isLastChapter={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onCreateReplacement={vi.fn()}
      />
    );
    expect(screen.getByText('addChapter')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteChapterDialog
        isOpen={true}
        chapterTitle="Chapter 1"
        isLastChapter={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    // Confirm button has data-color="failure"
    const confirmBtn = screen.getByRole('button', { name: 'chapterDelete' });
    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteChapterDialog
        isOpen={true}
        chapterTitle="Chapter 1"
        isLastChapter={false}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByText('createBook.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateReplacement when replacement button clicked', async () => {
    const onCreateReplacement = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteChapterDialog
        isOpen={true}
        chapterTitle="Last"
        isLastChapter={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onCreateReplacement={onCreateReplacement}
      />
    );
    await user.click(screen.getByText('addChapter'));
    expect(onCreateReplacement).toHaveBeenCalledTimes(1);
  });
});
