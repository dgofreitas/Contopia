// Contopia — CoverDisplay Component Tests (STORY-012)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverDisplay from '../components/shelf/CoverDisplay';

const baseProps = {
  title: 'My Little Pony',
  authorName: 'Jane Author',
  spineColor: '#4ECDC4',
  className: 'w-full h-full',
};

describe('CoverDisplay', () => {
  describe('rendering with DefaultCover fallback', () => {
    it('renders DefaultCover when coverUrl is null', () => {
      render(<CoverDisplay {...baseProps} coverUrl={null} />);
      // Should show title text from DefaultCover
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      // Should show author
      expect(screen.getByText('coverOverlay.authorBy')).toBeInTheDocument();
      // Should have role="img"
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('renders DefaultCover when coverUrl is undefined', () => {
      render(<CoverDisplay {...baseProps} coverUrl={undefined} />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('renders DefaultCover when coverUrl is empty string', () => {
      render(<CoverDisplay {...baseProps} coverUrl="" />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('renders DefaultCover when sanitizeImageUrl returns empty string', () => {
      // sanitizeImageUrl blocks javascript: URLs
      render(<CoverDisplay {...baseProps} coverUrl="javascript:alert('xss')" />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('passes className to DefaultCover', () => {
      const { container } = render(
        <CoverDisplay {...baseProps} coverUrl={null} className="custom-class" />
      );
      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('rendering with image', () => {
    it('renders img tag with sanitized URL when coverUrl is valid', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/covers/book-123.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/covers/book-123.jpg');
    });

    it('accepts https:// URLs', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://cdn.example.com/covers/secure.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/covers/secure.jpg');
    });

    it('accepts relative paths starting with /', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="/assets/covers/book-123.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/assets/covers/book-123.jpg');
    });

    it('sets alt attribute to title', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toBeInTheDocument();
    });

    it('applies correct CSS classes to img', () => {
      const { container } = render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toHaveClass('w-full', 'h-full', 'object-cover', 'rounded-lg');
    });

    it('applies className prop to wrapper', () => {
      const { container } = render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
          className="test-wrapper"
        />
      );
      const wrapper = container.querySelector('.test-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('relative', 'test-wrapper');
    });

    it('trims whitespace from URL before validation', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="  https://example.com/cover.jpg  "
        />
      );
      const img = screen.getByAltText('My Little Pony');
      // Should sanitize and still render
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });
  });

  describe('loading and error states', () => {
    it('shows skeleton while image is loading', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
        />
      );
      // Initially shows skeleton
      const skeleton = document.querySelector('.animate-pulse.bg-gray-200');
      expect(skeleton).toBeInTheDocument();
    });

    it('hides skeleton after image loads', () => {
      const { container } = render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');

      // Simulate image load by dispatching load event
      fireEvent.load(img);

      // Image should become visible (remove invisible class)
      expect(img).not.toHaveClass('invisible');
    });

    it('shows DefaultCover on image error', () => {
      const { container } = render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/bad-image.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');

      // Simulate image error by dispatching error event
      fireEvent.error(img);

      // Should show DefaultCover fallback with role="img"
      const fallbackImg = container.querySelector('[role="img"]');
      expect(fallbackImg).toBeInTheDocument();
    });

    it('renders invisible class on img while loading', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toHaveClass('invisible');
    });
  });

  describe('props handling', () => {
    it('renders without authorName', () => {
      render(<CoverDisplay {...baseProps} coverUrl={null} authorName="" />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      // Author paragraph should not be present
      const author = screen.queryByText('coverOverlay.authorBy');
      expect(author).not.toBeInTheDocument();
    });

    it('renders without className prop', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
          className={undefined}
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toBeInTheDocument();
    });

    it('renders with empty title', () => {
      render(
        <CoverDisplay
          {...baseProps}
          title=""
          coverUrl={null}
        />
      );
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('renders with null spineColor', () => {
      render(
        <CoverDisplay
          {...baseProps}
          spineColor={null}
          coverUrl={null}
        />
      );
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('sanitizeImageUrl usage', () => {
    it('blocks javascript: URLs', () => {
      render(<CoverDisplay {...baseProps} coverUrl="javascript:alert('xss')" />);
      // Should fall back to DefaultCover
      expect(screen.getByRole('img')).toBeInTheDocument();
      // No img tag with src="javascript:"
      const img = screen.queryByAltText('My Little Pony');
      expect(img).toBeNull();
    });

    it('blocks data: URLs', () => {
      render(<CoverDisplay {...baseProps} coverUrl="data:image/svg+xml,<script>alert(1)</script>" />);
      // Should fall back to DefaultCover
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('blocks http: URLs', () => {
      render(<CoverDisplay {...baseProps} coverUrl="http://insecure.com/cover.jpg" />);
      // Should fall back to DefaultCover (only https allowed)
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('uses sanitizeImageUrl for URL validation', () => {
      render(
        <CoverDisplay
          {...baseProps}
          coverUrl="https://example.com/cover.jpg"
        />
      );
      const img = screen.getByAltText('My Little Pony');
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });
  });
});
