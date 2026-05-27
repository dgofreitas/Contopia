// Contopia — ChapterDrawerItem Component Tests (STORY-034)
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterDrawerItem from '../components/reader/ChapterDrawerItem';

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
  HiCheckCircle: (props) => <svg data-testid="icon-check" aria-hidden="true" {...props} />,
  HiMinusCircle: (props) => <svg data-testid="icon-minus" aria-hidden="true" {...props} />,
  HiCircle: (props) => <svg data-testid="icon-circle" aria-hidden="true" {...props} />,
}));

const chapter = { _id: 'c1', title: 'The Beginning', order: 0 };

describe('ChapterDrawerItem', () => {
  describe('a11y', () => {
    it('has role="option"', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    it('has aria-selected=true when current', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={true}
          onClick={vi.fn()}
        />
      );
      expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
    });

    it('has aria-selected=false when not current', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'false');
    });

    it('has aria-label with title and status for unread', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      const option = screen.getByRole('option');
      expect(option.getAttribute('aria-label')).toContain('The Beginning');
      expect(option.getAttribute('aria-label')).toContain('chapterUnread');
    });

    it('has aria-label with title and status for read', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="read"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      const option = screen.getByRole('option');
      expect(option.getAttribute('aria-label')).toContain('chapterRead');
    });

    it('has aria-label with title and status for in-progress', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="in-progress"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      const option = screen.getByRole('option');
      expect(option.getAttribute('aria-label')).toContain('chapterInProgress');
    });

    it('has tabIndex=0 for keyboard focus', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      expect(screen.getByRole('option')).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('status icons', () => {
    it('renders HiCheckCircle icon for read status', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="read"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      expect(screen.getByTestId('icon-check')).toBeInTheDocument();
    });

    it('renders HiMinusCircle icon for in-progress status', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="in-progress"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      expect(screen.getByTestId('icon-minus')).toBeInTheDocument();
    });

    it('renders HiCircle icon for unread status', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      expect(screen.getByTestId('icon-circle')).toBeInTheDocument();
    });

    it('renders HiCircle as fallback for unknown status', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unknown"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      expect(screen.getByTestId('icon-circle')).toBeInTheDocument();
    });

    it('icons have aria-hidden="true"', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="read"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      const icon = screen.getByTestId('icon-check');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('focus and interaction', () => {
    it('calls onClick with chapter when clicked', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={onClick}
        />
      );
      await user.click(screen.getByRole('option'));
      expect(onClick).toHaveBeenCalledWith(chapter);
    });

    it('calls onClick with Enter key', () => {
      const onClick = vi.fn();
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={onClick}
        />
      );
      fireEvent.keyDown(screen.getByRole('option'), { key: 'Enter' });
      expect(onClick).toHaveBeenCalledWith(chapter);
    });

    it('calls onClick with Space key', () => {
      const onClick = vi.fn();
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={onClick}
        />
      );
      fireEvent.keyDown(screen.getByRole('option'), { key: ' ' });
      expect(onClick).toHaveBeenCalledWith(chapter);
    });

    it('does not call onClick on other keys', () => {
      const onClick = vi.fn();
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={onClick}
        />
      );
      fireEvent.keyDown(screen.getByRole('option'), { key: 'Tab' });
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('current chapter styling', () => {
    it('has amber highlight class when current', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={true}
          onClick={vi.fn()}
        />
      );
      const option = screen.getByRole('option');
      expect(option.className).toContain('bg-amber-100');
    });

    it('does not have amber highlight when not current', () => {
      render(
        <ChapterDrawerItem
          chapter={chapter}
          status="unread"
          isCurrent={false}
          onClick={vi.fn()}
        />
      );
      const option = screen.getByRole('option');
      expect(option.className).not.toContain('bg-amber-100');
    });
  });
});