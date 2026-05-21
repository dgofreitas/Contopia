// Contopia — CoverPreview Component Tests (STORY-022)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CoverPreview from '../app/cover/CoverPreview';

const galaxyTemplate = {
  id: 'galaxy',
  nameKey: 'cover.templates.galaxy',
  descriptionKey: 'cover.templates.galaxyDesc',
  background: { type: 'gradient', colors: ['#0f0c29', '#302b63', '#24243e'] },
  decoration: { type: 'stars' },
  textColor: '#ffffff',
  accentColor: '#ffd700',
};

const book = {
  _id: 'book-123',
  title: 'My Adventure Story',
  author: { name: 'Julia Author' },
};

describe('CoverPreview', () => {
  describe('with template', () => {
    it('renders the book title', () => {
      render(<CoverPreview book={book} template={galaxyTemplate} />);
      expect(screen.getByText('My Adventure Story')).toBeInTheDocument();
    });

    it('renders the author name', () => {
      render(<CoverPreview book={book} template={galaxyTemplate} />);
      expect(screen.getByText('Julia Author')).toBeInTheDocument();
    });

    it('renders the cover template background div', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const bg = container.querySelector('.cover-template--galaxy');
      expect(bg).toBeInTheDocument();
      expect(bg).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders the spine div', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const spine = container.querySelector('.cover-spine');
      expect(spine).toBeInTheDocument();
      expect(spine).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies textColor from template to title and author', () => {
      render(<CoverPreview book={book} template={galaxyTemplate} />);
      const title = screen.getByText('My Adventure Story');
      expect(title.style.color).toBe('rgb(255, 255, 255)');
      const author = screen.getByText('Julia Author');
      expect(author.style.color).toBe('rgb(255, 255, 255)');
    });

    it('applies accentColor to decorative dividers', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const dividers = container.querySelectorAll('[style*="background-color"]');
      const accentDivider = Array.from(dividers).find(
        (el) => el.style.backgroundColor === 'rgb(255, 215, 0)' || el.style.backgroundColor === '#ffd700'
      );
      expect(accentDivider).toBeTruthy();
    });

    it('has aria-live="polite" and aria-atomic="true" on container', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('without template (fallback)', () => {
    it('renders choose template prompt when no template', () => {
      render(<CoverPreview book={book} template={null} />);
      expect(screen.getByText('preview.chooseTemplate')).toBeInTheDocument();
    });

    it('does not render template background when no template', () => {
      const { container } = render(<CoverPreview book={book} template={null} />);
      expect(container.querySelector('.cover-template--')).toBeNull();
    });

    it('does not render spine when no template', () => {
      const { container } = render(<CoverPreview book={book} template={null} />);
      expect(container.querySelector('.cover-spine')).toBeNull();
    });

    it('renders fallback gray background with dashed border icon', () => {
      const { container } = render(<CoverPreview book={book} template={null} />);
      const fallback = container.querySelector('.border-dashed');
      expect(fallback).toBeInTheDocument();
    });
  });

  describe('without book data', () => {
    it('uses fallback title when book is not provided', () => {
      render(<CoverPreview template={galaxyTemplate} />);
      expect(screen.getByText('preview.title')).toBeInTheDocument();
    });

    it('uses fallback author when book is not provided', () => {
      render(<CoverPreview template={galaxyTemplate} />);
      expect(screen.getByText('preview.author')).toBeInTheDocument();
    });

    it('uses fallback title when book has no title', () => {
      render(<CoverPreview book={{ _id: 'b1' }} template={galaxyTemplate} />);
      expect(screen.getByText('preview.title')).toBeInTheDocument();
    });

    it('uses gray fallback colors when no template', () => {
      const { container } = render(<CoverPreview />);
      const fallbackText = container.querySelector('.text-gray-500');
      expect(fallbackText).toBeInTheDocument();
    });

    it('renders fallback choose template message when no book and no template', () => {
      render(<CoverPreview />);
      expect(screen.getByText('preview.chooseTemplate')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders with empty book title — falls back to preview.title (empty string is falsy)', () => {
      render(<CoverPreview book={{ _id: 'b1', title: '', author: { name: 'Test' } }} template={galaxyTemplate} />);
      // title is '' which is falsy, so fallback to preview.title
      expect(screen.getByText('preview.title')).toBeInTheDocument();
    });

    it('renders with template but no book title field — falls back to preview.title', () => {
      render(<CoverPreview book={{ _id: 'b1', author: { name: 'Me' } }} template={galaxyTemplate} />);
      expect(screen.getByText('preview.title')).toBeInTheDocument();
    });

    it('renders with template but no book author — falls back to preview.author', () => {
      render(<CoverPreview book={{ _id: 'b1', title: 'My Book' }} template={galaxyTemplate} />);
      expect(screen.getByText('preview.author')).toBeInTheDocument();
    });
  });
});
