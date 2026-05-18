// Contopia — DefaultCover Component Tests (STORY-012)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DefaultCover from '../components/shelf/DefaultCover';

const baseProps = {
  title: 'My Little Pony',
  authorName: 'Jane Author',
  spineColor: '#4ECDC4',
  className: 'w-full h-full',
};

describe('DefaultCover', () => {
  describe('rendering', () => {
    it('renders title text', () => {
      render(<DefaultCover {...baseProps} />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
    });

    it('renders author name with interpolation (coverOverlay.authorBy)', () => {
      render(<DefaultCover {...baseProps} />);
      expect(screen.getByText('coverOverlay.authorBy')).toBeInTheDocument();
    });

    it('does not render author when authorName is not provided', () => {
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
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('has aria-label', () => {
      render(<DefaultCover {...baseProps} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('aria-label', 'coverOverlay.defaultCover');
    });

    it('has gradient background with spineColor', () => {
      const { container } = render(<DefaultCover {...baseProps} />);
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveStyle({
        background: 'linear-gradient(135deg, #4ECDC4 0%, #4ECDC499 100%)',
      });
    });

    it('applies className prop', () => {
      const { container } = render(
        <DefaultCover {...baseProps} className="custom-class" />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass('custom-class', 'w-full', 'h-full', 'rounded-lg', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-4');
    });

    it('renders without className prop', () => {
      const { container } = render(
        <DefaultCover title="Test" authorName="Author" spineColor="#FF0000" />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass('rounded-lg', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-4');
    });
  });

  describe('text styling', () => {
    it('uses text-gray-800 for title (contrast)', () => {
      const { container } = render(<DefaultCover {...baseProps} />);
      const title = container.querySelector('.text-gray-800');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('My Little Pony');
    });

    it('uses text-gray-600 for author (contrast)', () => {
      const { container } = render(<DefaultCover {...baseProps} />);
      const author = container.querySelector('.text-gray-600');
      expect(author).toBeInTheDocument();
    });

    it('title has correct font classes', () => {
      const { container } = render(<DefaultCover {...baseProps} />);
      const title = container.querySelector('.text-gray-800');
      expect(title).toHaveClass('font-bold', 'text-lg', 'text-center', 'leading-tight', 'line-clamp-3');
    });

    it('author has correct font classes', () => {
      const { container } = render(<DefaultCover {...baseProps} />);
      const author = container.querySelector('.text-gray-600');
      expect(author).toHaveClass('text-sm', 'mt-2');
    });
  });

  describe('edge cases', () => {
    it('renders with empty title', () => {
      render(<DefaultCover {...baseProps} title="" />);
      const wrapper = screen.getByRole('img');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders with null title', () => {
      render(<DefaultCover {...baseProps} title={null} />);
      const wrapper = screen.getByRole('img');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders with undefined title', () => {
      render(<DefaultCover {...baseProps} title={undefined} />);
      const wrapper = screen.getByRole('img');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders with null spineColor', () => {
      const { container } = render(
        <DefaultCover
          {...baseProps}
          spineColor={null}
        />
      );
      const wrapper = container.firstElementChild;
      // Should render without error (linear-gradient handles null)
      expect(wrapper).toBeInTheDocument();
    });

    it('renders with undefined spineColor', () => {
      const { container } = render(
        <DefaultCover
          {...baseProps}
          spineColor={undefined}
        />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).toBeInTheDocument();
    });

    it('handles long title with line-clamp', () => {
      const longTitle = 'This is a very long title that should be truncated at three lines using the line-clamp-3 utility class to ensure it fits within the cover design';
      render(
        <DefaultCover
          {...baseProps}
          title={longTitle}
        />
      );
      expect(screen.getByText(longTitle)).toBeInTheDocument();
      const title = screen.getByText(longTitle);
      expect(title).toHaveClass('line-clamp-3');
    });

    it('handles special characters in title', () => {
      const specialTitle = 'Title with <script> & "quotes"';
      render(
        <DefaultCover
          {...baseProps}
          title={specialTitle}
        />
      );
      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('handles special characters in author name', () => {
      const specialAuthor = 'Author & Co. "Special"';
      render(
        <DefaultCover
          {...baseProps}
          authorName={specialAuthor}
        />
      );
      expect(screen.getByText('coverOverlay.authorBy')).toBeInTheDocument();
    });

    it('handles whitespace in props', () => {
      render(
        <DefaultCover
          title="  My Title  "
          authorName="  My Author  "
          spineColor="  #FF0000  "
        />
      );
      // The text should be rendered as-is (use function matcher to avoid normalization)
      const title = screen.getByText((content, element) => {
        return element.textContent === '  My Title  ';
      });
      expect(title).toBeInTheDocument();
      expect(screen.getByText('coverOverlay.authorBy')).toBeInTheDocument();
    });
  });

  describe('gradient background variations', () => {
    it('renders correct gradient for red color', () => {
      const { container } = render(
        <DefaultCover
          {...baseProps}
          spineColor="#FF0000"
        />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveStyle({
        background: 'linear-gradient(135deg, #FF0000 0%, #FF000099 100%)',
      });
    });

    it('renders correct gradient for blue color', () => {
      const { container } = render(
        <DefaultCover
          {...baseProps}
          spineColor="#0000FF"
        />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveStyle({
        background: 'linear-gradient(135deg, #0000FF 0%, #0000FF99 100%)',
      });
    });

    it('renders correct gradient for hex color with alpha', () => {
      const { container } = render(
        <DefaultCover
          {...baseProps}
          spineColor="rgba(255, 0, 0, 0.5)"
        />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper).toBeInTheDocument();
    });
  });
});
