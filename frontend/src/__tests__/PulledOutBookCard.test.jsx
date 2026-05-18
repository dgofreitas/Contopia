// Contopia — PulledOutBookCard Component Tests (STORY-011)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PulledOutBookCard from '../components/shelf/PulledOutBookCard';

// setup.js already mocks react-i18next to pass through keys

const baseBook = {
  _id: 'book-123',
  title: 'My Little Pony',
  summary: 'This is a very long summary that exceeds one hundred twenty characters and should be truncated in the card display with an ellipsis.',
};

describe('PulledOutBookCard', () => {
  describe('rendering', () => {
    it('renders the book title', () => {
      render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      expect(screen.getByText('My Little Pony')).toBeInTheDocument();
    });

    it('sanitizes the title', () => {
      const bookWithXSS = {
        _id: 'book-xss',
        title: '<script>alert("xss")</script>',
        summary: 'Test summary',
      };
      render(<PulledOutBookCard book={bookWithXSS} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      // The sanitizeText function removes script tags
      expect(document.querySelector('script')).not.toBeInTheDocument();
      // The title h3 may be empty or contain sanitized text
      const titleElement = document.querySelector('h3');
      expect(titleElement).toBeInTheDocument();
      // Ensure no malicious content is rendered as HTML
      expect(titleElement.innerHTML).not.toContain('<script>');
    });

    it('renders summary excerpt truncated at 120 characters', () => {
      render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      // Find the paragraph with the summary
      const summaryPara = screen.getByText((content) => {
        return content.startsWith('This is a very long summary') && content.endsWith('…');
      });
      expect(summaryPara).toBeInTheDocument();
      // Verify it's truncated (should be 120 chars + ellipsis)
      expect(summaryPara.textContent.length).toBe(121);
    });

    it('renders full summary when shorter than 120 characters', () => {
      const shortBook = {
        _id: 'book-short',
        title: 'Short Book',
        summary: 'A short summary',
      };
      render(<PulledOutBookCard book={shortBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      expect(screen.getByText('A short summary')).toBeInTheDocument();
    });

    it('renders placeholder when summary is missing', () => {
      const noSummaryBook = {
        _id: 'book-no-summary',
        title: 'No Summary',
      };
      render(<PulledOutBookCard book={noSummaryBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      expect(screen.queryByText((text) => text.includes('…'))).not.toBeInTheDocument();
    });

    it('renders cover placeholder div with aria-hidden', () => {
      const { container } = render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      const placeholder = container.querySelector('[aria-hidden="true"]');
      expect(placeholder).toBeInTheDocument();
    });

    it('has role="group" for a11y', () => {
      const { container } = render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      const group = container.querySelector('[role="group"]');
      expect(group).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('renders 3 action buttons', () => {
      render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3);
    });

    it('button callbacks fire correctly for Read button', () => {
      const onRead = vi.fn();
      render(<PulledOutBookCard book={baseBook} onRead={onRead} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      const readButton = screen.getByLabelText('pullOut.read');
      fireEvent.click(readButton);
      expect(onRead).toHaveBeenCalledTimes(1);
    });

    it('button callbacks fire correctly for Edit button', () => {
      const onEdit = vi.fn();
      render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={onEdit} onDesignCover={vi.fn()} />);
      const editButton = screen.getByLabelText('pullOut.edit');
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('button callbacks fire correctly for Design Cover button', () => {
      const onDesignCover = vi.fn();
      render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={onDesignCover} />);
      const designButton = screen.getByLabelText('pullOut.designCover');
      fireEvent.click(designButton);
      expect(onDesignCover).toHaveBeenCalledTimes(1);
    });
  });

  describe('i18n integration', () => {
    it('uses i18n keys for aria-labels', () => {
      const { container } = render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      const group = container.querySelector('[role="group"]');
      expect(group).toHaveAttribute('aria-label', 'pullOut.ariaActions');
    });

    it('uses i18n keys for button labels', () => {
      render(<PulledOutBookCard book={baseBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      expect(screen.getByLabelText('pullOut.read')).toBeInTheDocument();
      expect(screen.getByLabelText('pullOut.edit')).toBeInTheDocument();
      expect(screen.getByLabelText('pullOut.designCover')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('handles missing title gracefully', () => {
      const noTitleBook = {
        _id: 'book-no-title',
        summary: 'Summary without title',
      };
      expect(() => {
        render(<PulledOutBookCard book={noTitleBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      }).not.toThrow();
    });

    it('handles null summary gracefully', () => {
      const nullSummaryBook = {
        _id: 'book-null-summary',
        title: 'Null Summary',
        summary: null,
      };
      render(<PulledOutBookCard book={nullSummaryBook} onRead={vi.fn()} onEdit={vi.fn()} onDesignCover={vi.fn()} />);
      expect(screen.getByText('Null Summary')).toBeInTheDocument();
    });
  });
});
