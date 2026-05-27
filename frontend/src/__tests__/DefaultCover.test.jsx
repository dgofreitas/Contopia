// Contopia — DefaultCover Component Tests (STORY-012 + STORY-028)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DefaultCover from '../components/shelf/DefaultCover';
import { DEFAULT_COVER_PALETTE } from '../lib/default-cover-palette';

const baseProps = {
  title: 'My Little Pony',
  authorName: 'Jane Author',
  spineColor: '#4ECDC4',
  className: 'w-full h-full',
};

describe('DefaultCover (STORY-028 rewrite)', () => {
  describe('rendering', () => {
    it('renders title text', () => {
      render(<DefaultCover {...baseProps} />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
    });

    it('renders author name with interpolation (coverOverlay.authorBy)', () => {
      render(<DefaultCover {...baseProps} />);
      expect(screen.getByText('coverOverlay.authorBy')).toBeInTheDocument();
    });

    it('does not render author when authorName is empty', () => {
      render(<DefaultCover {...baseProps} authorName="" />);
      const author = screen.queryByText('coverOverlay.authorBy');
      expect(author).not.toBeInTheDocument();
    });

    it('does not render author when authorName is null', () => {
      render(<DefaultCover {...baseProps} authorName={null} />);
      const author = screen.queryByText('coverOverlay.authorBy');
      expect(author).not.toBeInTheDocument();
    });

    it('does not render author when authorName is undefined', () => {
      render(<DefaultCover {...baseProps} authorName={undefined} />);
      const author = screen.queryByText('coverOverlay.authorBy');
      expect(author).not.toBeInTheDocument();
    });

    it('has role="img"', () => {
      render(<DefaultCover {...baseProps} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('has aria-label with title', () => {
      render(<DefaultCover {...baseProps} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('aria-label', 'coverOverlay.defaultCover');
    });

    it('applies className prop', () => {
      const { container } = render(
        <DefaultCover {...baseProps} className="custom-class" />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('renders spine strip (first child)', () => {
      const { container } = render(<DefaultCover {...baseProps} />);
      const wrapper = container.firstElementChild;
      const spineStrip = wrapper.children[0];
      expect(spineStrip).toHaveStyle({ backgroundColor: '#4ECDC4' });
    });

    it('renders cover area (middle child) with background color from spineColor fallback', () => {
      const { container } = render(
        <DefaultCover {...baseProps} spineColor={null} />
      );
      const wrapper = container.firstElementChild;
      const coverArea = wrapper.children[1];
      expect(coverArea).toHaveStyle({ backgroundColor: expect.any(String) });
    });

    it('renders edge strip (last child) with darkened color', () => {
      const { container } = render(<DefaultCover {...baseProps} />);
      const wrapper = container.firstElementChild;
      const edgeStrip = wrapper.children[2];
      // #4ECDC4 darkened by 50 → #1C9B92
      expect(edgeStrip).toHaveStyle({ backgroundColor: '#1C9B92' });
    });

    it('uses book default_color when book prop is provided', () => {
      const book = {
        _id: 'test-id-123',
        title: 'Book Title',
        default_color: '#A78BFA',
        authorName: 'Author',
      };
      const { container } = render(<DefaultCover book={book} />);
      const wrapper = container.firstElementChild;
      const coverArea = wrapper.children[1];
      expect(coverArea).toHaveStyle({ backgroundColor: '#A78BFA' });
    });

    it('derives color from book._id when no default_color', () => {
      const book = {
        _id: 'unique-id-456',
        title: 'Book Title',
        authorName: 'Author',
      };
      const { container } = render(<DefaultCover book={book} />);
      const wrapper = container.firstElementChild;
      const coverArea = wrapper.children[1];
      const bgColor = coverArea.style.backgroundColor;
      expect(bgColor).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('renders with empty title', () => {
      render(<DefaultCover {...baseProps} title="" />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders with null title', () => {
      render(<DefaultCover {...baseProps} title={null} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders with undefined title', () => {
      render(<DefaultCover {...baseProps} title={undefined} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders with null spineColor', () => {
      render(<DefaultCover {...baseProps} spineColor={null} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders with undefined spineColor', () => {
      render(<DefaultCover {...baseProps} spineColor={undefined} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('handles long title with line-clamp', () => {
      const longTitle = 'This is a very long title that should be truncated at three lines using the line-clamp-3 utility class to ensure it fits within the cover design';
      render(<DefaultCover {...baseProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
      const titleEl = screen.getByText(longTitle);
      expect(titleEl).toHaveClass('line-clamp-3');
    });

    it('sanitizes script tags from title', () => {
      const specialTitle = 'Title with <script>alert("xss")</script>';
      render(<DefaultCover {...baseProps} title={specialTitle} />);
      // DOMPurify removes script tags — rendered text should not contain <script>
      const titleEl = screen.getByText((content) => content.includes('Title with'));
      expect(titleEl).toBeInTheDocument();
      // No script element in the DOM
      expect(document.querySelector('script')).toBeNull();
    });

    it('handles whitespace in props', () => {
      render(
        <DefaultCover
          title="  My Title  "
          authorName="  My Author  "
          spineColor="  #FF0000  "
        />
      );
      expect(screen.getByText('coverOverlay.authorBy')).toBeInTheDocument();
    });
  });

  describe('text color', () => {
    it('uses getDefaultTextColor to determine text color', () => {
      const { container } = render(<DefaultCover {...baseProps} />);
      const title = container.querySelector('.font-bold');
      expect(title).toHaveStyle({ color: '#1A1A1A' }); // #4ECDC4 is light
    });

    it('uses white text for dark backgrounds', () => {
      const book = {
        _id: 'dark-test',
        title: 'Dark Title',
        default_color: '#1E1B4B',
        authorName: 'Author',
      };
      const { container } = render(<DefaultCover book={book} />);
      const title = container.querySelector('.font-bold');
      expect(title).toHaveStyle({ color: '#FFFFFF' });
    });
  });
});
