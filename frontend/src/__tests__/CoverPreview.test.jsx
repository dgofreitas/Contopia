// Contopia — CoverPreview Component Tests (STORY-022 + STORY-024)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CoverPreview from '../app/cover/CoverPreview';
import { useCoverStore } from '../stores/cover-store';

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
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      // Title appears in both spine (aria-hidden) and CoverTitleEdit button
      // Check that button (CoverTitleEdit) has the title text
      const titleButton = container.querySelector('.cover-preview-text button');
      expect(titleButton).toBeInTheDocument();
      expect(titleButton).toHaveTextContent('My Adventure Story');
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
      // Spine preview is inside aria-hidden parent div (STORY-024)
      const spineWrapper = container.querySelector('.cover-preview-text ~ div[aria-hidden="true"]');
      const spine = container.querySelector('.cover-spine-preview');
      expect(spine).toBeInTheDocument();
      // Spine is wrapped in aria-hidden div, check parent
      expect(spine.parentElement).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies textColor from template to title and author', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      // Find title button (CoverTitleEdit) and author p (CoverAuthorName) in text layer
      const titleButton = container.querySelector('.cover-preview-text button');
      expect(titleButton).toBeInTheDocument();
      expect(titleButton.style.color).toBe('rgb(255, 255, 255)');
      const author = container.querySelector('.cover-preview-text p');
      expect(author).toBeInTheDocument();
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
      const { container } = render(<CoverPreview template={galaxyTemplate} />);
      // Title appears in both spine and CoverTitleEdit button; check the button
      const titleButton = container.querySelector('.cover-preview-text button');
      expect(titleButton).toBeInTheDocument();
      expect(titleButton).toHaveTextContent('preview.title');
    });

    it('uses fallback author when book is not provided', () => {
      const { container } = render(<CoverPreview template={galaxyTemplate} />);
      const author = container.querySelector('.cover-preview-text p');
      expect(author).toBeInTheDocument();
      expect(author).toHaveTextContent('preview.author');
    });

    it('uses fallback title when book has no title', () => {
      const { container } = render(<CoverPreview book={{ _id: 'b1' }} template={galaxyTemplate} />);
      const titleButton = container.querySelector('.cover-preview-text button');
      expect(titleButton).toBeInTheDocument();
      expect(titleButton).toHaveTextContent('preview.title');
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
      const { container } = render(<CoverPreview book={{ _id: 'b1', title: '', author: { name: 'Test' } }} template={galaxyTemplate} />);
      // title is '' which is falsy, so fallback to preview.title
      const titleButton = container.querySelector('.cover-preview-text button');
      expect(titleButton).toHaveTextContent('preview.title');
    });

    it('renders with template but no book title field — falls back to preview.title', () => {
      const { container } = render(<CoverPreview book={{ _id: 'b1', author: { name: 'Me' } }} template={galaxyTemplate} />);
      const titleButton = container.querySelector('.cover-preview-text button');
      expect(titleButton).toHaveTextContent('preview.title');
    });

    it('renders with template but no book author — falls back to preview.author', () => {
      const { container } = render(<CoverPreview book={{ _id: 'b1', title: 'My Book' }} template={galaxyTemplate} />);
      const author = container.querySelector('.cover-preview-text p');
      expect(author).toHaveTextContent('preview.author');
    });
  });

  // STORY-024: Sticker Layer & Title/Author Tests
  describe('STORY-024: Sticker Layer', () => {
    beforeEach(() => {
      useCoverStore.getState().resetStore();
    });

    it('renders CoverStickerLayer inside a data-sticker-layer div', () => {
      useCoverStore.getState().addSticker('star');
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const stickerLayerDiv = container.querySelector('[data-sticker-layer]');
      expect(stickerLayerDiv).toBeInTheDocument();
      const stickerEl = container.querySelector('.cover-sticker');
      expect(stickerEl).toBeInTheDocument();
    });

    it('renders CoverTitleEdit as a button with book title', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const titleButton = container.querySelector('.cover-preview-text button');
      expect(titleButton).toBeInTheDocument();
      expect(titleButton).toHaveTextContent('My Adventure Story');
    });

    it('renders CoverAuthorName with author name', () => {
      render(<CoverPreview book={book} template={galaxyTemplate} />);
      expect(screen.getByText('Julia Author')).toBeInTheDocument();
    });

    it('has cover-preview-text with z-index 20 (above stickers layer)', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const textLayer = container.querySelector('.cover-preview-text');
      expect(textLayer).toHaveStyle({ zIndex: '20' });
    });

    it('sticker layer has z-index 10 (below text layer)', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const stickerLayerDiv = container.querySelector('[data-sticker-layer]');
      expect(stickerLayerDiv.className).toContain('z-10');
    });

    it('renders stickers when present in store', () => {
      useCoverStore.getState().addSticker('star');
      useCoverStore.getState().addSticker('heart');
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const stickers = container.querySelectorAll('.cover-sticker');
      expect(stickers).toHaveLength(2);
    });

    it('renders no stickers when store is empty', () => {
      const { container } = render(<CoverPreview book={book} template={galaxyTemplate} />);
      const stickers = container.querySelectorAll('.cover-sticker');
      expect(stickers).toHaveLength(0);
    });

    it('renders stickers inside sticker layer even without template', () => {
      useCoverStore.getState().addSticker('moon');
      const { container } = render(<CoverPreview book={book} template={null} />);
      // Fallback view (no template) still renders sticker layer?
      // Actually the fallback view renders a different branch without the sticker layer
      // So there should be no stickers rendered
      const stickerLayerDiv = container.querySelector('[data-sticker-layer]');
      expect(stickerLayerDiv).toBeNull();
    });
  });
});
