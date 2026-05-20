// Contopia — InlineEditTitle Component Tests (STORY-017)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineEditTitle from '../app/editor/InlineEditTitle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('InlineEditTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title as a button when not editing', () => {
    render(<InlineEditTitle title="Chapter 1" onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /chapterRename/i })).toHaveTextContent('Chapter 1');
  });

  it('switches to input on click', async () => {
    const user = userEvent.setup();
    render(<InlineEditTitle title="Chapter 1" onSave={vi.fn()} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onSave with trimmed value on Enter', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEditTitle title="Old Title" onSave={onSave} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Title{Enter}');
    expect(onSave).toHaveBeenCalledWith('New Title');
  });

  it('does not call onSave when value is unchanged', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEditTitle title="Same Title" onSave={onSave} />);
    await user.click(screen.getByRole('button'));
    await user.keyboard('{Enter}'); // submit without changing
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave on blur', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEditTitle title="Old" onSave={onSave} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Updated');
    await user.tab(); // blur
    expect(onSave).toHaveBeenCalledWith('Updated');
  });

  it('cancels and reverts on Escape', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEditTitle title="Original" onSave={onSave} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Changed');
    await user.keyboard('{Escape}');
    // Should revert to button showing original title
    expect(screen.getByRole('button')).toHaveTextContent('Original');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave with empty trimmed value', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEditTitle title="Title" onSave={onSave} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '   {Enter}'); // only whitespace
    expect(onSave).not.toHaveBeenCalled();
  });

  it('enforces maxLength on input', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEditTitle title="Short" onSave={onSave} maxLength={10} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.type(input, 'This is way too long text');
    // Value should be capped at maxLength
    expect(input).toHaveValue('ShortThis ');
  });

  it('updates displayed value when title prop changes', () => {
    const { rerender } = render(<InlineEditTitle title="First" onSave={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('First');
    rerender(<InlineEditTitle title="Second" onSave={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Second');
  });
});
