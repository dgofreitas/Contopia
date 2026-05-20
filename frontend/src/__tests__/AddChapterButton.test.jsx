// Contopia — AddChapterButton Component Tests (STORY-017)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddChapterButton from '../app/editor/AddChapterButton';

// Mock i18next (handled by setup.js)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe('AddChapterButton', () => {
  it('renders with add chapter label', () => {
    render(<AddChapterButton chaptersCount={0} onAdd={vi.fn()} isCreating={false} />);
    expect(screen.getByRole('button', { name: /addChapter/i })).toBeInTheDocument();
  });

  it('calls onAdd when clicked', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddChapterButton chaptersCount={0} onAdd={onAdd} isCreating={false} />);
    await user.click(screen.getByRole('button'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('is disabled when at 50-chapter limit', () => {
    render(<AddChapterButton chaptersCount={50} onAdd={vi.fn()} isCreating={false} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when isCreating is true', () => {
    render(<AddChapterButton chaptersCount={0} onAdd={vi.fn()} isCreating={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is enabled when under limit and not creating', () => {
    render(<AddChapterButton chaptersCount={5} onAdd={vi.fn()} isCreating={false} />);
    expect(screen.getByRole('button')).toBeEnabled();
  });
});
