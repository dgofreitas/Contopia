// Contopia — PulledOutBookCard Component Tests (STORY-011 + STORY-012)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PulledOutBookCard from '../components/shelf/PulledOutBookCard';

// setup.js already mocks react-i18next to pass through keys

const baseBook = {
  _id: 'book-123',
  title: 'My Little Pony',
  summary: 'This is a very long summary that exceeds one hundred twenty characters and should be truncated in the card display with an ellipsis.',
};

// Helper to render with all required props (STORY-012: onViewCover added; STORY-013: onPlaceBack added)
function renderPulledOutCard(book = baseBook, overrides = {}) {
  const props = {
    onRead: vi.fn(),
    onEdit: vi.fn(),
    onDesignCover: vi.fn(),
    onViewCover: vi.fn(),
    onPlaceBack: vi.fn(),
    book,
    ...overrides,
  };
  return { ...render(<PulledOutBookCard {...props} />), props };
}

describe('PulledOutBookCard', () => {
  describe('rendering', () => {
    it('renders the book title in h3 and inline cover', () => {
      renderPulledOutCard();
      const titles = screen.getAllByText('My Little Pony');
      expect(titles).toHaveLength(2); // h3 header + inline cover span
    });

    it('sanitizes the title', () => {
      const bookWithXSS = {
        _id: 'book-xss',
        title: '<script>alert("xss")</script>',
        summary: 'Test summary',
      };
      renderPulledOutCard(bookWithXSS);
      // The sanitizeText function removes script tags
      expect(document.querySelector('script')).not.toBeInTheDocument();
      // The title h3 may be empty or contain sanitized text
      const titleElement = document.querySelector('h3');
      expect(titleElement).toBeInTheDocument();
      // Ensure no malicious content is rendered as HTML
      expect(titleElement.innerHTML).not.toContain('<script>');
    });

    it('renders summary excerpt truncated at 120 characters', () => {
      renderPulledOutCard();
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
      renderPulledOutCard(shortBook);
      expect(screen.getByText('A short summary')).toBeInTheDocument();
    });

    it('renders placeholder when summary is missing', () => {
      const noSummaryBook = {
        _id: 'book-no-summary',
        title: 'No Summary',
      };
      renderPulledOutCard(noSummaryBook);
      expect(screen.queryByText((text) => text.includes('…'))).not.toBeInTheDocument();
    });

    it('renders cover area as a div with role button and view cover label', () => {
      renderPulledOutCard();
      const coverButtons = screen.getAllByLabelText('coverOverlay.viewCover');
      expect(coverButtons.length).toBeGreaterThanOrEqual(1);
      // Cover area is a div[role="button"], second is an actual button
      expect(coverButtons[0].tagName).toBe('DIV');
      expect(coverButtons[0]).toHaveAttribute('role', 'button');
    });

    it('has role="group" for a11y', () => {
      const { container } = renderPulledOutCard();
      const group = container.querySelector('[role="group"]');
      expect(group).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('renders 6 action buttons (1 cover area + 4 in row + 1 place back)', () => {
      renderPulledOutCard();
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(6);
    });

    it('"View Cover" button in button row fires onViewCover callback', () => {
      const { props } = renderPulledOutCard();
      const viewCoverButtons = screen.getAllByLabelText('coverOverlay.viewCover');
      // There are 2 buttons with this label - the cover area and the button in the row
      // The one in the button row is the second one
      const rowButton = viewCoverButtons[1];
      fireEvent.click(rowButton);
      expect(props.onViewCover).toHaveBeenCalledTimes(1);
    });

    it('Cover area button fires onViewCover callback', () => {
      const { props } = renderPulledOutCard();
      const coverButtons = screen.getAllByLabelText('coverOverlay.viewCover');
      // The cover area button is the first one (h-16)
      const areaButton = coverButtons[0];
      fireEvent.click(areaButton);
      expect(props.onViewCover).toHaveBeenCalledTimes(1);
    });

    it('button callbacks fire correctly for Read button', () => {
      const onRead = vi.fn();
      renderPulledOutCard(undefined, { onRead });
      const readButton = screen.getByLabelText('pullOut.read');
      fireEvent.click(readButton);
      expect(onRead).toHaveBeenCalledTimes(1);
    });

    it('button callbacks fire correctly for Edit button', () => {
      const onEdit = vi.fn();
      renderPulledOutCard(undefined, { onEdit });
      const editButton = screen.getByLabelText('pullOut.edit');
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('button callbacks fire correctly for Design Cover button', () => {
      const onDesignCover = vi.fn();
      renderPulledOutCard(undefined, { onDesignCover });
      const designButton = screen.getByLabelText('pullOut.designCover');
      fireEvent.click(designButton);
      expect(onDesignCover).toHaveBeenCalledTimes(1);
    });

    it('"Place Back" button renders with aria-label', () => {
      renderPulledOutCard();
      const placeBackBtn = screen.getByLabelText('placeBack');
      expect(placeBackBtn).toBeInTheDocument();
    });

    it('"Place Back" button callback fires on click', () => {
      const onPlaceBack = vi.fn();
      renderPulledOutCard(undefined, { onPlaceBack });
      const placeBackBtn = screen.getByLabelText('placeBack');
      fireEvent.click(placeBackBtn);
      expect(onPlaceBack).toHaveBeenCalledTimes(1);
    });

    it('"Place Back" button has correct styling classes', () => {
      renderPulledOutCard();
      const placeBackBtn = screen.getByLabelText('placeBack');
      expect(placeBackBtn).toHaveClass('bg-amber-100');
      expect(placeBackBtn).toHaveClass('text-amber-800');
    });
  });

  describe('i18n integration', () => {
    it('uses i18n keys for aria-labels', () => {
      const { container } = renderPulledOutCard();
      const group = container.querySelector('[role="group"]');
      expect(group).toHaveAttribute('aria-label', 'pullOut.ariaActions');
    });

    it('uses i18n keys for button labels', () => {
      renderPulledOutCard();
      expect(screen.getByLabelText('pullOut.read')).toBeInTheDocument();
      expect(screen.getByLabelText('pullOut.edit')).toBeInTheDocument();
      expect(screen.getByLabelText('pullOut.designCover')).toBeInTheDocument();
      // There are 2 "View Cover" buttons
      const viewCoverBtns = screen.getAllByLabelText('coverOverlay.viewCover');
      expect(viewCoverBtns).toHaveLength(2);
    });
  });

  describe('long-press handler (STORY-021)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fires onEdit after 300ms touch hold (onTouchStart)', () => {
      const onEdit = vi.fn();
      renderPulledOutCard(undefined, { onEdit });

      const group = document.querySelector('[role="group"]');
      expect(group).toBeInTheDocument();

      // Touch handlers are on the [role="group"] element itself
      fireEvent.touchStart(group);

      // Advance time by 300ms — timer fires
      vi.advanceTimersByTime(300);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('does not fire onEdit if touch is released before 300ms (onTouchEnd clears timer)', () => {
      const onEdit = vi.fn();
      renderPulledOutCard(undefined, { onEdit });

      const group = document.querySelector('[role="group"]');

      fireEvent.touchStart(group);
      vi.advanceTimersByTime(200); // less than 300ms
      fireEvent.touchEnd(group);
      vi.advanceTimersByTime(200); // would fire if not cleared

      expect(onEdit).not.toHaveBeenCalled();
    });

    it('does not fire onEdit if touch moves before 300ms (onTouchMove clears timer)', () => {
      const onEdit = vi.fn();
      renderPulledOutCard(undefined, { onEdit });

      const group = document.querySelector('[role="group"]');

      fireEvent.touchStart(group);
      vi.advanceTimersByTime(100);
      fireEvent.touchMove(group);
      vi.advanceTimersByTime(300);

      expect(onEdit).not.toHaveBeenCalled();
    });

    it('container has touchAction manipulation style', () => {
      renderPulledOutCard();

      const group = document.querySelector('[role="group"]');
      expect(group.style.touchAction).toBe('manipulation');
    });

    it('handles multiple touch start events correctly (successive presses)', () => {
      const onEdit = vi.fn();
      renderPulledOutCard(undefined, { onEdit });

      const group = document.querySelector('[role="group"]');

      // First press — released before 300ms
      fireEvent.touchStart(group);
      fireEvent.touchEnd(group);

      // Second press — held for 300ms
      fireEvent.touchStart(group);
      vi.advanceTimersByTime(300);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('handles missing title gracefully', () => {
      const noTitleBook = {
        _id: 'book-no-title',
        summary: 'Summary without title',
      };
      expect(() => {
        renderPulledOutCard(noTitleBook);
      }).not.toThrow();
    });

    it('handles null summary gracefully', () => {
      const nullSummaryBook = {
        _id: 'book-null-summary',
        title: 'Null Summary',
        summary: null,
      };
      renderPulledOutCard(nullSummaryBook);
      const titles = screen.getAllByText('Null Summary');
      expect(titles.length).toBe(2); // h3 + inline cover span
    });
  });
});
