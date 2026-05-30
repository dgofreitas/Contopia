// Contopia — ChapterDrawer Component Tests (STORY-034)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useReaderStore from '../stores/reader-store';
import ChapterDrawer from '../components/reader/ChapterDrawer';

const mockUseReducedMotion = vi.fn();
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
  motion: {
    div: ({ children, onClick, ...rest }) => (
      <div onClick={onClick} {...rest}>{children}</div>
    ),
    nav: ({ children, onClick, ...rest }) => (
      <nav onClick={onClick} {...rest}>{children}</nav>
    ),
  },
  m: {
    div: ({ children, onClick, ...rest }) => (
      <div onClick={onClick} {...rest}>{children}</div>
    ),
    nav: ({ children, onClick, ...rest }) => (
      <nav onClick={onClick} {...rest}>{children}</nav>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

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
  HiCheckCircle: (props) => <svg data-testid="icon-check" {...props} />,
  HiMinusCircle: (props) => <svg data-testid="icon-minus" {...props} />,
  HiCircle: (props) => <svg data-testid="icon-circle" {...props} />,
}));

const chapters = [
  { _id: 'c1', title: 'The Beginning', order: 0 },
  { _id: 'c2', title: 'The Middle', order: 1 },
  { _id: 'c3', title: 'The End', order: 2 },
];

describe('ChapterDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(true);
    useReaderStore.setState({
      currentChapterIndex: 0,
      isChapterDrawerOpen: true,
    });
  });

  afterEach(() => {
    useReaderStore.setState({
      currentChapterIndex: 0,
      isChapterDrawerOpen: false,
    });
  });

  describe('rendering', () => {
    it('renders chapters when drawer is open', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      expect(screen.getByText('The Beginning')).toBeInTheDocument();
      expect(screen.getByText('The Middle')).toBeInTheDocument();
      expect(screen.getByText('The End')).toBeInTheDocument();
    });

    it('renders chapter list heading', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      expect(screen.getByText('chapterList')).toBeInTheDocument();
    });

    it('does not render when drawer is closed', () => {
      useReaderStore.setState({ isChapterDrawerOpen: false });
      const { container } = render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      expect(container.innerHTML).toBe('');
    });

    it('does not render when chapters has only 1 chapter', () => {
      const { container } = render(
        <ChapterDrawer
          chapters={[{ _id: 'c1', title: 'Only Chapter', order: 0 }]}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      expect(container.innerHTML).toBe('');
    });

    it('renders close button', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      expect(screen.getByLabelText('close')).toBeInTheDocument();
    });
  });

  describe('read status derivation', () => {
    it('all chapters are unread when progress is null', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      options.forEach((opt) => {
        expect(opt).toHaveAttribute('aria-label');
        expect(opt.getAttribute('aria-label')).toContain('chapterUnread');
      });
    });

    it('chapters before lastChapterId are read, last is in-progress', () => {
      const progress = { lastChapterId: 'c2', percentage: 50 };
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={progress}
          onChapterSelect={vi.fn()}
        />
      );
      const options = screen.getAllByRole('option');
      expect(options[0].getAttribute('aria-label')).toContain('chapterRead');
      expect(options[1].getAttribute('aria-label')).toContain('chapterInProgress');
      expect(options[2].getAttribute('aria-label')).toContain('chapterUnread');
    });

    it('chapter with lastChapterId is read when percentage=100', () => {
      const progress = { lastChapterId: 'c2', percentage: 100 };
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={progress}
          onChapterSelect={vi.fn()}
        />
      );
      const options = screen.getAllByRole('option');
      expect(options[0].getAttribute('aria-label')).toContain('chapterRead');
      expect(options[1].getAttribute('aria-label')).toContain('chapterRead');
      expect(options[2].getAttribute('aria-label')).toContain('chapterUnread');
    });

    it('last chapter at 95% is read (threshold for final chapter)', () => {
      const progress = { lastChapterId: 'c3', percentage: 95 };
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={progress}
          onChapterSelect={vi.fn()}
        />
      );
      const options = screen.getAllByRole('option');
      expect(options[0].getAttribute('aria-label')).toContain('chapterRead');
      expect(options[1].getAttribute('aria-label')).toContain('chapterRead');
      expect(options[2].getAttribute('aria-label')).toContain('chapterRead');
    });

    it('last chapter at 94% is in-progress (below threshold)', () => {
      const progress = { lastChapterId: 'c3', percentage: 94 };
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={progress}
          onChapterSelect={vi.fn()}
        />
      );
      const options = screen.getAllByRole('option');
      expect(options[2].getAttribute('aria-label')).toContain('chapterInProgress');
    });
  });

  describe('click navigation', () => {
    it('calls onChapterSelect and closes drawer on chapter click', async () => {
      const onChapterSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={onChapterSelect}
        />
      );
      await user.click(screen.getByText('The Middle'));
      expect(onChapterSelect).toHaveBeenCalledWith(chapters[1]);
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    it('Escape key closes the drawer', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
    });

    it('other keys do not close the drawer', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(true);
    });
  });

  describe('backdrop close', () => {
    it('clicking backdrop closes the drawer', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop);
      expect(useReaderStore.getState().isChapterDrawerOpen).toBe(false);
    });
  });

  describe('a11y', () => {
    it('has role="dialog"', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-label on dialog', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'chapterList');
    });

    it('has role="listbox" for chapter list', () => {
      render(
        <ChapterDrawer
          chapters={chapters}
          progress={null}
          onChapterSelect={vi.fn()}
        />
      );
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});