// Contopia — ReorderButtons Component Tests (STORY-017)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReorderButtons from '../app/editor/ReorderButtons';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('ReorderButtons', () => {
  it('renders both up and down buttons', () => {
    render(
      <ReorderButtons
        canMoveUp={true}
        canMoveDown={true}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );
    expect(screen.getByLabelText('chapterMoveUp')).toBeInTheDocument();
    expect(screen.getByLabelText('chapterMoveDown')).toBeInTheDocument();
  });

  it('disables up button when canMoveUp is false', () => {
    render(
      <ReorderButtons
        canMoveUp={false}
        canMoveDown={true}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );
    expect(screen.getByLabelText('chapterMoveUp')).toBeDisabled();
    expect(screen.getByLabelText('chapterMoveDown')).toBeEnabled();
  });

  it('disables down button when canMoveDown is false', () => {
    render(
      <ReorderButtons
        canMoveUp={true}
        canMoveDown={false}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );
    expect(screen.getByLabelText('chapterMoveUp')).toBeEnabled();
    expect(screen.getByLabelText('chapterMoveDown')).toBeDisabled();
  });

  it('disables both buttons when both are false', () => {
    render(
      <ReorderButtons
        canMoveUp={false}
        canMoveDown={false}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );
    expect(screen.getByLabelText('chapterMoveUp')).toBeDisabled();
    expect(screen.getByLabelText('chapterMoveDown')).toBeDisabled();
  });

  it('calls onMoveUp when up button clicked', async () => {
    const onMoveUp = vi.fn();
    const user = userEvent.setup();
    render(
      <ReorderButtons
        canMoveUp={true}
        canMoveDown={true}
        onMoveUp={onMoveUp}
        onMoveDown={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('chapterMoveUp'));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
  });

  it('calls onMoveDown when down button clicked', async () => {
    const onMoveDown = vi.fn();
    const user = userEvent.setup();
    render(
      <ReorderButtons
        canMoveUp={true}
        canMoveDown={true}
        onMoveUp={vi.fn()}
        onMoveDown={onMoveDown}
      />
    );
    await user.click(screen.getByLabelText('chapterMoveDown'));
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it('does not call onMoveUp when disabled', async () => {
    const onMoveUp = vi.fn();
    const user = userEvent.setup();
    render(
      <ReorderButtons
        canMoveUp={false}
        canMoveDown={true}
        onMoveUp={onMoveUp}
        onMoveDown={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('chapterMoveUp'));
    expect(onMoveUp).not.toHaveBeenCalled();
  });
});
