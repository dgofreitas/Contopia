// Contopia — NextChapterButton Component Tests (STORY-034)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useReaderStore from '../stores/reader-store';
import NextChapterButton from '../components/reader/NextChapterButton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options && typeof options === 'object') {
        return key.replace(/{{\s*(\w+)\s*}}/g, (_, k) => options[k] ?? '');
      }
      return key;
    },
  }),
}));

vi.mock('react-icons/hi', () => ({
  HiArrowRight: (props) => <svg data-testid="icon-arrow-right" aria-hidden="true" {...props} />,
}));

const chapters = [
  { _id: 'c1', title: 'The Beginning', order: 0 },
  { _id: 'c2', title: 'The Middle', order: 1 },
  { _id: 'c3', title: 'The End', order: 2 },
];

describe('NextChapterButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useReaderStore.setState({ currentChapterIndex: 0 });
  });

  afterEach(() => {
    useReaderStore.setState({ currentChapterIndex: 0 });
  });

  it('renders when there is a next chapter', () => {
    render(<NextChapterButton chapters={chapters} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<NextChapterButton chapters={chapters} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with aria-label containing nextChapterBtn key', () => {
    useReaderStore.setState({ currentChapterIndex: 0 });
    render(<NextChapterButton chapters={chapters} onClick={vi.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label');
    expect(btn.getAttribute('aria-label')).toContain('nextChapterBtn');
  });

  it('renders arrow icon with aria-hidden', () => {
    render(<NextChapterButton chapters={chapters} onClick={vi.fn()} />);
    expect(screen.getByTestId('icon-arrow-right')).toHaveAttribute('aria-hidden', 'true');
  });

  it('hides when on the last chapter', () => {
    useReaderStore.setState({ currentChapterIndex: 2 });
    const { container } = render(
      <NextChapterButton chapters={chapters} onClick={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('hides when book has only 1 chapter', () => {
    const { container } = render(
      <NextChapterButton
        chapters={[{ _id: 'c1', title: 'Only Chapter', order: 0 }]}
        onClick={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('hides when chapters is null', () => {
    const { container } = render(
      <NextChapterButton chapters={null} onClick={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('hides when chapters is undefined', () => {
    const { container } = render(
      <NextChapterButton chapters={undefined} onClick={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows when on first chapter of multi-chapter book', () => {
    useReaderStore.setState({ currentChapterIndex: 0 });
    render(<NextChapterButton chapters={chapters} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows when on middle chapter and not last', () => {
    useReaderStore.setState({ currentChapterIndex: 1 });
    render(<NextChapterButton chapters={chapters} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});