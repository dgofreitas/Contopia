// Contopia — CoverDisplay Component Tests (STORY-012 + STORY-028)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverDisplay from '../components/shelf/CoverDisplay';

const baseProps = {
  title: 'My Little Pony',
  authorName: 'Jane Author',
  spineColor: '#4ECDC4',
  className: 'w-full h-full',
};

const baseBook = {
  _id: 'book-123',
  title: 'My Little Pony',
  authorName: 'Jane Author',
};

describe('CoverDisplay (STORY-028)', () => {
  describe('rendering with DefaultCover fallback', () => {
    it('renders DefaultCover when coverUrl is null', () => {
      render(<CoverDisplay {...baseProps} coverUrl={null} />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      expect(screen.getByText('coverOverlay.authorBy')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders DefaultCover when coverUrl is undefined', () => {
      render(<CoverDisplay {...baseProps} coverUrl={undefined} />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
    });

    it('renders DefaultCover when coverUrl is empty string', () => {
      render(<CoverDisplay {...baseProps} coverUrl="" />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
    });

    it('renders DefaultCover when book.has_custom_cover is false', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
          book={{ ...baseBook, has_custom_cover: false }}
        />
      );
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders DefaultCover for sanitize-blocked URLs', () => {
      render(<CoverDisplay {...baseProps} coverUrl="javascript:alert(1)" />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('passes className to DefaultCover', () => {
      const { container } = render(
        <CoverDisplay {...baseProps} coverUrl={null} className="custom-class" />
      );
      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('rendering with custom cover image', () => {
    it('renders img tag when book.has_custom_cover is true', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
          book={{ ...baseBook, has_custom_cover: true, coverUrl: 'https://example.com/cover.jpg' }}
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toBeInTheDocument();
    });

    it('uses book.coverUrl when available', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl={null}
          book={{ ...baseBook, has_custom_cover: true, coverUrl: 'https://example.com/book-cover.jpg' }}
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toHaveAttribute('src', 'https://example.com/book-cover.jpg');
    });

    it('renders skeleton while image loads', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
          book={{ ...baseBook, has_custom_cover: true, coverUrl: 'https://example.com/cover.jpg' }}
        />
      );
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('hides skeleton after image loads', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
          book={{ ...baseBook, has_custom_cover: true, coverUrl: 'https://example.com/cover.jpg' }}
        />
      );
      const img = screen.getByAltText('My Little Pony');
      fireEvent.load(img);
      expect(img).not.toHaveClass('invisible');
    });

    it('shows DefaultCover on image error', () => {
      const { container } = render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/bad.jpg"
          book={{ ...baseBook, has_custom_cover: true, coverUrl: 'https://example.com/bad.jpg' }}
        />
      );
      const img = screen.getByAltText('My Little Pony');
      fireEvent.error(img);
      // DefaultCover fallback should appear
      const fallbackImg = container.querySelector('[role="img"]');
      expect(fallbackImg).toBeInTheDocument();
    });
  });

  describe('templateId support', () => {
    it('renders DefaultCover when book has templateId but no custom cover', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl={null}
          book={{ ...baseBook, templateId: 'nature' }}
        />
      );
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders DefaultCover when book has templateId and custom cover (prefers cover)', () => {
      const book = { ...baseBook, has_custom_cover: true, coverUrl: 'https://example.com/cover.jpg', templateId: 'nature' };
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
          book={book}
        />
      );
      // With has_custom_cover true, should render img
      const img = screen.getByAltText('My Little Pony');
      expect(img).toBeInTheDocument();
    });
  });

  describe('props handling', () => {
    it('renders without authorName', () => {
      render(<CoverDisplay {...baseProps} coverUrl={null} authorName="" />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      const author = screen.queryByText('coverOverlay.authorBy');
      expect(author).not.toBeInTheDocument();
    });

    it('renders without className prop', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
          book={{ ...baseBook, has_custom_cover: true, coverUrl: 'https://example.com/cover.jpg' }}
          className={undefined}
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toBeInTheDocument();
    });

    it('renders with empty title', () => {
      render(<CoverDisplay {...baseProps} title="" coverUrl={null} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
});
